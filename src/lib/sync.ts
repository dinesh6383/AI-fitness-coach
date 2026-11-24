import { create } from "zustand";
import { persist } from "zustand/middleware";
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

async function saveExerciseLogRemote(
  userId: string,
  date: string,
  exerciseId: string,
  log: ExerciseLog,
) {
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || data.session?.user.id !== userId) {
    throw new Error("Workout sync requires the original signed-in account.");
  }
  const { error } = await supabase.from("workout_logs").upsert({
    user_id: userId,
    log_date: date,
    exercise_id: exerciseId,
    sets: log.sets,
    kcal: log.kcal,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Load everything into the store, e.g. on a new device. */
export async function hydrateFromSupabase(
  userId: string,
  isActive: () => boolean,
) {
  const user = await requireUser();
  if (!isActive()) return;
  if (user.id !== userId) throw new Error("Signed-in account changed while loading.");

  const store = useProtocolStore.getState();
  const pending = useWorkoutSyncStore.getState().pending[userId] ?? {};
  for (const { date, exerciseId, log } of Object.values(pending)) {
    store.saveExerciseLog(date, exerciseId, log);
  }
  const logsAtStart = useProtocolStore.getState().workoutLog;
  const [profileRes, daysRes, logsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("plan_days")
      .select("*")
      .eq("user_id", user.id)
      .order("day_index"),
    supabase.from("workout_logs").select("*").eq("user_id", user.id),
  ]);

  if (!isActive()) return;

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
  const latestPending = useWorkoutSyncStore.getState().pending[userId] ?? {};
  for (const { log_date: date, exercise_id: exerciseId, sets, kcal } of logs ?? []) {
    const key = `${date}:${exerciseId}`;
    if (
      pending[key] ||
      latestPending[key] ||
      s.workoutLog[date]?.[exerciseId] !== logsAtStart[date]?.[exerciseId]
    ) {
      continue;
    }
    s.saveExerciseLog(date, exerciseId, { sets, kcal });
  }
}

type PendingLog = { date: string; exerciseId: string; log: ExerciseLog };
type WorkoutSyncState = {
  pending: Record<string, Record<string, PendingLog>>;
};

export const useWorkoutSyncStore = create<WorkoutSyncState>()(
  persist(() => ({ pending: {} }), { name: "workout-log-sync" }),
);

const pendingLogSaves = new Map<
  string,
  { entry: PendingLog; promise: Promise<void> }
>();

function syncExerciseLog(userId: string, key: string, entry: PendingLog) {
  const requestKey = `${userId}:${key}`;
  const previous = pendingLogSaves.get(requestKey);
  if (previous?.entry === entry) return previous.promise;

  const promise = (previous?.promise ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      if (useWorkoutSyncStore.getState().pending[userId]?.[key] !== entry) return;
      await saveExerciseLogRemote(userId, entry.date, entry.exerciseId, entry.log);

      useWorkoutSyncStore.setState(({ pending }) => {
        const userLogs = pending[userId];
        if (userLogs?.[key] !== entry) return { pending };
        const remaining = { ...userLogs };
        delete remaining[key];
        return { pending: { ...pending, [userId]: remaining } };
      });
    })
    .finally(() => {
      if (pendingLogSaves.get(requestKey)?.promise === promise) {
        pendingLogSaves.delete(requestKey);
      }
    });

  pendingLogSaves.set(requestKey, { entry, promise });
  return promise;
}

export function queueExerciseLogRemote(
  userId: string,
  date: string,
  exerciseId: string,
  log: ExerciseLog,
) {
  const key = `${date}:${exerciseId}`;
  const entry = { date, exerciseId, log };
  useWorkoutSyncStore.setState(({ pending }) => ({
    pending: {
      ...pending,
      [userId]: { ...pending[userId], [key]: entry },
    },
  }));
  return syncExerciseLog(userId, key, entry);
}

export async function retryWorkoutSync(userId: string) {
  const pending = useWorkoutSyncStore.getState().pending[userId] ?? {};
  await Promise.allSettled(
    Object.entries(pending).map(([key, entry]) => syncExerciseLog(userId, key, entry)),
  );
}
