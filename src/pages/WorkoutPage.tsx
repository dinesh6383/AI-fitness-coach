import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import ExerciseLogCard from "../components/ExerciseLogCard";
import type { SessionItem } from "../components/SessionCard";

import {
  EMPTY_LOGS,
  burnedKcal,
  defaultLog,
  isComplete,
  toBurnExercise,
} from "../lib/burn";

import { estimateBurn } from "../lib/burnApi";
import { getExercise } from "../lib/exercises";
import { dateKey, getPrescription, todayIndex } from "../lib/Today";
import { queueExerciseLogRemote } from "../lib/sync";
import {
  useProtocolStore,
  type ExerciseLog,
  type LoggedSet,
} from "../store/useProtocolStore";

export default function WorkoutPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const selectedExerciseId = searchParams.get("exercise");

  const body = useProtocolStore((s) => s.body);
  const plan = useProtocolStore((s) => s.plan);
  const saveExerciseLog = useProtocolStore((s) => s.saveExerciseLog);
  const startWorkoutSession = useProtocolStore((s) => s.startWorkoutSession);
  const finishWorkoutSession = useProtocolStore((s) => s.finishWorkoutSession);
  const persistExerciseLog = (exerciseId: string, log: ExerciseLog) => {
    saveExerciseLog(date, exerciseId, log);

    void queueExerciseLogRemote(date, exerciseId, log).catch((error) => {
      console.error("Failed to sync workout log:", error);
    });
  };

  const date = dateKey();
  const logs = useProtocolStore((s) => s.workoutLog[date]) ?? EMPTY_LOGS;

  const weight = body.currentWeight ?? 75;
  const todayPlan = plan.find((d) => d.dayIndex === todayIndex());

  const items: SessionItem[] = (todayPlan?.exerciseIds ?? []).flatMap((id) => {
    const exercise = getExercise(id);

    return exercise
      ? [
          {
            exercise,
            prescription: getPrescription(exercise, weight),
          },
        ]
      : [];
  });

  const [activeIndex, setActiveIndex] = useState(() => {
    if (!selectedExerciseId) return 0;

    const index = items.findIndex(
      (item) => item.exercise.id === selectedExerciseId,
    );

    return index >= 0 ? index : 0;
  });
  const [estimating, setEstimating] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const requestNumber = useRef<Record<string, number>>({});

  const activeItem = items[activeIndex];

  // Reset scroll on initial entry and whenever the selected exercise changes.
  // Handle both the document and any scrollable app-shell container.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    let element: HTMLElement | null = document.querySelector("main");
    while (element) {
      if (element.scrollTop > 0) element.scrollTop = 0;
      element = element.parentElement;
    }
  }, [activeIndex, selectedExerciseId]);

  useEffect(() => {
    if (!selectedExerciseId) return;

    const index = items.findIndex(
      (item) => item.exercise.id === selectedExerciseId,
    );

    if (index >= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIndex(index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExerciseId, plan]);

  useEffect(() => {
    if (!activeItem) return;

    const exerciseId = activeItem.exercise.id;
    const savedLog = useProtocolStore.getState().workoutLog[date]?.[exerciseId];

    console.log("EXERCISE NAVIGATION DEBUG", {
      exerciseIndex: activeIndex,
      exerciseId,
      exerciseName: activeItem.exercise.name,
      prescribedSets: activeItem.prescription.sets,
      savedLog,
      isComplete: savedLog ? isComplete(savedLog) : false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, activeItem?.exercise.id, date]);

  const logFor = (item: SessionItem): ExerciseLog =>
    logs[item.exercise.id] ?? defaultLog(item.prescription);

  const inProgressExerciseId = items.find((item) => {
    const log = logFor(item);

    return log.sets.some((set) => set.done) && !isComplete(log);
  })?.exercise.id;

  const isExerciseLocked = (exerciseId: string) =>
    Boolean(inProgressExerciseId && inProgressExerciseId !== exerciseId);

  const estimate = async (item: SessionItem, sets: LoggedSet[]) => {
    const id = item.exercise.id;
    const mine = (requestNumber.current[id] ?? 0) + 1;

    requestNumber.current[id] = mine;

    setEstimating((prev) => ({
      ...prev,
      [id]: true,
    }));

    setErrors((prev) => ({
      ...prev,
      [id]: "",
    }));

    const result = await estimateBurn(weight, [
      toBurnExercise(item.exercise, item.prescription.restSec, sets),
    ]);

    if (requestNumber.current[id] !== mine) {
      return;
    }

    setEstimating((prev) => ({
      ...prev,
      [id]: false,
    }));

    if (!result.ok) {
      setErrors((prev) => ({
        ...prev,
        [id]:
          "message" in result ? result.message : "Unable to estimate calories",
      }));
      return;
    }

    const latest = useProtocolStore.getState().workoutLog[date]?.[id];

    if (latest && isComplete(latest)) {
      persistExerciseLog(id, {
        ...latest,
        kcal: result.items[0]?.kcal ?? null,
      });
    }
  };

  const handleChange = (item: SessionItem, next: ExerciseLog) => {
    const id = item.exercise.id;
    const wasComplete = isComplete(logFor(item));
    const nowComplete = isComplete(next);

    // Start only after the first exercise's first set is successfully logged.
    if (
      items[0]?.exercise.id === id &&
      !logFor(item).sets[0]?.done &&
      next.sets[0]?.done
    ) {
      startWorkoutSession(date);
    }

    if (!nowComplete) {
      requestNumber.current[id] = (requestNumber.current[id] ?? 0) + 1;

      setEstimating((prev) => ({
        ...prev,
        [id]: false,
      }));

      setErrors((prev) => ({
        ...prev,
        [id]: "",
      }));

      persistExerciseLog(id, {
        ...next,
        kcal: null,
      });
      return;
    }

    persistExerciseLog(id, next);

    if (!wasComplete) {
      void estimate(item, next.sets);
    }
  };

  // Resume calorie estimates interrupted by reload.
  useEffect(() => {
    for (const item of items) {
      const log = logs[item.exercise.id];

      if (log && isComplete(log) && log.kcal === null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void estimate(item, log.sets);
      }
    }

    // Preserve original mount-only recovery behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ids = items.map((i) => i.exercise.id);

  const completed = items.filter((i) => isComplete(logFor(i))).length;

  const burned = burnedKcal(logs, ids);

  const goToExercise = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(items.length - 1, index)));
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[#0d0c19] px-3 pb-8 pt-3 text-white">
      {/* Top header */}
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/today")}
            aria-label="Back to Today"
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#1d1c2c]"
          >
            <ArrowLeft size={16} />
          </button>

          <h1 className="truncate text-[19px] font-black tracking-tight">
            {todayPlan?.name ?? "Workout"}
          </h1>

          <span className="shrink-0 rounded-md bg-[#292341] px-2 py-1 text-[9px] font-bold text-[#c6b3ff]">
            Ex {items.length ? activeIndex + 1 : 0} of {items.length}
          </span>
        </div>
      </header>

      {items.length === 0 ? (
        <section className="rounded-xl bg-[#1d1c2c] p-5 text-sm text-[#a9a2c5]">
          No workout is planned for today.
        </section>
      ) : activeItem ? (
        <>
          <ExerciseLogCard
            key={activeItem.exercise.id}
            item={activeItem}
            log={logFor(activeItem)}
            estimating={estimating[activeItem.exercise.id] ?? false}
            error={errors[activeItem.exercise.id] ?? ""}
            onChange={(next) => handleChange(activeItem, next)}
            onRetry={() => void estimate(activeItem, logFor(activeItem).sets)}
            exerciseIndex={activeIndex}
            totalExercises={items.length}
            onPrevious={() => goToExercise(activeIndex - 1)}
            onNext={() => goToExercise(activeIndex + 1)}
            isLocked={isExerciseLocked(activeItem.exercise.id)}
          />

          {/* Workout summary */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#1d1c2c] px-4 py-3 text-[11px]">
            <span className="text-[#a49dbd]">
              {completed}/{items.length} exercises complete
            </span>
            <span className="font-bold text-[#5fe1ab]">≈ {burned} kcal</span>
          </div>

          {/* Optional compact exercise navigation */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              aria-label="Previous exercise"
              disabled={activeIndex === 0}
              onClick={() => goToExercise(activeIndex - 1)}
              className="rounded-lg p-2 text-[#aaa3ce] disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>

            {items.map((item, index) => (
              <button
                key={item.exercise.id}
                type="button"
                aria-label={`Go to exercise ${index + 1}`}
                aria-current={activeIndex === index ? "step" : undefined}
                onClick={() => goToExercise(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex
                    ? "w-6 bg-brand"
                    : isComplete(logFor(item))
                      ? "w-2 bg-[#5fe1ab]"
                      : "w-2 bg-[#353149]"
                }`}
              />
            ))}

            <button
              type="button"
              aria-label="Next exercise"
              disabled={activeIndex === items.length - 1}
              onClick={() => goToExercise(activeIndex + 1)}
              className="rounded-lg p-2 text-[#aaa3ce] disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </>
      ) : null}

      {/* Finish is available on the final exercise, regardless of completion. */}
      {items.length > 0 && activeIndex === items.length - 1 && (
        <button
          type="button"
          onClick={() => {
            finishWorkoutSession(date);
            navigate("/today");
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-4 text-[12px] font-extrabold text-white"
        >
          <span aria-hidden="true">✓</span> Finish Workout
        </button>
      )}

      {/* Session exit */}
      <button
        type="button"
        onClick={() => {
          finishWorkoutSession(date);
          navigate("/today");
        }}
        className={`${items.length > 0 && activeIndex === items.length - 1 ? "mt-2" : "mt-6"} flex w-full items-center justify-center gap-2 rounded-xl bg-[#1d1c2c] py-4 text-[12px] font-semibold text-[#aaa3ce]`}
      >
        <span className="text-[#a49cc5]">⊗</span>
        End Session Early
      </button>
    </main>
  );
}
