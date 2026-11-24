import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Loader2,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import type { SessionItem } from "./SessionCard";
import { recommendNextSet, type NextSetRecommendation } from "../lib/coachApi";
import type {
  ExerciseLog,
  LoggedSet,
  AiSetTarget,
} from "../store/useProtocolStore";

type Props = {
  item: SessionItem;
  log: ExerciseLog;
  estimating: boolean;
  error: string;
  onChange: (log: ExerciseLog) => void;
  onRetry: () => void;
  exerciseIndex: number;
  totalExercises: number;
  onPrevious: () => void;
  onNext: () => void;
  isLocked: boolean;
};

const roundLoad = (n: number) => Math.round(Math.max(0, n) * 2) / 2;

const formatLoad = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

export default function ExerciseLogCard({
  item,
  log,
  estimating,
  error,
  onChange,
  onRetry,
  exerciseIndex,
  totalExercises,
  onPrevious,
  onNext,
  isLocked,
}: Props) {
  const { exercise, prescription } = item;
  const Icon = exercise.icon ?? Dumbbell;

  const activeIndex = log.sets.findIndex((s) => !s.done);
  const complete = log.sets.length > 0 && log.sets.every((set) => set.done);

  const currentIndex = complete
    ? Math.max(0, log.sets.length - 1)
    : activeIndex;

  const currentSet = log.sets[currentIndex];
  const completedSets = log.sets.filter((s) => s.done);
  const lastSet = completedSets.at(-1);

  const [draftWeight, setDraftWeight] = useState<number | null>(
    currentSet?.weight ?? prescription.load,
  );
  const [draftReps, setDraftReps] = useState(
    currentSet?.reps ?? prescription.reps,
  );
  const [draftRpe, setDraftRpe] = useState(
    currentSet?.rpe ?? prescription.rpe ?? 8,
  );

  const [recommendation, setRecommendation] =
    useState<NextSetRecommendation | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");

  const requestId = useRef(0);

  const logRef = useRef(log);
  // eslint-disable-next-line react-hooks/refs
  logRef.current = log;

  // Reset exercise-specific transient state on navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecommendation(null);
    setCoachError("");
    setCoachLoading(false);
    requestId.current += 1;
  }, [exercise.id]);

  // Populate the controls from the active logged set.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftWeight(currentSet?.weight ?? prescription.load);
    setDraftReps(currentSet?.reps ?? prescription.reps);
    setDraftRpe(currentSet?.rpe ?? prescription.rpe ?? 8);
  }, [
    exercise.id,
    currentIndex,
    currentSet?.weight,
    currentSet?.reps,
    currentSet?.rpe,
    prescription.load,
    prescription.reps,
    prescription.rpe,
  ]);

  const getRecommendation = async (sets: LoggedSet[]) => {
    const mine = ++requestId.current;
    setCoachLoading(true);
    setCoachError("");

    try {
      const result = await recommendNextSet({
        exercise: exercise.name,
        sets,
        targetReps: prescription.reps,
      });

      if (mine !== requestId.current) return;

      const latest = logRef.current;
      const nextIndex = latest.sets.findIndex((set) => !set.done);

      if (nextIndex < 0) return;

      const target: AiSetTarget = {
        weight: result.weight,
        reps: result.reps,
        source: result.source,
      };

      const updated: ExerciseLog = {
        ...latest,
        sets: latest.sets.map((set, index) =>
          index === nextIndex ? { ...set, aiTarget: target } : set,
        ),
      };

      logRef.current = updated;
      onChange(updated);
      setRecommendation(result);
    } catch (e) {
      if (mine !== requestId.current) return;
      setCoachError(e instanceof Error ? e.message : "AI Coach unavailable");
    } finally {
      if (mine === requestId.current) {
        setCoachLoading(false);
      }
    }
  };

  const logSet = () => {
    if (isLocked || complete || !currentSet || draftReps < 1) return;

    const nextSets = log.sets.map((set, i) =>
      i === currentIndex
        ? {
            ...set,
            weight: prescription.load === null ? null : draftWeight,
            reps: draftReps,
            rpe: draftRpe,
            done: true,
            aiTarget: set.aiTarget ?? {
              weight: prescription.load,
              reps: prescription.reps,
              source: "local" as const,
            },
          }
        : set,
    );

    const updatedLog: ExerciseLog = {
      ...log,
      sets: nextSets,
    };

    logRef.current = updatedLog;
    onChange(updatedLog);
    setRecommendation(null);

    if (nextSets.some((s) => !s.done)) {
      void getRecommendation(nextSets);
    }
  };

  const undoLastSet = () => {
    const index = log.sets.findLastIndex((s) => s.done);
    if (index < 0) return;

    requestId.current += 1;
    setCoachLoading(false);
    setRecommendation(null);

    onChange({
      ...log,
      sets: log.sets.map((set, i) =>
        i === index ? { ...set, done: false } : set,
      ),
    });
  };

  const savedTarget = currentSet?.aiTarget;

  const load =
    savedTarget?.weight ??
    (prescription.load === null ? null : prescription.load);

  const targetReps = savedTarget?.reps ?? prescription.reps;

  const targetRpe = Math.max(1, Math.min(15, draftRpe));
  const rpePercentage = ((targetRpe - 1) / 14) * 100;

  return (
    <div className="space-y-4">
      <section className="rounded-[15px] bg-[#1d1c2c] p-3.5 shadow-lg">
        {/* Exercise header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon size={20} className="shrink-0 text-[#c7a9ff]" />
              <h2 className="truncate text-[18px] font-extrabold tracking-tight">
                {exercise.name}
              </h2>
            </div>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9993b8]">
              {prescription.load === null
                ? "Bodyweight"
                : /dumbbell|db/i.test(
                      exercise.name + " " + exercise.tags.join(" "),
                    )
                  ? "Per hand load"
                  : "Working load"}
              {" • "}
              {exercise.category}
            </p>
          </div>

          <div className="flex gap-1 pt-1">
            {log.sets.map((set, i) => (
              <span
                key={i}
                className={`h-1.75 rounded-full ${
                  i === currentIndex
                    ? "w-4.25 bg-[#6835ff] shadow-[0_0_12px_#6835ff]"
                    : set.done
                      ? "w-1.75 bg-[#53dca4]"
                      : "w-1.75 bg-[#39354c]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Algorithmic target */}
        <div className="mt-3 rounded-xl bg-[#0d0d1b] px-3 py-3.5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#a6a0c9]">
            Algorithmic Target • Set {currentIndex + 1}
          </p>

          {coachLoading ? (
            <div
              className="mt-3 flex items-center justify-center gap-2 py-3 text-[#60d6a6]"
              role="status"
              aria-label="Loading AI weight and reps recommendation"
            >
              <Loader2 size={25} className="animate-spin" />
              <span className="text-[11px] font-semibold">
                Calculating target...
              </span>
            </div>
          ) : (
            <div className="mt-1 flex items-baseline justify-center gap-1.5">
              <span className="text-[39px] font-black leading-tight tracking-tight text-[#60d6a6]">
                {load === null ? "BW" : formatLoad(load)}
              </span>
              {load !== null && (
                <span className="text-[19px] font-extrabold text-[#60d6a6]">
                  kg
                </span>
              )}
              <span className="text-[22px] font-bold text-[#aaa6c5]">×</span>
              <span className="text-[39px] font-black leading-tight text-[#60d6a6]">
                {targetReps}
              </span>
              <span className="text-[17px] font-bold text-[#60d6a6]">reps</span>
            </div>
          )}
          <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] font-semibold text-[#c8c4e4]">
            <Sparkles size={12} className="text-[#60d6a6]" />
            {recommendation
              ? recommendation.source === "gemini"
                ? "Gemini AI • Next-set recommendation"
                : "Conservative fallback"
              : "Prescribed target • Awaiting workout data"}
          </p>
        </div>

        {/* AI Coach */}
        <div className="mt-3 rounded-xl bg-[#191827] p-3">
          <div className="flex gap-2">
            <span className="mt-0.5 text-[#5fe1ab]">
              <Sparkles size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] leading-[1.55] text-[#e4defb]">
                <span className="font-extrabold text-white">Coach: </span>
                {coachLoading
                  ? "Analyzing your completed sets..."
                  : (recommendation?.reason ??
                    (completedSets.length === 0
                      ? "Complete your first set to unlock a personalized next-set recommendation."
                      : "Review your previous performance and request a new recommendation."))}
              </p>
              {coachError && (
                <p role="alert" className="mt-2 text-[11px] text-rose-300">
                  {coachError}
                </p>
              )}
              {completedSets.length > 0 && !complete && (
                <button
                  type="button"
                  onClick={() => void getRecommendation(log.sets)}
                  disabled={coachLoading}
                  className="mt-2 flex items-center gap-1 text-[10px] font-bold text-[#70e5b5] disabled:opacity-50"
                >
                  {coachLoading && (
                    <Loader2 size={12} className="animate-spin" />
                  )}
                  Refresh AI recommendation
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Last completed set (not fabricated history) */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-[#10101c] px-3 py-2">
          <span className="text-[10px] text-[#a7a0ca]">
            Last Completed Set:
          </span>
          <span className="text-[10px] font-extrabold">
            {lastSet
              ? `${lastSet.weight === null ? "BW" : `${formatLoad(lastSet.weight)} kg`} × ${lastSet.reps}`
              : "No sets logged yet"}
            {lastSet?.rpe != null && (
              <span className="ml-1 text-[#60d6a6]">@ RPE {lastSet.rpe}</span>
            )}
          </span>
        </div>

        {/* Weight / Reps controls */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-[#191827] p-2.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#a69dce]">
              {prescription.load === null ? "Bodyweight" : "Weight / Load"}
            </p>
            <div className="mt-1.5 flex items-center justify-between">
              <button
                type="button"
                aria-label="Decrease weight"
                disabled={complete || prescription.load === null}
                onClick={() => setDraftWeight((w) => roundLoad((w ?? 0) - 0.5))}
                className="grid size-9 place-items-center rounded-lg bg-[#29283a] disabled:opacity-40"
              >
                <Minus size={17} />
              </button>
              <div className="min-w-0">
                <p className="text-[20px] font-black leading-none">
                  {draftWeight === null ? "BW" : formatLoad(draftWeight)}
                </p>
                <p className="mt-1 text-[9px] text-[#a69dce]">KG</p>
              </div>
              <button
                type="button"
                aria-label="Increase weight"
                disabled={complete || prescription.load === null}
                onClick={() => setDraftWeight((w) => roundLoad((w ?? 0) + 0.5))}
                className="grid size-9 place-items-center rounded-lg bg-[#29283a] disabled:opacity-40"
              >
                <Plus size={17} />
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-[#191827] p-2.5 text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#a69dce]">
              Reps Count
            </p>
            <div className="mt-1.5 flex items-center justify-between">
              <button
                type="button"
                aria-label="Decrease repetitions"
                disabled={complete || draftReps <= 1}
                onClick={() => setDraftReps((r) => Math.max(1, r - 1))}
                className="grid size-9 place-items-center rounded-lg bg-[#29283a] disabled:opacity-40"
              >
                <Minus size={17} />
              </button>
              <div>
                <p className="text-[20px] font-black leading-none">
                  {draftReps}
                </p>
                <p className="mt-1 text-[9px] text-[#a69dce]">REPS</p>
              </div>
              <button
                type="button"
                aria-label="Increase repetitions"
                disabled={complete}
                onClick={() => setDraftReps((r) => Math.min(100, r + 1))}
                className="grid size-9 place-items-center rounded-lg bg-[#29283a] disabled:opacity-40"
              >
                <Plus size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* RPE */}
        <div className="mt-4">
          <label
            htmlFor={`rpe-${exercise.id}`}
            className="text-[9px] font-bold uppercase tracking-wider text-[#aaa3d1]"
          >
            Perceived Exertion (RPE)
          </label>
          <div className="mt-2 rounded-xl bg-[#10101c] px-3 py-3">
            <input
              id={`rpe-${exercise.id}`}
              type="range"
              min="1"
              max="15"
              step="1"
              value={targetRpe}
              disabled={complete}
              onChange={(e) => setDraftRpe(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #6331fb ${rpePercentage}%, #353344 ${rpePercentage}%)`,
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-brand disabled:opacity-50"
            />
            <div className="mt-2 grid grid-cols-15 gap-0 text-center text-[8px] font-semibold text-[#c6b7ff]">
              {Array.from({ length: 15 }, (_, index) => index + 1).map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[9px] text-[#655f83]">
              <span>Easy / Warmup</span>
              <span>Maximum / Failure</span>
            </div>
            <p className="mt-2 text-center text-[10px] font-bold text-[#bca7ff]">
              Selected RPE: {targetRpe}
            </p>
          </div>
        </div>

        {/* Log button */}
        <button
          type="button"
          disabled={isLocked || complete || draftReps < 1}
          onClick={logSet}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-4 text-[12px] font-extrabold shadow-[0_5px_22px_rgba(99,49,251,0.3)] disabled:opacity-50"
        >
          <CheckCircle2 size={16} />
          {isLocked
            ? "Complete Current Workout First"
            : complete
              ? "All Sets Completed"
              : `Log Set ${currentIndex + 1} • ${
                  draftWeight === null ? "BW" : `${formatLoad(draftWeight)} kg`
                } × ${draftReps}`}
        </button>

        {completedSets.length > 0 && (
          <button
            type="button"
            onClick={undoLastSet}
            className="mt-2 w-full py-1 text-[10px] font-semibold text-[#aaa3ce]"
          >
            Undo Last Set
          </button>
        )}

        {complete && (
          <p className="mt-2 text-center text-xs text-[#60d6a6]">
            {estimating
              ? "Estimating calories burned..."
              : log.kcal !== null
                ? `Exercise complete • ≈ ${log.kcal} kcal`
                : "Exercise complete"}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-2 text-center text-xs text-rose-300">
            {error}{" "}
            <button type="button" onClick={onRetry} className="underline">
              Retry
            </button>
          </p>
        )}
      </section>

      {/* Exercise navigation */}
      <nav className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={exerciseIndex === 0}
          className="flex items-center justify-center gap-1 rounded-xl bg-[#252337] py-3 text-xs font-bold disabled:opacity-30"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={exerciseIndex === totalExercises - 1}
          className="flex items-center justify-center gap-1 rounded-xl bg-[#252337] py-3 text-xs font-bold disabled:opacity-30"
        >
          Next Exercise <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
