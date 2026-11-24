import {
  ArrowRight,
  Flag,
  Hourglass,
  Info,
  Lock,
  Minimize2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BlueprintCard from "../components/BluePrintCard";
import ExperienceSelector from "../components/ExperienceSelector";
import Header from "../components/Header";
import SectionCard from "../components/SectionCard";
import WeightStepper from "../components/WeightStepper";
import { GOAL_PROFILES } from "../lib/biometrics";
import {
  useProtocolStore,
  type ExperienceLevel,
} from "../store/useProtocolStore";
import SegmentedProgress from "../components/SegmentedProgress";

const STEP = 3;
const TOTAL = 4;
const DEFAULT_WEIGHT = 75;

export default function BiometricsStep() {
  const navigate = useNavigate();
  const goal = useProtocolStore((s) => s.goal) ?? "gain_weight_build_muscle";
  const saved = useProtocolStore((s) => s.body);
  const saveBody = useProtocolStore((s) => s.saveBody);

  const profile = GOAL_PROFILES[goal];

  const [currentWeight, setCurrentWeight] = useState(
    saved.currentWeight ?? DEFAULT_WEIGHT,
  );
  const [targetWeight, setTargetWeight] = useState(
    saved.targetWeight ?? DEFAULT_WEIGHT + profile.defaultDelta,
  );
  const [level, setLevel] = useState<ExperienceLevel>(
    saved.experienceLevel ?? "intermediate",
  );

  const delta = Math.round((targetWeight - currentWeight) * 10) / 10;
  const deltaText = `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg ${profile.deltaLabel}`;
  const paceText = `${profile.pace > 0 ? "+" : ""}${profile.pace.toFixed(2)}`;

  const handleContinue = () => {
    saveBody({ currentWeight, targetWeight, experienceLevel: level });
    navigate("/builder/split");
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
          Your Biometrics &amp; Experience
        </h1>
        <p className="text-[15px] leading-relaxed text-zinc-400">
          Baseline numbers calibrate your starting loads and weight trajectory
          modeling.
        </p>
      </section>

      <BlueprintCard title={profile.blueprint} pace={profile.pace} />

      <SectionCard icon={Hourglass} title="Current Body Weight" tag="Input 01">
        <WeightStepper
          name="current weight"
          value={currentWeight}
          caption="Morning weigh-in"
          onChange={setCurrentWeight}
        />
        <p className="flex gap-2 text-xs leading-relaxed text-zinc-400">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-soft" />
          We use a 7-day moving average to filter out water weight and sodium
          fluctuations.
        </p>
      </SectionCard>

      <SectionCard
        icon={Flag}
        title="Target Body Weight"
        tag="Goal phase"
        tagTone="mint"
      >
        <WeightStepper
          name="target weight"
          value={targetWeight}
          caption={profile.targetCaption}
          onChange={setTargetWeight}
        />
        <div className="flex gap-3 rounded-xl border border-line bg-canvas/60 p-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-mint/15 text-mint">
            <TrendingUp size={16} />
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-mint">
              {deltaText} • Est. {paceText} kg/wk sustainable {profile.paceNoun}
            </p>
            <p className="text-zinc-400">{profile.window}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        icon={Minimize2}
        title="Experience Level"
        tag="Periodization"
      >
        <ExperienceSelector value={level} onChange={setLevel} />
      </SectionCard>

      <section className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/20 text-brand-soft">
          <Zap size={18} />
        </div>
        <div>
          <h3 className="text-sm font-bold">Algorithmic Readiness</h3>
          <p className="text-xs leading-relaxed text-zinc-400">
            Volume landmark sets will adjust dynamically in Step 4
          </p>
        </div>
      </section>

      <div className="mt-auto space-y-3 pt-2 text-center">
        <button
          type="button"
          onClick={handleContinue}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-4 text-base font-bold shadow-lg shadow-brand/30 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft"
        >
          Continue to Plan Split
          <ArrowRight size={18} />
        </button>
        <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <Lock size={11} />
          Parameters locked safely into offline cache
        </p>
      </div>
    </main>
  );
}
