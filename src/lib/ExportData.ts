import type { BodyStats, Goal, PlanDay } from "../store/useProtocolStore";
import { getExercise } from "./exercises";
import { DAY_FULL } from "./plantemplates";

type Input = {
  goal: Goal | null;
  body: BodyStats;
  trainingDays: number[];
  plan: PlanDay[];
};

/** Builds a JSON file of the user's workouts and settings and downloads it. */
export function downloadWorkoutsJson({
  goal,
  body,
  trainingDays,
  plan,
}: Input) {
  const payload = {
    app: "Kinetic AI",
    exportedAt: new Date().toISOString(),
    goal,
    body,
    trainingDays: trainingDays.map((i) => DAY_FULL[i]),
    workouts: plan.map((day) => ({
      day: DAY_FULL[day.dayIndex],
      name: day.name,
      exercises: day.exerciseIds.map((id) => {
        const e = getExercise(id);
        return e
          ? {
              id,
              name: e.name,
              category: e.category,
              muscles: e.muscles,
              targetRpe: e.rpe,
            }
          : { id };
      }),
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kinetic-workouts-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
