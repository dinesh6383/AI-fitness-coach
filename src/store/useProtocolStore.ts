import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Goal =
  | "gain_weight_build_muscle"
  | "lose_weight_build_muscle"
  | "maintain_weight_build_muscle";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type BodyStats = {
  currentWeight: number | null; // kg
  targetWeight: number | null; // kg
  experienceLevel: ExperienceLevel | null;
};

export type PlanDay = {
  dayIndex: number; // 0 = Monday ... 6 = Sunday
  name: string; // e.g. "Push Day"
  exerciseIds: string[];
};

export type AiSetTarget = {
  weight: number | null;
  reps: number;
  source: "gemini" | "local";
};

/** One set the user logs during a workout. */
export type LoggedSet = {
  weight: number | null;
  reps: number;
  done: boolean;
  rpe?: number | null;
  aiTarget?: AiSetTarget | null;
};

/**
 * Everything logged for one exercise on one day.
 * kcal is Gemini's estimate once all sets are done.
 */
export type ExerciseLog = {
  sets: LoggedSet[];
  kcal: number | null;
};

/** Workout session start and end timestamps. */
export type WorkoutSession = {
  startedAt: number;
  endedAt: number | null;
};

export type PlannedBurn = {
  date: string;
  signature: string;
  kcal: number;
};

type ProtocolState = {
  // Step 1: training days
  // 0 = Monday ... 6 = Sunday
  trainingDays: number[];

  // Step 2
  goal: Goal | null;

  // Step 3
  body: BodyStats;

  // Step 4
  plan: PlanDay[];
  draftPlan: PlanDay[];

  // Profile: AI coach connection
  coachConnected: boolean;

  // Workouts:
  // date (YYYY-MM-DD) -> exercise id -> log
  workoutLog: Record<string, Record<string, ExerciseLog>>;

  plannedBurn: PlannedBurn | null;

  // Session timer
  workoutSessions: Record<string, WorkoutSession>;

  startWorkoutSession: (date: string) => void;
  finishWorkoutSession: (date: string) => void;

  saveDraftPlan: (plan: PlanDay[]) => void;
  saveSchedule: (days: number[]) => void;
  saveGoal: (goal: Goal) => void;
  saveBody: (body: BodyStats) => void;
  savePlan: (plan: PlanDay[]) => void;
  setCoachConnected: (connected: boolean) => void;

  saveExerciseLog: (date: string, exerciseId: string, log: ExerciseLog) => void;

  setPlannedBurn: (plannedBurn: PlannedBurn | null) => void;

  reset: () => void;
};

const initialData = {
  trainingDays: [] as number[],

  goal: null as Goal | null,

  body: {
    currentWeight: null,
    targetWeight: null,
    experienceLevel: null,
  } as BodyStats,

  plan: [] as PlanDay[],
  draftPlan: [] as PlanDay[],

  coachConnected: false,

  workoutLog: {} as Record<string, Record<string, ExerciseLog>>,

  plannedBurn: null as PlannedBurn | null,

  workoutSessions: {} as Record<string, WorkoutSession>,
};

export const useProtocolStore = create<ProtocolState>()(
  persist(
    (set) => ({
      ...initialData,

      saveSchedule: (days) =>
        set({
          trainingDays: [...days].sort((a, b) => a - b),
        }),

      saveGoal: (goal) => set({ goal }),

      saveBody: (body) => set({ body }),

      savePlan: (plan) => set({ plan }),

      saveDraftPlan: (draftPlan) => set({ draftPlan }),

      setCoachConnected: (coachConnected) => set({ coachConnected }),

      saveExerciseLog: (date, exerciseId, log) =>
        set((state) => ({
          workoutLog: {
            ...state.workoutLog,
            [date]: {
              ...state.workoutLog[date],
              [exerciseId]: log,
            },
          },
        })),

      // Start timer only if a session
      // does not already exist for this date.
      startWorkoutSession: (date) =>
        set((state) => {
          if (state.workoutSessions?.[date]) {
            return state;
          }

          return {
            workoutSessions: {
              ...state.workoutSessions,
              [date]: {
                startedAt: Date.now(),
                endedAt: null,
              },
            },
          };
        }),

      // Stop timer and preserve final duration.
      finishWorkoutSession: (date) =>
        set((state) => {
          const session = state.workoutSessions?.[date];

          if (!session || session.endedAt !== null) {
            return state;
          }

          return {
            workoutSessions: {
              ...state.workoutSessions,
              [date]: {
                ...session,
                endedAt: Date.now(),
              },
            },
          };
        }),

      setPlannedBurn: (plannedBurn) => set({ plannedBurn }),

      // reset: () => set(initialData),
      reset: () => {
        console.trace("Zustand RESET called");
        set(initialData);
      },
    }),
    {
      name: "protocol-builder",
    },
  ),
);
