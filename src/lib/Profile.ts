import type {
  BodyStats,
  ExperienceLevel,
  Goal,
  PlanDay,
} from "../store/Useprotocolstore";
import { EXPERIENCE_LEVELS } from "./biometrics";
import { getSplit } from "./splits";
import { dailyCalories } from "./Today";

/** Not collected during onboarding yet. Replace with real account data later. */
export const MOCK_PROFILE = { name: "Alex Mercer", heightCm: 182 };

export const APP_NAME = "Kinetic AI PWA";
export const APP_VERSION = "v2.4.1";
export const APP_BUILD = 890;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

// Placeholder level numbers per experience level
const LEVEL_NUMBER: Record<ExperienceLevel, number> = {
  beginner: 1,
  intermediate: 4,
  advanced: 8,
};

const EXPERIENCE_SHORT: Record<ExperienceLevel, string> = {
  beginner: "<1 Yr Exp",
  intermediate: "1–3 Yrs Exp",
  advanced: "3+ Yrs Exp",
};

const GOAL_NOUN: Record<Goal, string> = {
  gain_weight_build_muscle: "Hypertrophy",
  lose_weight_build_muscle: "Fat Loss",
  maintain_weight_build_muscle: "Recomposition",
};

const GOAL_WORD: Record<Goal, string> = {
  gain_weight_build_muscle: "Bulk",
  lose_weight_build_muscle: "Cut",
  maintain_weight_build_muscle: "Maintain",
};

// Protein in g per kg of body weight (matches the ranges shown in step 2)
const PROTEIN_PER_KG: Record<Goal, number> = {
  gain_weight_build_muscle: 2.2,
  lose_weight_build_muscle: 2.3,
  maintain_weight_build_muscle: 2.1,
};

/** 182 cm -> 6'0" */
export function toFeetInches(cm: number): string {
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

export type ProfileSummary = {
  name: string;
  levelChip: string;
  splitLine: string;
  heightCm: number;
  heightImperial: string;
  weight: number;
  targetWeight: number;
  goalDelta: string;
  frequency: string;
  experienceChip: string;
  kcal: number;
  protein: number;
};

type Input = {
  goal: Goal | null;
  body: BodyStats;
  trainingDays: number[];
  plan: PlanDay[];
};

export function buildProfileSummary({
  goal,
  body,
  trainingDays,
  plan,
}: Input): ProfileSummary {
  const g: Goal = goal ?? "gain_weight_build_muscle";
  const level: ExperienceLevel = body.experienceLevel ?? "intermediate";
  const weight = body.currentWeight ?? 75;
  const targetWeight = body.targetWeight ?? weight;

  const days = trainingDays.length || plan.length;
  const splitName = getSplit(days).name;

  // "Push • Pull • Legs Split", built from the user's own day titles when they exist
  const focuses = [
    ...new Set(plan.map((d) => d.name.replace(/\s+Day\s+\d+$/i, ""))),
  ];
  const splitLine = focuses.length ? `${focuses.join(" • ")} Split` : splitName;

  const delta = Math.round((targetWeight - weight) * 10) / 10;
  const goalDelta =
    delta === 0
      ? GOAL_WORD[g]
      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg ${GOAL_WORD[g]}`;

  const levelLabel =
    EXPERIENCE_LEVELS.find((l) => l.id === level)?.label ?? "Intermediate";

  return {
    name: MOCK_PROFILE.name,
    levelChip: `Level ${LEVEL_NUMBER[level]} • ${levelLabel} ${GOAL_NOUN[g]}`,
    splitLine,
    heightCm: MOCK_PROFILE.heightCm,
    heightImperial: toFeetInches(MOCK_PROFILE.heightCm),
    weight,
    targetWeight,
    goalDelta,
    frequency: `${days} ${days === 1 ? "Day" : "Days"} / Week (${splitName})`,
    experienceChip: EXPERIENCE_SHORT[level],
    kcal: dailyCalories(weight, g),
    protein: roundTo(weight * PROTEIN_PER_KG[g], 5),
  };
}
