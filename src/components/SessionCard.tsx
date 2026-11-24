import { SlidersHorizontal } from "lucide-react";

import type { Exercise } from "../lib/exercises";
import { type Prescription } from "../lib/Today";

import type { ExerciseLog } from "../store/useProtocolStore";
import type { Performance, WorkoutStatus } from "../lib/workoutPerformance";

export type SessionItem = {
  exercise: Exercise;
  prescription: Prescription;

  /** Number of sets actually completed. */
  completedSets?: number;

  /** Calculated against the saved AI targets. */
  performance?: Performance;
  log?: ExerciseLog;
  previousWeekMax?: number;
  todayMax?: number;
  bodyWeight?: number;
};

type Props = {
  items: SessionItem[];
  emptyText: string;
  elapsedMinutes: number;
  editLabel?: string;
  onStart: (exerciseId: string) => void;
  onEdit: () => void;
  onExpand?: () => void;
};

const formatKg = (value: number) => `${Number(value.toFixed(2))} kg`;

const setSegmentColor = (
  set: ExerciseLog["sets"][number] | undefined,
  bodyWeight: number,
) => {
  if (!set?.done) return "bg-line";
  if (!set.aiTarget) return "bg-zinc-500";
  const actual = (set.weight ?? bodyWeight) * set.reps;
  const target = (set.aiTarget.weight ?? bodyWeight) * set.aiTarget.reps;
  if (actual > target) return "bg-brand-soft";
  if (actual < target) return "bg-red-500";
  return "bg-mint";
};

const getStatus = (completed: number, total: number): WorkoutStatus => {
  if (completed <= 0) {
    return "not_started";
  }

  if (completed >= total) {
    return "completed";
  }

  return "in_progress";
};

const STATUS_UI: Record<
  WorkoutStatus,
  {
    label: string;
    text: string;
  }
> = {
  not_started: {
    label: "Not Started",
    text: "text-zinc-500",
  },

  in_progress: {
    label: "In Progress",
    text: "text-brand-soft",
  },

  completed: {
    label: "Completed",
    text: "text-mint",
  },
};

const PERFORMANCE_UI: Record<
  Exclude<Performance, null>,
  {
    label: string;
    className: string;
    dotClassName: string;
  }
> = {
  underload: {
    label: "Underload",
    className: "border-amber-500/30 " + "bg-amber-500/10 " + "text-amber-400",
    dotClassName: "bg-amber-400",
  },

  on_target: {
    label: "On Target",
    className: "border-mint/30 " + "bg-mint/10 " + "text-mint",
    dotClassName: "bg-mint",
  },

  overload: {
    label: "Overload",
    className:
      "border-brand-soft/30 " + "bg-brand-soft/10 " + "text-brand-soft",
    dotClassName: "bg-brand-soft",
  },
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold leading-none text-brand-soft">
        {value}
      </p>
    </div>
  );
}

