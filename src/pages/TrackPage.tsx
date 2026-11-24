import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";

import { getExercise } from "../lib/exercises";
import { dateKey, getPrescription, todayIndex } from "../lib/Today";
import { useProtocolStore } from "../store/useProtocolStore";

import type {
  ExerciseLog,
  LoggedSet,
  PlanDay,
  WorkoutSession,
} from "../store/useProtocolStore";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const RPE_MIN = 1;
const RPE_MAX = 15;

type DayStatus = "completed" | "in_progress" | "not_started" | "rest";

type ExerciseHistory = {
  id: string;
  name: string;
  prescribedSets: number;
  sets: LoggedSet[];
};

type SessionStats = {
  minutes: number;
  sets: number;
  volume: number;
  avgRpe: number;
};

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() - todayIndex(result));
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

function formatWeight(weight: number): string {
  return `${weight.toFixed(1)} kg`;
}

function formatVolume(volume: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
  }).format(volume);
}

function formatRpe(rpe: number): string {
  return rpe.toFixed(1);
}

function getRpeColor(rpe: number): string {
  if (rpe <= 7.5) return "text-mint";
  if (rpe <= 9) return "text-amber-400";
  return "text-red-400";
}

function getSessionMinutes(
  session: WorkoutSession | undefined,
  now: number,
): number {
  if (!session) return 0;

  const end = session.endedAt ?? now;

  return Math.max(0, Math.round((end - session.startedAt) / 60000));
}

function buildExerciseHistory(
  dayPlan: PlanDay | undefined,
  dayLogs: Record<string, ExerciseLog>,
  bodyWeight: number,
): ExerciseHistory[] {
  if (!dayPlan) return [];

  return dayPlan.exerciseIds.flatMap((exerciseId) => {
    const exercise = getExercise(exerciseId);

    if (!exercise) return [];

    const prescription = getPrescription(exercise, bodyWeight);

    const log = dayLogs[exerciseId];

    return [
      {
        id: exerciseId,
        name: exercise.name,
        prescribedSets: prescription.sets,
        sets: log?.sets ?? [],
      },
    ];
  });
}

function getDayStatus(
  dayPlan: PlanDay | undefined,
  exercises: ExerciseHistory[],
): DayStatus {
  if (!dayPlan || dayPlan.exerciseIds.length === 0) {
    return "rest";
  }

  // Missing exercise definitions must not falsely
  // mark a workout as completed.
  if (exercises.length !== dayPlan.exerciseIds.length) {
    return "not_started";
  }

  const allCompleted = exercises.every((exercise) => {
    if (exercise.prescribedSets <= 0) return false;

    const completedCount = exercise.sets.filter((set) => set.done).length;

    return completedCount >= exercise.prescribedSets;
  });

  if (allCompleted) return "completed";

  const anyCompleted = exercises.some((exercise) =>
    exercise.sets.some((set) => set.done),
  );

  return anyCompleted ? "in_progress" : "not_started";
}

function calculateSessionStats(
  exercises: ExerciseHistory[],
  bodyWeight: number,
  session: WorkoutSession | undefined,
  now: number,
): SessionStats {
  const completedSets = exercises.flatMap((exercise) =>
    exercise.sets.filter((set) => set.done),
  );

  const volume = completedSets.reduce((total, set) => {
    const weight = set.weight ?? bodyWeight;

    if (
      !Number.isFinite(weight) ||
      weight < 0 ||
      !Number.isFinite(set.reps) ||
      set.reps <= 0
    ) {
      return total;
    }

    return total + weight * set.reps;
  }, 0);

  const validRpes = completedSets
    .map((set) => set.rpe)
    .filter(
      (rpe): rpe is number =>
        typeof rpe === "number" &&
        Number.isFinite(rpe) &&
        rpe >= RPE_MIN &&
        rpe <= RPE_MAX,
    );

  const avgRpe =
    validRpes.length > 0
      ? validRpes.reduce((total, rpe) => total + rpe, 0) / validRpes.length
      : 0;

  return {
    minutes: getSessionMinutes(session, now),
    sets: completedSets.length,
    volume,
    avgRpe,
  };
}

