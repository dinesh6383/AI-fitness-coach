import type { BodyStats, Goal, PlanDay } from "../store/useProtocolStore";
import { EXERCISES, getExercise } from "./exercises";
import { generatePlan, type GenerateInput } from "./generateApi";
import { getSplit } from "./splits";

export function buildGenerateInput(plan: PlanDay[], body: BodyStats, goal: Goal | null): GenerateInput {
  if (!goal) throw new Error("Select your fitness goal before generating a plan.");
  if (!body.currentWeight || !body.targetWeight || !body.experienceLevel) {
    throw new Error("Complete your weight and experience details before generating a plan.");
  }
  if (!plan.length) throw new Error("Select at least one training day.");
  return {
    weightKg: body.currentWeight,
    targetWeightKg: body.targetWeight,
    goal,
    experience: body.experienceLevel,
    splitName: getSplit(plan.length).name,
    days: plan.map(d => ({ dayIndex: d.dayIndex, title: d.name })),
    library: EXERCISES.map(e => ({ id: e.id, name: e.name, category: e.category, muscles: e.muscles })),
  };
}

export function applyGenerated(
  plan: PlanDay[],
  generated: { dayIndex: number; exerciseIds: string[] }[],
): PlanDay[] {
  const expected = new Set(plan.map(d => d.dayIndex));
  const indices = generated.map(d => d.dayIndex);
  if (generated.length !== plan.length || new Set(indices).size !== indices.length ||
      indices.some(index => !expected.has(index)) ||
      generated.some(day => day.exerciseIds.length < 4 || day.exerciseIds.length > 8 ||
        new Set(day.exerciseIds).size !== day.exerciseIds.length ||
        day.exerciseIds.some(id => !getExercise(id)))) {
    throw new Error("Gemini returned an incomplete or invalid workout plan. Please try again.");
  }
  const byDay = new Map(generated.map(day => [day.dayIndex, day.exerciseIds]));
  return plan.map(day => ({ ...day, exerciseIds: [...byDay.get(day.dayIndex)!] }));
}

export async function generatePlanWithAi(
  plan: PlanDay[], body: BodyStats, goal: Goal | null,
): Promise<PlanDay[]> {
  const input = buildGenerateInput(plan, body, goal);
  const result = await generatePlan(input);
  if (!result.ok) throw new Error(result.message);
  return applyGenerated(plan, result.days);
}
