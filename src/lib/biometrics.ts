import type { ExperienceLevel, Goal } from "../store/Useprotocolstore";

export type GoalProfile = {
  blueprint: string; // hero card title
  targetCaption: string; // caption under the target weight
  deltaLabel: string; // "+5.0 kg <deltaLabel>"
  paceNoun: string; // "sustainable <paceNoun>"
  pace: number; // kg per week
  window: string; // calorie window sentence
  defaultDelta: number; // target = current + defaultDelta
};

export const GOAL_PROFILES: Record<Goal, GoalProfile> = {
  gain_weight_build_muscle: {
    blueprint: "Hypertrophy Blueprint",
    targetCaption: "Hypertrophy Ceiling",
    deltaLabel: "lean mass delta",
    paceNoun: "gain",
    pace: 0.45,
    window: "Optimal caloric surplus window: ~350–400 kcal/day",
    defaultDelta: 5,
  },
  lose_weight_build_muscle: {
    blueprint: "Lean Shred Blueprint",
    targetCaption: "Fat Loss Floor",
    deltaLabel: "body weight delta",
    paceNoun: "loss",
    pace: -0.45,
    window: "Optimal caloric deficit window: ~350–400 kcal/day",
    defaultDelta: -5,
  },
  maintain_weight_build_muscle: {
    blueprint: "Recomposition Blueprint",
    targetCaption: "Maintenance Anchor",
    deltaLabel: "body weight delta",
    paceNoun: "change",
    pace: 0,
    window: "Maintenance window: ~0 kcal/day surplus or deficit",
    defaultDelta: 0,
  },
};

export const EXPERIENCE_LEVELS: {
  id: ExperienceLevel;
  label: string;
  duration: string;
  description: string;
}[] = [
  {
    id: "beginner",
    label: "Beginner",
    duration: "<1 Year",
    description:
      "Under 1 year of training. Focus on learning the main lifts with simple, steady linear progression.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    duration: "1–3 Years",
    description:
      "1–3 years of consistent barbell/dumbbell training. Familiar with double progression and autogenic micro-periodization.",
  },
  {
    id: "advanced",
    label: "Advanced",
    duration: "3+ Years",
    description:
      "3+ years of structured training. Progress needs planned periodization and carefully managed weekly volume.",
  },
];
