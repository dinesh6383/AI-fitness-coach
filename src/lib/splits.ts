export type SplitInfo = { name: string; description: string };

const SPLITS: Record<number, SplitInfo> = {
  0: {
    name: "No split yet",
    description: "Pick at least one day so the algorithm can build your plan.",
  },
  1: {
    name: "Full Body",
    description:
      "One focused session a week keeps the habit simple and recovery easy.",
  },
  2: {
    name: "Full Body",
    description:
      "Two full-body sessions hit each muscle group with plenty of recovery.",
  },
  3: {
    name: "Full Body",
    description:
      "Three sessions spread volume evenly and leave a rest day between each.",
  },
  4: {
    name: "Upper / Lower Hybrid",
    description:
      "Optimal balance for double-progression hypertrophy and 72h muscle protein synthesis recovery cycles.",
  },
  5: {
    name: "Push / Pull / Legs",
    description:
      "Five days gives each muscle group dedicated volume with a flexible rotation.",
  },
  6: {
    name: "PPL x2",
    description:
      "High frequency training. Recovery targets adjust automatically to manage fatigue.",
  },
  7: {
    name: "PPL + Active Recovery",
    description:
      "Daily training with lighter sessions built in to protect your recovery.",
  },
};

export const getSplit = (days: number): SplitInfo => SPLITS[days] ?? SPLITS[0];
