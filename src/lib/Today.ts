import type { BodyStats, Goal } from "../store/Useprotocolstore";
import { GOAL_PROFILES } from "./biometrics";
import type { Exercise } from "./exercises";

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Local calendar date as YYYY-MM-DD, used to key each day's workout log. */
export const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** 0 = Monday ... 6 = Sunday */
export const todayIndex = (date = new Date()) => (date.getDay() + 6) % 7;

export const GOAL_FOCUS: Record<Goal, string> = {
  gain_weight_build_muscle: "Hypertrophy & Strength",
  lose_weight_build_muscle: "Fat Loss & Strength",
  maintain_weight_build_muscle: "Recomposition & Strength",
};

// ---------- Biometric telemetry ----------

// Daily calorie adjustment per goal (matches the buffers shown in step 2)
const KCAL_BUFFER: Record<Goal, number> = {
  gain_weight_build_muscle: 350,
  lose_weight_build_muscle: -400,
  maintain_weight_build_muscle: 0,
};

export const dailyCalories = (weight: number, goal: Goal) =>
  roundTo(weight * 30 + KCAL_BUFFER[goal], 10);

/**
 * Placeholder values until real logging and wearable data exist.
 * Replace these with live data when you have a source for them.
 */
export const MOCK_TELEMETRY = {
  weekDelta: -0.4, // kg change this week
  recoveryPct: 94,
  hrv: 68, // ms
};

export type Telemetry = typeof MOCK_TELEMETRY & {
  weight: number;
  targetWeight: number;
  targetDate: Date | null;
};

export function buildTelemetry(
  body: BodyStats,
  goal: Goal,
  now = new Date(),
): Telemetry {
  const weight = body.currentWeight ?? 75;
  const targetWeight = body.targetWeight ?? weight;
  const pace = GOAL_PROFILES[goal].pace; // kg per week, signed

  // Weeks to reach the target at the goal's pace (null if it can't be reached)
  let targetDate: Date | null = null;
  if (pace !== 0) {
    const weeks = (targetWeight - weight) / pace;
    if (weeks > 0)
      targetDate = new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  }

  return {
    ...MOCK_TELEMETRY,
    weight,
    targetWeight,
    targetDate,
  };
}

// ---------- Session prescription ----------

export type Prescription = {
  sets: number;
  restSec: number;
  reps: number;
  rpe: number;
  load: number | null; // kg, null = bodyweight
};

// Exact numbers for a few known exercises
const OVERRIDES: Record<string, { load: number; restSec: number }> = {
  "incline-db-press": { load: 12.5, restSec: 120 },
  "db-shoulder-press": { load: 10, restSec: 90 },
  "triceps-pushdown": { load: 20, restSec: 60 },
  "db-lateral-raise": { load: 5, restSec: 60 },
};

// Starting load as a fraction of body weight, by muscle group
const CATEGORY_RATIO: Record<string, number> = {
  Chest: 0.45,
  Shoulders: 0.3,
  Back: 0.5,
  Arms: 0.2,
  Legs: 0.9,
  Core: 0.15,
  "Traps & Neck": 0.4,
  "Full body & conditioning": 0.3,
};

/** Estimated starting prescription. Real loads should come from the user's logs. */
export function getPrescription(
  exercise: Exercise,
  bodyWeight: number,
): Prescription {
  const tags = exercise.tags.join(" ");
  const isolation = /isolation/i.test(tags);
  const bodyweight = /bodyweight/i.test(tags);
  const override = OVERRIDES[exercise.id];

  let load: number | null = null;
  if (!bodyweight) {
    if (override) {
      load = override.load;
    } else {
      const ratio =
        (CATEGORY_RATIO[exercise.category] ?? 0.3) *
        (/dumbbell/i.test(tags) ? 0.35 : 1);
      load = Math.max(2.5, roundTo(bodyWeight * ratio, 2.5));
    }
  }

  return {
    sets: 3,
    restSec:
      override?.restSec ?? (isolation ? 60 : /barbell/i.test(tags) ? 120 : 90),
    reps: isolation ? 15 : 12,
    rpe: exercise.rpe,
    load,
  };
}

/** Rough session length: 60s per set + rest, plus 15 min warm-up and transitions. */
export function sessionMinutes(items: Prescription[]): number {
  const seconds = items.reduce((sum, p) => sum + p.sets * (60 + p.restSec), 0);
  return roundTo(seconds / 60 + 15, 5);
}
