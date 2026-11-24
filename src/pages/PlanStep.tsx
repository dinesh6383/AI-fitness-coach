import { ArrowRight, Check, SlidersHorizontal, Zap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AiSplitCard from "../components/AiSplitCard";
import DayPlanCard from "../components/DayPlanCard";
import ExerciseDrawer from "../components/ExcersiceDrawer";
import Header from "../components/Header";
import SegmentedProgress from "../components/SegmentedProgress";
import { generatePlanWithAi } from "../lib/generatePlan";
import { savePlanRemote } from "../lib/sync";
import { buildPlan } from "../lib/plantemplates";
import { useAuth } from "../lib/AuthProvider";
import { useProtocolStore, type PlanDay } from "../store/useProtocolStore";

const STEP = 4;
const TOTAL = 4;

export default function PlanStep() {
  const navigate = useNavigate();
  const trainingDays = useProtocolStore((s) => s.trainingDays);
  const goal = useProtocolStore((s) => s.goal);
  const body = useProtocolStore((s) => s.body);
  const savedPlan = useProtocolStore((s) => s.plan);
  const savePlan = useProtocolStore((s) => s.savePlan);
  const draftPlan = useProtocolStore((s) => s.draftPlan);
  const { refreshOnboarding } = useAuth();

  const [drawerDay, setDrawerDay] = useState<number | null>(null); // dayIndex of the open drawer
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const plan = buildPlan(
    trainingDays,
    draftPlan.length ? draftPlan : savedPlan,
  );

  const setPlan = (update: PlanDay[] | ((current: PlanDay[]) => PlanDay[])) => {
    const state = useProtocolStore.getState();

    const current = buildPlan(
      state.trainingDays,
      state.draftPlan.length ? state.draftPlan : state.plan,
    );

    const next = typeof update === "function" ? update(current) : update;

    state.saveDraftPlan(next);
  };

  const updateDay = (dayIndex: number, update: (day: PlanDay) => PlanDay) =>
    setPlan((prev) =>
      prev.map((d) => (d.dayIndex === dayIndex ? update(d) : d)),
    );

  const rename = (dayIndex: number, name: string) =>
    updateDay(dayIndex, (d) => ({ ...d, name }));

  const removeExercise = (dayIndex: number, id: string) =>
    updateDay(dayIndex, (d) => ({
      ...d,
      exerciseIds: d.exerciseIds.filter((x) => x !== id),
    }));

  const addExercises = (dayIndex: number, ids: string[]) =>
    updateDay(dayIndex, (d) => ({
      ...d,
      exerciseIds: [
        ...d.exerciseIds,
        ...ids.filter((id) => !d.exerciseIds.includes(id)),
      ],
    }));

  const totalExercises = plan.reduce((sum, d) => sum + d.exerciseIds.length, 0);
  const configuredDays = plan.filter((d) => d.exerciseIds.length > 0).length;
  const allConfigured =
    trainingDays.length > 0 &&
    plan.length === trainingDays.length &&
    configuredDays === plan.length;

  const handleGenerate = async () => {
    if (trainingDays.length === 0 || plan.length === 0) {
      setAiError("Please select your training days in Step 1.");
      return;
    }

    setGenerating(true);
    setAiError(null);
    try {
      // Replaces every day, including ones the user already edited
      const generated = await generatePlanWithAi(plan, body, goal);
      setPlan(generated);
    } catch (e) {
      setAiError(
        e instanceof Error
          ? e.message
          : "Couldn't generate a plan. Please try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (saving || generating || !allConfigured) return;

    setSaving(true);
    setSaveError(null);

    try {
      await savePlanRemote(plan);
      savePlan(plan);
      await refreshOnboarding();
      navigate("/today", { replace: true });
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Couldn't save your training plan. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const activeDay = plan.find((d) => d.dayIndex === drawerDay);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-3 py-6">
      <Header
        title="AI Protocol Builder"
        step={STEP}
        total={TOTAL}
        onBack={() => navigate(-1)}
      />

      <SegmentedProgress step={STEP} total={TOTAL} />

      <section className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-soft">
          <SlidersHorizontal size={12} />
          Step {STEP} of {TOTAL}
        </span>
        <h1 className="text-[32px] font-extrabold leading-tight">
          Plan your training days
        </h1>
        <p className="text-[15px] leading-relaxed text-zinc-400">
          Assign a target focus and kinetic movements for each chosen split.
          Progressive load metrics configure automatically.
        </p>
      </section>

      <div className="space-y-2">
        <AiSplitCard
          disabled={false}
          loading={generating}
          onGenerate={handleGenerate}
        />
        {aiError && (
          <p role="alert" className="px-1 text-xs text-red-400">
            {aiError}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {plan.map((day, i) => (
          <DayPlanCard
            key={day.dayIndex}
            index={i}
            day={day}
            onRename={(name) => rename(day.dayIndex, name)}
            onRemove={(id) => removeExercise(day.dayIndex, id)}
            onAdd={() => setDrawerDay(day.dayIndex)}
          />
        ))}
      </div>

      <section
        className={`flex items-center gap-3 rounded-2xl border p-4 ${
          allConfigured ? "border-mint/30 bg-mint/5" : "border-line bg-surface"
        }`}
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint/15 text-mint">
          <Zap size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            {allConfigured
              ? `All ${plan.length} ${plan.length === 1 ? "day" : "days"} configured`
              : `${configuredDays} of ${plan.length} days configured`}{" "}
            ({totalExercises} exercises total)
          </p>
          <p className="truncate text-xs font-semibold text-mint">
            {allConfigured
              ? "Rules engine ready • RPE progressions active"
              : "Add at least one exercise to every day"}
          </p>
        </div>
        {allConfigured && (
          <span className="grid size-6 shrink-0 place-items-center rounded-full border border-mint text-mint">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </section>

      <div className="mt-auto pt-2">
        {saveError && (
          <p role="alert" className="mb-3 text-sm text-red-400">
            {saveError}
          </p>
        )}
        <button
          type="button"
          disabled={!allConfigured || generating || saving}
          onClick={handleSave}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-4 text-base font-bold shadow-lg shadow-brand/30 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving your plan..." : "Save plan & Start Training"}
          <ArrowRight size={18} />
        </button>
      </div>

      {activeDay && (
        <ExerciseDrawer
          key={activeDay.dayIndex}
          day={activeDay}
          onAdd={(ids) => addExercises(activeDay.dayIndex, ids)}
          onClose={() => setDrawerDay(null)}
        />
      )}
    </main>
  );
}
