import type { ExerciseLog } from "../store/useProtocolStore";

export type Performance = "underload" | "on_target" | "overload" | null;

export type WorkoutStatus = "not_started" | "in_progress" | "completed";

export function evaluateExercise(
  log: ExerciseLog | undefined,
  bodyWeight: number,
  prescribedSets: number,
) {
  const completed = log?.sets.filter((set) => set.done) ?? [];
  const completedSets = completed.length;

  const status: WorkoutStatus =
    completedSets === 0
      ? "not_started"
      : completedSets >= prescribedSets
        ? "completed"
        : "in_progress";

  let actualVolume = 0;
  let targetVolume = 0;
  let comparable = completedSets > 0;

  for (const set of completed) {
    if (!set.aiTarget) {
      comparable = false;
      continue;
    }

    actualVolume += (set.weight ?? bodyWeight) * set.reps;

    targetVolume += (set.aiTarget.weight ?? bodyWeight) * set.aiTarget.reps;
  }

  const performance: Performance = !comparable
    ? null
    : actualVolume < targetVolume
      ? "underload"
      : actualVolume > targetVolume
        ? "overload"
        : "on_target";

  return {
    status,
    performance,
    completedSets,
    actualVolume,
    targetVolume,
  };
}