export default function SessionCard({
  items,
  emptyText,
  elapsedMinutes,
  editLabel = "Edit Plan",
  onStart,
  onEdit,
}: Props) {
  const hasSession = items.length > 0;

  const minutes = elapsedMinutes;

  // Derive live statistics exclusively from completed, saved sets.
  // Bodyweight sets use the same effective body weight used by Today's page.
  const completedSets = items.flatMap((item) =>
    (item.log?.sets ?? [])
      .filter((set) => set.done)
      .map((set) => ({ set, bodyWeight: item.bodyWeight })),
  );

  const totalSets = completedSets.length;

  const totalVolume = completedSets.reduce((sum, { set, bodyWeight }) => {
    const weight = set.weight === null ? bodyWeight : set.weight;
    if (typeof weight !== "number" || !Number.isFinite(weight)) return sum;
    if (!Number.isFinite(set.reps) || set.reps <= 0) return sum;
    return sum + weight * set.reps;
  }, 0);

  const validRpes = completedSets
    .map(({ set }) => set.rpe)
    .filter(
      (rpe): rpe is number =>
        typeof rpe === "number" &&
        Number.isFinite(rpe) &&
        rpe >= 1 &&
        rpe <= 15,
    );
  const avgRpe = validRpes.length
    ? validRpes.reduce((sum, rpe) => sum + rpe, 0) / validRpes.length
    : 0;

  const formattedVolume = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(totalVolume);

  // Count actual overload classifications.
  const overloadCount = items.filter(
    (item) => item.performance === "overload",
  ).length;

  // Count exercises that have completed every set.
  const completedExercises = items.filter(
    (item) => (item.completedSets ?? 0) >= item.prescription.sets,
  ).length;

  return (
    <section
      aria-labelledby="session-title"
      className="space-y-5 rounded-3xl border border-line bg-surface p-5"
    >
      {/* Header */}
      <div>
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-brand-soft">
          <span className="size-1.5 rounded-full bg-brand-soft" />
          Prescribed Protocol
        </p>

        <h2
          id="session-title"
          className="mt-2 text-sm font-bold uppercase tracking-[0.2em]"
        >
          Today&apos;s Session
        </h2>

        {!hasSession && (
          <p className="mt-1 text-xs text-zinc-400">{emptyText}</p>
        )}
      </div>

      {hasSession && (
        <>
          {/* Session summary stats */}
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Min" value={minutes} />

            <Stat label="Sets" value={totalSets} />

            <Stat label="Volume" value={formattedVolume} />

            <Stat label="Avg RPE" value={avgRpe.toFixed(1)} />
          </div>

          <div className="h-px bg-line" />

          {/* Exercise summary */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              {items.length} {items.length === 1 ? "Exercise" : "Exercises"}
              {" · "}
              {overloadCount} Overload
            </p>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-mint">
              {completedExercises}/{items.length} Done
            </p>
          </div>

          {/* Exercise list */}
          <ol className="space-y-0">
            {items.map(
              ({
                exercise,
                prescription,
                completedSets = 0,
                performance = null,
                log,
                previousWeekMax = 0,
                todayMax = 0,
                bodyWeight = 75,
              }) => {
                const done = Math.max(
                  0,
                  Math.min(completedSets, prescription.sets),
                );

                const status = getStatus(done, prescription.sets);

                const statusUi = STATUS_UI[status];

                const performanceUi =
                  performance !== null ? PERFORMANCE_UI[performance] : null;

                return (
                  <li
                    key={exercise.id}
                    className="border-b border-line/70 py-3.5 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => onStart(exercise.id)}
                      className="flex w-full items-start gap-3 text-left"
                      aria-label={`Open ${exercise.name.length > 20 ? `${exercise.name.slice(0, 20)}...` : exercise.name}, ${statusUi.label}`}
                    >
                      {/* Exercise details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 truncate text-xs font-bold">
                            {exercise.name.length > 20
                              ? `${exercise.name.slice(0, 20)}...`
                              : exercise.name}
                          </p>

                          {/* Performance badge */}
                          {performanceUi && (
                            <span
                              className={
                                "inline-flex shrink-0 " +
                                "items-center gap-1 " +
                                "rounded border px-1.5 " +
                                "py-0.5 text-[8px] " +
                                "font-bold uppercase " +
                                "tracking-wider " +
                                performanceUi.className
                              }
                            >
                              <span
                                className={
                                  "size-1 rounded-full " +
                                  performanceUi.dotClassName
                                }
                              />

                              {performanceUi.label}
                            </span>
                          )}
                        </div>

                        {/* Completed set segments */}
                        <div
                          className="mt-2 flex gap-1"
                          role="img"
                          aria-label={`${done} of ${prescription.sets} sets done`}
                        >
                          {Array.from({
                            length: prescription.sets,
                          }).map((_, index) => {
                            const isDone = index < done;

                            return (
                              <span
                                key={index}
                                className={
                                  "h-1 w-5 rounded-full " +
                                  (isDone
                                    ? setSegmentColor(
                                        log?.sets[index],
                                        bodyWeight,
                                      )
                                    : "bg-line")
                                }
                              />
                            );
                          })}
                        </div>

                        {/* Previous calendar week max -> today's max */}
                        <p className="mt-1.5 text-[10px] text-zinc-500">
                          {formatKg(previousWeekMax)} → {formatKg(todayMax)} :{" "}
                          <span
                            className={
                              previousWeekMax > 0 && todayMax > previousWeekMax
                                ? "text-brand-soft"
                                : previousWeekMax > 0 &&
                                    todayMax < previousWeekMax
                                  ? "text-red-400"
                                  : "text-mint"
                            }
                          >
                            {previousWeekMax === 0
                              ? "—"
                              : `${todayMax >= previousWeekMax ? "+" : ""}${Number((((todayMax - previousWeekMax) / previousWeekMax) * 100).toFixed(1))}%`}
                          </span>
                        </p>
                      </div>

                      {/* Exercise completion status */}
                      <div className="shrink-0 text-right">
                        <p
                          className={
                            "text-[10px] font-bold " +
                            "uppercase tracking-wider " +
                            statusUi.text
                          }
                        >
                          {statusUi.label}
                        </p>
                      </div>

                      {/* <ChevronRight
                        size={18}
                        className="my-auto shrink-0 text-zinc-400"
                      /> */}
                    </button>
                  </li>
                );
              },
            )}
          </ol>

          {/* Completion legend */}
          <ul className="space-y-1 text-[9px] uppercase tracking-[0.15em] text-zinc-600">
            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-zinc-500" />
              Not Started
            </li>

            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-brand-soft" />
              In Progress
            </li>

            <li className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-mint" />
              Completed
            </li>
          </ul>
        </>
      )}

      {/* Edit plan action */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas/60 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:border-zinc-600 focus-visible:outline-2 focus-visible:outline-brand-soft"
        >
          <SlidersHorizontal size={14} />
          {editLabel}
        </button>
      </div>
    </section>
  );
}