function WeekCalendar({
  weekStart,
  selectedDate,
  today,
  onSelectDate,
  onPreviousWeek,
  onNextWeek,
  getStatus,
}: {
  weekStart: Date;
  selectedDate: Date;
  today: Date;
  onSelectDate: (date: Date) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  getStatus: (date: Date) => DayStatus;
}) {
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  const canGoNext = dateKey(addDays(weekStart, 7)) <= dateKey(today);

  const monthLabel = weekStart.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <Dumbbell size={24} className="text-[#88F9C0]" />
        <h1 className="text-3xl font-extrabold">TRACKS</h1>
      </div>
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPreviousWeek}
            aria-label="Previous week"
            className="flex size-8 items-center justify-center rounded-lg bg-surface text-zinc-300 transition hover:text-white"
          >
            <ChevronLeft size={17} />
          </button>

          <span className="min-w-19 text-center text-[10px] font-semibold text-zinc-400">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={onNextWeek}
            disabled={!canGoNext}
            aria-label="Next week"
            className="flex size-8 items-center justify-center rounded-lg bg-surface text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date, index) => {
          const selected = isSameDay(date, selectedDate);
          const future = dateKey(date) > dateKey(today);
          const status = getStatus(date);

          const completed = status === "completed";
          const inProgress = status === "in_progress";

          return (
            <button
              key={dateKey(date)}
              type="button"
              disabled={future}
              onClick={() => onSelectDate(date)}
              aria-label={date.toDateString()}
              aria-pressed={selected}
              className={[
                "flex min-w-0 flex-col items-center rounded-xl px-0.5 py-2",
                "transition-colors focus-visible:outline-2 focus-visible:outline-mint",
                selected
                  ? "bg-brand text-white shadow-lg shadow-brand/25"
                  : "bg-surface text-zinc-200",
                future ? "cursor-not-allowed opacity-35" : "cursor-pointer",
              ].join(" ")}
            >
              <span className="text-[8px] font-bold uppercase text-zinc-300">
                {DAY_LABELS[index]}
              </span>

              <span className="mt-1 text-[13px] font-extrabold">
                {date.getDate()}
              </span>

              <span
                className={[
                  "mt-1 flex size-4 items-center justify-center rounded-full",
                  completed
                    ? selected
                      ? "bg-[#01010D] text-mint"
                      : "bg-mint/15 text-mint"
                    : "bg-transparent",
                ].join(" ")}
              >
                {completed ? (
                  <Check size={11} strokeWidth={3} />
                ) : (
                  <span
                    className={[
                      "size-1.5 rounded-full",
                      inProgress
                        ? "bg-brand-soft"
                        : selected
                          ? "bg-white/50"
                          : "bg-zinc-700",
                    ].join(" ")}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SessionSummary({ stats }: { stats: SessionStats }) {
  const metrics = [
    {
      label: "MIN",
      value: stats.minutes.toString(),
    },
    {
      label: "SETS",
      value: stats.sets.toString(),
    },
    {
      label: "VOLUME",
      value: formatVolume(stats.volume),
    },
    {
      label: "AVG RPE",
      value: formatRpe(stats.avgRpe),
    },
  ];

  return (
    <section
      aria-label="Selected day workout statistics"
      className="grid grid-cols-4 gap-1 rounded-xl bg-surface px-3 py-3.5"
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0">
          <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">
            {metric.label}
          </p>

          <p className="mt-1.5 truncate text-[clamp(13px,4.4vw,20px)] font-extrabold leading-none text-brand-soft">
            {metric.value}
          </p>
        </div>
      ))}
    </section>
  );
}

