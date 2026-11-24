import { ArrowRight, Check, Lock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GoalCard from "../components/GoalCard";
import Header from "../components/Header";
import SegmentedProgress from "../components/SegmentedProgress";
import { GOALS } from "../lib/goals";
import { useProtocolStore, type Goal } from "../store/useProtocolStore";

const STEP = 2;
const TOTAL = 4;

export default function GoalStep() {
  const navigate = useNavigate();
  const savedGoal = useProtocolStore((s) => s.goal);
  const saveGoal = useProtocolStore((s) => s.saveGoal);

  const [goal, setGoal] = useState<Goal>(
    savedGoal ?? "gain_weight_build_muscle",
  );

  const handleContinue = () => {
    saveGoal(goal);
    navigate("/builder/about");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-3 py-6">
      <Header
        title="AI Protocol Builder"
        step={STEP}
        total={TOTAL}
        onBack={() => navigate(-1)}
      />

      <SegmentedProgress step={STEP} total={TOTAL} />

      <section className="space-y-2">
        <h1 className="text-[32px] font-extrabold leading-tight">
          What is your goal?
        </h1>
        <p className="text-[15px] leading-relaxed text-zinc-400">
          This guides algorithmic calorie expenditure modeling, surplus/deficit
          guidance, and target physique projection.
        </p>
      </section>

      <div role="radiogroup" aria-label="Goal" className="space-y-3">
        {GOALS.map((option) => (
          <GoalCard
            key={option.id}
            option={option}
            selected={goal === option.id}
            onSelect={() => setGoal(option.id)}
          />
        ))}
      </div>

      <section className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
          <Check size={16} strokeWidth={3} />
        </div>
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-mint">
            Calm Coaching Principle
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">
            We calculate your milestone target date without crash dieting or
            arbitrary timelines. Longevity drives hypertrophy.
          </p>
        </div>
      </section>

      <div className="mt-auto space-y-3 pt-2 text-center">
        <button
          type="button"
          onClick={handleContinue}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-4 text-base font-bold shadow-lg shadow-brand/30 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft"
        >
          Continue to About You
          <ArrowRight size={18} />
        </button>
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-zinc-500">
          <Lock size={11} />
          Adaptive protocol updates automatically as weight shifts
        </p>
      </div>
    </main>
  );
}
