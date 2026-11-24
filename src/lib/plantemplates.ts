import type { PlanDay } from "../store/useProtocolStore";

export const DAY_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
export const DAY_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * Focus of each training day, by how many days the user trains.
 * These match the "Recommended Split" shown in step 1.
 */
const FOCUS_BY_DAY_COUNT: Record<number, string[]> = {
  1: ["Full Body"],
  2: ["Full Body", "Full Body"],
  3: ["Full Body", "Full Body", "Full Body"],
  4: ["Upper Body", "Lower Body", "Upper Body", "Lower Body"], // Upper / Lower Hybrid
  5: ["Push", "Pull", "Legs", "Push", "Pull"], // Push / Pull / Legs
  6: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"], // PPL x2
  7: ["Push", "Pull", "Legs", "Push", "Pull", "Legs", "Active Recovery"],
};

/** Focuses that are never numbered */
const UNNUMBERED = new Set(["Active Recovery"]);

/**
 * Turns a list of focuses into titles, numbering repeats:
 * ['Push', 'Pull', 'Push'] -> ['Push Day 1', 'Pull Day 1', 'Push Day 2']
 */
export function titlesForDayCount(count: number): string[] {
  const seen: Record<string, number> = {};

  return (FOCUS_BY_DAY_COUNT[count] ?? []).map((focus) => {
    if (UNNUMBERED.has(focus)) return focus;
    seen[focus] = (seen[focus] ?? 0) + 1;
    return `${focus} Day ${seen[focus]}`;
  });
}

/**
 * One entry per selected training day. Days start with a title but no
 * exercises, and anything the user already planned (saved in the store) is kept.
 */
export function buildPlan(trainingDays: number[], saved: PlanDay[]): PlanDay[] {
  const days = [...trainingDays].sort((a, b) => a - b);
  const titles = titlesForDayCount(days.length);

  return days.map(
    (dayIndex, i) =>
      saved.find((p) => p.dayIndex === dayIndex) ?? {
        dayIndex,
        name: titles[i] ?? `Workout ${i + 1}`,
        exerciseIds: [],
      },
  );
}
