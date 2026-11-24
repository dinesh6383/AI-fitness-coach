import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AiCoachRow from "../components/AiCoachRow";
import SessionCard, { type SessionItem } from "../components/SessionCard";
import TelemetryCard from "../components/TelemetryCard";
import WeightLogCard from "../components/WeightLogCard";
import WeightLogModal from "../components/WeightLogModal";

import { usePlannedBurn } from "../hooks/usePlannedBurn";
import { EMPTY_LOGS, burnedKcal } from "../lib/burn";
import { getExercise } from "../lib/exercises";
import { DAY_FULL } from "../lib/plantemplates";
import {
  GOAL_FOCUS,
  buildTelemetry,
  dateKey,
  getPrescription,
  todayIndex,
} from "../lib/Today";
import { evaluateExercise } from "../lib/workoutPerformance";
import { useProtocolStore } from "../store/useProtocolStore";
import { supabase } from "../lib/supabase";

type WeightState = {
  status: "checking" | "logged" | "not_logged";
  today: number | null;
  previous: number | null;
  weekAgo: number | null;
};

export default function TodayPage() {
  const navigate = useNavigate();

  const goal = useProtocolStore((s) => s.goal) ?? "gain_weight_build_muscle";

  const body = useProtocolStore((s) => s.body);
  const plan = useProtocolStore((s) => s.plan);

  // Subscribe to today's workout logs so the session card
  // updates whenever a set is logged or undone.
  const now = new Date();
  const currentDate = dateKey(now);

  const logs = useProtocolStore((s) => s.workoutLog[currentDate]) ?? EMPTY_LOGS;
  const workoutSession = useProtocolStore(
    (s) => s.workoutSessions?.[currentDate],
  );
  const [clockNow, setClockNow] = useState(() => Date.now());
  useEffect(() => {
    if (!workoutSession || workoutSession.endedAt !== null) return;
    const update = () => setClockNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [workoutSession]);
  const elapsedMinutes = workoutSession
    ? Math.max(
        0,
        Math.round(
          ((workoutSession.endedAt ?? clockNow) - workoutSession.startedAt) /
            60000,
        ),
      )
    : 0;

  const [weightModalOpen, setWeightModalOpen] = useState(false);

  const [weights, setWeights] = useState<WeightState>({
    status: "checking",
    today: null,
    previous: null,
    weekAgo: null,
  });

  const today = todayIndex(now);

  const todayPlan = plan.find((day) => day.dayIndex === today);

  const telemetry = buildTelemetry(body, goal, now);

  // Load today's weight, the most recent earlier weight,
  // and the weight from exactly seven days ago.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let next: WeightState = {
        status: "not_logged",
        today: null,
        previous: null,
        weekAgo: null,
      };

      try {
        const { data: sessionData } = await supabase.auth.getSession();

        const userId = sessionData.session?.user.id;

        if (userId) {
          const startToday = new Date();
          startToday.setHours(0, 0, 0, 0);

          const startWeekAgo = new Date(startToday);
          startWeekAgo.setDate(startWeekAgo.getDate() - 7);

          const startDayAfterWeekAgo = new Date(startWeekAgo);
          startDayAfterWeekAgo.setDate(startDayAfterWeekAgo.getDate() + 1);

          const [recentRes, previousRes] = await Promise.all([
            supabase
              .from("weights")
              .select("weight, logged_at")
              .eq("user_id", userId)
              .gte("logged_at", startWeekAgo.toISOString())
              .order("logged_at", {
                ascending: false,
              }),

            supabase
              .from("weights")
              .select("weight, logged_at")
              .eq("user_id", userId)
              .lt("logged_at", startToday.toISOString())
              .order("logged_at", {
                ascending: false,
              })
              .limit(1),
          ]);

          if (!recentRes.error && !previousRes.error) {
            const recent = recentRes.data ?? [];

            const todayRow = recent.find(
              (row) => new Date(row.logged_at) >= startToday,
            );

            const weekAgoRow = recent.find((row) => {
              const timestamp = new Date(row.logged_at);

              return (
                timestamp >= startWeekAgo && timestamp < startDayAfterWeekAgo
              );
            });

            const previousRow = previousRes.data?.[0];

            next = {
              status: todayRow ? "logged" : "not_logged",

              today: todayRow ? Number(todayRow.weight) : null,

              previous: previousRow ? Number(previousRow.weight) : null,

              weekAgo: weekAgoRow ? Number(weekAgoRow.weight) : null,
            };
          }
        }
      } catch {
        // Preserve the existing fallback behavior.
      }

      if (!cancelled) {
        setWeights(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Today's weight -> previous weight -> stored weight.
  const effectiveWeight = weights.today ?? weights.previous ?? telemetry.weight;

  const weekDelta =
    weights.today !== null && weights.weekAgo !== null
      ? weights.today - weights.weekAgo
      : 0;

  // Previous calendar week: Monday 00:00 through the following Monday 00:00.
  // Use local calendar dates, matching the keys used by workoutLog.
  const workoutHistory = useProtocolStore((state) => state.workoutLog);
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setHours(0, 0, 0, 0);
  startOfThisWeek.setDate(
    startOfThisWeek.getDate() - todayIndex(startOfThisWeek),
  );
  const startOfPreviousWeek = new Date(startOfThisWeek);
  startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);
  const previousWeekStart = dateKey(startOfPreviousWeek);
  const thisWeekStart = dateKey(startOfThisWeek);

  const maxCompletedWeight = (exerciseId: string, dayLogs: typeof logs) =>
    Math.max(
      0,
      ...(dayLogs[exerciseId]?.sets ?? [])
        .filter(
          (set) =>
            set.done &&
            typeof set.weight === "number" &&
            Number.isFinite(set.weight),
        )
        .map((set) => set.weight as number),
    );

  const previousWeekMaxFor = (exerciseId: string) =>
    Math.max(
      0,
      ...Object.entries(workoutHistory)
        .filter(([day]) => day >= previousWeekStart && day < thisWeekStart)
        .map(([, dayLogs]) => maxCompletedWeight(exerciseId, dayLogs)),
    );

  // Build today's exercises and attach live performance.
  const items: SessionItem[] = (todayPlan?.exerciseIds ?? []).flatMap((id) => {
    const exercise = getExercise(id);

    if (!exercise) {
      return [];
    }

    const prescription = getPrescription(exercise, effectiveWeight);

    const evaluation = evaluateExercise(
      logs[exercise.id],
      effectiveWeight,
      prescription.sets,
    );

    return [
      {
        exercise,
        prescription,
        completedSets: evaluation.completedSets,
        performance: evaluation.performance,
        log: logs[exercise.id],
        previousWeekMax: previousWeekMaxFor(exercise.id),
        todayMax: maxCompletedWeight(exercise.id, logs),
        bodyWeight: effectiveWeight,
      },
    ];
  });

  // Calories burned from today's completed exercises.
  const burned = burnedKcal(
    logs,
    items.map((item) => item.exercise.id),
  );

  // Existing planned calorie estimation hook.
  const planned = usePlannedBurn(items, effectiveWeight);

  let emptyText = "Finish setup to get your first session.";

  if (plan.length > 0) {
    if (todayPlan) {
      emptyText = "No exercises planned for today.";
    } else {
      const next = plan.find((day) => day.dayIndex > today) ?? plan[0];

      emptyText =
        `Rest day. Next session: ` +
        `${DAY_FULL[next.dayIndex]} • ${next.name}`;
    }
  }

  const subtitle = todayPlan
    ? [todayPlan.name, GOAL_FOCUS[goal]]
    : [plan.length > 0 ? "Rest Day" : "No plan yet", "Recovery"];

  const handleLogWeight = async (weightKg: number) => {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    const userId = sessionData.session?.user.id;

    if (sessionError || !userId) {
      throw new Error("Not signed in");
    }

    const { error } = await supabase.from("weights").insert({
      user_id: userId,
      weight: weightKg,
      logged_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    setWeights((previous) => ({
      ...previous,
      status: "logged",
      today: weightKg,
    }));

    setWeightModalOpen(false);
  };

  return (
    <main className="space-y-4 px-3 pt-6">
      {/* Page header */}
      <header>
        <h1 className="bg-linear-to-b from-white to-zinc-400 bg-clip-text text-5xl font-extrabold uppercase tracking-tight text-transparent">
          {DAY_FULL[today]}
        </h1>

        <p className="mt-1 text-sm font-semibold">
          <span className="text-brand-soft">{subtitle[0]}</span>

          <span className="text-zinc-500">{" • "}</span>

          <span className="text-mint/80">{subtitle[1]}</span>
        </p>
      </header>

      {/* Daily weight logging */}
      {weights.status === "not_logged" && (
        <WeightLogCard
          shaking={!weightModalOpen}
          onLog={() => setWeightModalOpen(true)}
        />
      )}

      {/* Existing telemetry */}
      <TelemetryCard
        data={{
          ...telemetry,
          weekDelta,
        }}
        morningWeight={weights.today}
        burn={{
          burned,
          planned: planned.kcal,
          status: planned.status,
          onRetry: planned.retry,
        }}
      />

      {/* Session with live performance and status */}
      <SessionCard
        elapsedMinutes={elapsedMinutes}
        items={items}
        emptyText={emptyText}
        editLabel={plan.length > 0 ? "Edit Plan" : "Build Your Plan"}
        onStart={(exerciseId) =>
          navigate(`/workout?exercise=${encodeURIComponent(exerciseId)}`)
        }
        onEdit={() =>
          navigate(plan.length > 0 ? "/builder/split" : "/builder/schedule")
        }
      />

      <AiCoachRow />

      {weightModalOpen && (
        <WeightLogModal
          onClose={() => setWeightModalOpen(false)}
          onSubmit={handleLogWeight}
        />
      )}
    </main>
  );
}
