import { supabase } from "./supabase";
import {
  useProtocolStore,
  type PlanDay,
  type ExerciseLog,
} from "../store/useProtocolStore";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** The signed-in user, or an error if nobody is signed in. */
async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return data.user;
}

export async function savePlanRemote(plan: PlanDay[]) {
  const user = await requireUser();
  const { trainingDays, goal, body } = useProtocolStore.getState();

  const validDays =
    trainingDays.length >= 1 &&
    trainingDays.length <= 7 &&
    new Set(trainingDays).size === trainingDays.length &&
    trainingDays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  if (!validDays) {
    throw new Error("Select between 1 and 7 valid training days.");
  }

  if (!goal) {
    throw new Error("Select your fitness goal.");
  }

  if (
    body.currentWeight == null ||
    body.currentWeight <= 0 ||
    body.targetWeight == null ||
    body.targetWeight <= 0 ||
    !body.experienceLevel
  ) {
    throw new Error("Complete your body information.");
  }

  if (
    plan.length !== trainingDays.length ||
    new Set(plan.map((day) => day.dayIndex)).size !== plan.length ||
    plan.some(
      (day) =>
        !trainingDays.includes(day.dayIndex) ||
        !day.name.trim() ||
        day.exerciseIds.length === 0,
    )
  ) {
    throw new Error("Configure exercises for every training day.");
  }

  const profile = {
    user_id: user.id,
    training_days: trainingDays.map((day) => WEEKDAYS[day]),
    goal,
    current_weight: body.currentWeight,
    target_weight: body.targetWeight,
    experience_level: body.experienceLevel,
  };

  // Save the plan first. The profile is created LAST because
  // profile existence means onboarding is complete.
  const keep = plan.map((day) => day.dayIndex);

  const dropQuery = supabase.from("plan_days").delete().eq("user_id", user.id);

  const { error: deleteError } = keep.length
    ? await dropQuery.not("day_index", "in", `(${keep.join(",")})`)
    : await dropQuery;

  if (deleteError) throw deleteError;

  const { error: planError } = await supabase.from("plan_days").upsert(
    plan.map((day) => ({
      user_id: user.id,
      day_index: day.dayIndex,
      name: day.name,
      exercise_ids: day.exerciseIds,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,day_index" },
  );

  if (planError) throw planError;

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "user_id" });

  if (profileError) throw profileError;
}

/** Save one exercise's logged sets (call from saveExerciseLog's caller). */
export async function saveExerciseLogRemote(
  date: string,
  exerciseId: string,
  log: ExerciseLog,
) {
  const user = await requireUser();
  const { error } = await supabase.from("workout_logs").upsert({
    user_id: user.id,
    log_date: date,
    exercise_id: exerciseId,
    sets: log.sets,
    kcal: log.kcal,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Load everything into the store, e.g. on a new device. */
export async function hydrateFromSupabase() {
  const user = await requireUser();
  const [profileRes, daysRes, logsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("plan_days")
      .select("*")
      .eq("user_id", user.id)
      .order("day_index"),
    supabase.from("workout_logs").select("*").eq("user_id", user.id),
  ]);

  // Don't overwrite local data with nothing if a request failed
  if (profileRes.error) throw profileRes.error;
  if (daysRes.error) throw daysRes.error;
  if (logsRes.error) throw logsRes.error;

  const profile = profileRes.data;
  const days = daysRes.data;
  const logs = logsRes.data;

  const s = useProtocolStore.getState();
  if (profile) {
    const trainingDays = (profile.training_days ?? []).map((day: string) =>
      WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]),
    );

    if (trainingDays.some((day: number) => day < 0)) {
      throw new Error("Invalid training days received from Supabase.");
    }

    s.saveSchedule(trainingDays);
    if (profile.goal) s.saveGoal(profile.goal);
    s.saveBody({
      currentWeight: profile.current_weight,
      targetWeight: profile.target_weight,
      experienceLevel: profile.experience_level,
    });
  }
  if (days?.length) {
    s.savePlan(
      days.map((d) => ({
        dayIndex: d.day_index,
        name: d.name,
        exerciseIds: d.exercise_ids,
      })),
    );
  }
  logs?.forEach((l) =>
    s.saveExerciseLog(l.log_date, l.exercise_id, {
      sets: l.sets,
      kcal: l.kcal,
    }),
  );
}

const pendingLogSaves = new Map<string, Promise<void>>();

export function queueExerciseLogRemote(
  date: string,
  exerciseId: string,
  log: ExerciseLog,
): Promise<void> {
  const key = `${date}:${exerciseId}`;
  const previous = pendingLogSaves.get(key) ?? Promise.resolve();

  const next = previous
    .catch(() => undefined)
    .then(() => saveExerciseLogRemote(date, exerciseId, log));

  pendingLogSaves.set(key, next);

  void next
    .finally(() => {
      if (pendingLogSaves.get(key) === next) {
        pendingLogSaves.delete(key);
      }
    })
    .catch(() => undefined);

  return next;
}