function ExerciseHistoryCard({ exercise }: { exercise: ExerciseHistory }) {
  const completedCount = exercise.sets.filter((set) => set.done).length;

  // Show every prescribed set, even when not logged.
  // Also preserve any additional logged sets.
  const rowCount = Math.max(exercise.prescribedSets, exercise.sets.length);

  return (
    <article className="rounded-xl bg-surface p-3">
      <div className="mb-3">
        <h3 className="text-[13px] font-bold leading-snug text-white">
          {exercise.name}
        </h3>

        {completedCount === 0 && (
          <p className="mt-1 text-[10px] text-zinc-500">Not started</p>
        )}
      </div>

      <div className="grid grid-cols-[0.65fr_1.1fr_1fr_0.65fr] gap-2 px-1 pb-1.5 text-[9px] font-bold uppercase text-zinc-400">
        <span>Set</span>
        <span>Load</span>
        <span>Reps</span>
        <span className="text-right">RPE</span>
      </div>

      <div className="space-y-1">
        {Array.from({ length: rowCount }, (_, index) => {
          const set = exercise.sets[index];
          const completed = Boolean(set?.done);

          return (
            <div
              key={`${exercise.id}-set-${index}`}
              className={[
                "grid grid-cols-[0.65fr_1.1fr_1fr_0.65fr] items-center gap-2",
                "rounded-md px-1 py-2 text-[10px]",
                index % 2 === 0 ? "bg-[#01010D]/35" : "bg-[#01010D]/15",
              ].join(" ")}
            >
              <span className="font-semibold text-zinc-300">{index + 1}</span>

              <span className="font-semibold text-white">
                {completed
                  ? set.weight === null
                    ? "BW"
                    : formatWeight(set.weight)
                  : "—"}
              </span>

              <span className="font-semibold text-white">
                {completed ? `${set.reps} reps` : "—"}
              </span>

              <span
                className={[
                  "text-right font-bold",
                  completed &&
                  typeof set.rpe === "number" &&
                  Number.isFinite(set.rpe)
                    ? getRpeColor(set.rpe)
                    : "text-zinc-600",
                ].join(" ")}
              >
                {completed &&
                typeof set.rpe === "number" &&
                Number.isFinite(set.rpe)
                  ? formatRpe(set.rpe)
                  : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function TracksPage() {
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date()),
  );

  const [clockNow, setClockNow] = useState(() => Date.now());

  const plan = useProtocolStore((state) => state.plan);
  const workoutLog = useProtocolStore((state) => state.workoutLog);
  const workoutSessions = useProtocolStore((state) => state.workoutSessions);
  const body = useProtocolStore((state) => state.body);

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(selectedDate);
  const selectedKey = dateKey(selectedDate);

  const bodyWeight =
    body.currentWeight !== null &&
    Number.isFinite(body.currentWeight) &&
    body.currentWeight > 0
      ? body.currentWeight
      : 75;

  const selectedPlan = plan.find(
    (day) => day.dayIndex === todayIndex(selectedDate),
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedLogs = workoutLog[selectedKey] ?? {};

  const selectedExercises = useMemo(
    () => buildExerciseHistory(selectedPlan, selectedLogs, bodyWeight),
    [selectedPlan, selectedLogs, bodyWeight],
  );

  const selectedSession = workoutSessions?.[selectedKey];

  // Update live duration for an active session.
  // Date.now() is used for accurate elapsed time even
  // after a browser tab has been suspended.
  useEffect(() => {
    if (!selectedSession || selectedSession.endedAt !== null) {
      return;
    }

    const updateClock = () => setClockNow(Date.now());

    updateClock();

    const interval = window.setInterval(updateClock, 1000);

    const onVisibilityChange = () => {
      if (!document.hidden) updateClock();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [selectedSession]);

  const stats = useMemo(
    () =>
      calculateSessionStats(
        selectedExercises,
        bodyWeight,
        selectedSession,
        clockNow,
      ),
    [selectedExercises, bodyWeight, selectedSession, clockNow],
  );

  const getStatusForDate = (date: Date): DayStatus => {
    const dayPlan = plan.find((day) => day.dayIndex === todayIndex(date));

    const logs = workoutLog[dateKey(date)] ?? {};

    const exercises = buildExerciseHistory(dayPlan, logs, bodyWeight);

    return getDayStatus(dayPlan, exercises);
  };

  const handlePreviousWeek = () => {
    setSelectedDate(addDays(weekStart, -7));
  };

  const handleNextWeek = () => {
    const nextWeekStart = addDays(weekStart, 7);

    if (dateKey(nextWeekStart) > dateKey(today)) {
      return;
    }

    setSelectedDate(
      dateKey(nextWeekStart) === dateKey(startOfWeek(today))
        ? today
        : nextWeekStart,
    );
  };

  const selectedStatus = getDayStatus(selectedPlan, selectedExercises);

  const isRestDay = !selectedPlan || selectedPlan.exerciseIds.length === 0;

  const heading = isRestDay ? "Rest Day" : selectedPlan.name;

  return (
    <main className="min-h-screen space-y-4 bg-canvas px-3 pb-8 pt-5 text-white">
      <WeekCalendar
        weekStart={weekStart}
        selectedDate={selectedDate}
        today={today}
        onSelectDate={setSelectedDate}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        getStatus={getStatusForDate}
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <h1 className="text-[14px] font-bold text-brand-soft">{heading}</h1>

        {selectedStatus === "completed" && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-mint">
            <Check size={12} />
            Completed
          </span>
        )}

        {selectedStatus === "in_progress" && (
          <span className="text-[9px] font-bold text-brand-soft">
            In Progress
          </span>
        )}
      </div>

      <SessionSummary stats={stats} />

      {isRestDay ? (
        <div className="rounded-xl bg-surface px-4 py-8 text-center">
          <p className="text-sm font-bold text-zinc-200">Recovery Day</p>

          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            No exercises scheduled for this day.
          </p>
        </div>
      ) : selectedExercises.length === 0 ? (
        <div className="rounded-xl bg-surface px-4 py-8 text-center">
          <p className="text-sm font-semibold text-zinc-300">
            No exercise information available.
          </p>
        </div>
      ) : (
        <section aria-label="Exercise history" className="space-y-2">
          {selectedExercises.map((exercise) => (
            <ExerciseHistoryCard key={exercise.id} exercise={exercise} />
          ))}
        </section>
      )}
    </main>
  );
}
