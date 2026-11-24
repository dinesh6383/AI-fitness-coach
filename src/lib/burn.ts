import type { Exercise } from "./exercises";
import type { BurnExercise } from "./burnApi";
import type { Prescription } from "./Today";
import type { ExerciseLog, LoggedSet } from "../store/useProtocolStore";

/** Stable empty value, so selectors don't return a new object on every render. */
export const EMPTY_LOGS: Record<string, ExerciseLog> = {};

type Item = {
  exercise: Pick<Exercise, "id" | "name">;
  prescription: Prescription;
};

/** An exercise counts as finished once every one of its sets is ticked off. */
export const isComplete = (log: ExerciseLog) =>
  log.sets.length > 0 && log.sets.every((s) => s.done);

/** Fresh sets pre-filled from the prescription. */
export const defaultLog = (p: Prescription): ExerciseLog => ({
  sets: Array.from({ length: p.sets }, () => ({
    weight: p.load,
    reps: p.reps,
    done: false,
    aiTarget: {
      weight: p.load,
      reps: p.reps,
      source: "local" as const,
    },
  })),
  kcal: null,
});

/** Calories burned so far today, counting only the given exercises. */
export const burnedKcal = (logs: Record<string, ExerciseLog>, ids: string[]) =>
  ids.reduce((sum, id) => sum + (logs[id]?.kcal ?? 0), 0);

export const toBurnExercise = (
  exercise: Pick<Exercise, "id" | "name">,
  restSec: number,
  sets: Pick<LoggedSet, "weight" | "reps">[],
): BurnExercise => ({
  id: exercise.id,
  name: exercise.name,
  restSec,
  sets: sets.map((s) => ({ weight: s.weight, reps: s.reps })),
});

/** The planned session as Gemini sees it: the prescribed sets, before anything is logged. */
export const plannedExercises = (items: Item[]): BurnExercise[] =>
  items.map(({ exercise, prescription: p }) =>
    toBurnExercise(
      exercise,
      p.restSec,
      Array.from({ length: p.sets }, () => ({ weight: p.load, reps: p.reps })),
    ),
  );

/** Changes whenever the plan or body weight changes, so a cached estimate can be reused safely. */
export const plannedSignature = (weightKg: number, items: Item[]) =>
  JSON.stringify([
    weightKg,
    items.map(({ exercise, prescription: p }) => [
      exercise.id,
      p.sets,
      p.reps,
      p.load,
      p.restSec,
    ]),
  ]);
