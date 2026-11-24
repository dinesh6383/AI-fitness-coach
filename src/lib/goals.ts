import {
  ArrowLeftRight,
  Flame,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Goal } from "../store/Useprotocolstore";

export type GoalOption = {
  id: Goal;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: { icon: LucideIcon; label: string };
  metabolic?: {
    buffer: string;
    left: string;
    right: string;
    /** Macro split in percent: protein + carb + fat = 100 */
    macros: { protein: number; carb: number; fat: number };
  };
  tags?: { icon?: LucideIcon; label: string }[];
};

export const GOALS: GoalOption[] = [
  {
    id: "gain_weight_build_muscle",
    eyebrow: "Max Growth Engine",
    title: "Gain weight, build muscle",
    description:
      "Slight caloric surplus with progressive overload to maximize lean tissue accrual with minimal fat gain.",
    icon: TrendingUp,
    badge: { icon: Sparkles, label: "Recommended for hypertrophy" },
    metabolic: {
      buffer: "+350 kcal baseline buffer",
      left: "High Protein (2.2g/kg)",
      right: "High Carb Glycogen Reload",
      macros: { protein: 25, carb: 50, fat: 25 },
    },
  },
  {
    id: "lose_weight_build_muscle",
    eyebrow: "High Density Shred",
    title: "Lose weight, build muscle",
    description:
      "Moderate deficit while preserving strength numbers and muscle density through high tension lifting.",
    icon: Flame,
    badge: {
      icon: Sparkles,
      label: "Recommended for Recomposition & Fat Loss",
    },
    metabolic: {
      buffer: "-400 kcal baseline buffer",
      left: "Very High (2.2g to 2.4g/kg)",
      right: "Moderate Carb, Moderate Fat",
      macros: { protein: 35, carb: 40, fat: 25 },
    },
    tags: [
      { icon: ShieldCheck, label: "Muscle Sparing Deficit" },
      { label: "Target: -0.5% bodyweight/wk" },
    ],
  },
  {
    id: "maintain_weight_build_muscle",
    eyebrow: "Physique Recomposition",
    title: "Maintain weight, build muscle",
    description:
      "Body recomposition at maintenance energy balance, optimizing training stimuli over time.",
    icon: ArrowLeftRight,
    badge: { icon: Sparkles, label: "Recommended for Body Recomposition" },
    metabolic: {
      buffer: "0 kcal baseline buffer",
      left: "High (2.0g to 2.2g/kg)",
      right: "High Carb, Moderate Fat",
      macros: { protein: 30, carb: 45, fat: 25 },
    },
    tags: [
      { icon: Scale, label: "Zero-Fluctuation Energy" },
      { label: "Optimal for Novice/Detrained" },
    ],
  },
];
