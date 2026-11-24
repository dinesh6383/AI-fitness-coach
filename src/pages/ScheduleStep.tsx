import { useState } from "react";
import { ArrowRight, Repeat, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DayPicker from "../components/DayPicker";
import FlexibilityNote from "../components/FlexibilityNote";
import Header from "../components/Header";
import SummaryCard from "../components/SummaryCard";
import { getSplit } from "../lib/splits";
import { useProtocolStore } from "../store/useProtocolStore";
import SegmentedProgress from "../components/SegmentedProgress";

const STEP = 1;
const TOTAL = 4;
const DEFAULT_DAYS = [0, 1, 3, 5]; // Mon, Tue, Thu, Sat

export default function ScheduleStep() {
  const navigate = useNavigate();
  const savedDays = useProtocolStore((s) => s.trainingDays);
  const saveSchedule = useProtocolStore((s) => s.saveSchedule);

  // Start from what was saved (if the user comes back), else the default
  const [trainingDays, setTrainingDays] = useState<number[]>(
    savedDays.length ? savedDays : DEFAULT_DAYS,
  );

  const toggleDay = (index: number) =>
    setTrainingDays((prev) =>
      prev.includes(index)
        ? prev.filter((d) => d !== index)
        : [...prev, index].sort((a, b) => a - b),
    );

  // const handleContinue = () => {
  //   saveSchedule(trainingDays);
  //   navigate("/builder/goal");
  // };

  const handleContinue = () => {
    console.log("Before save:", {
      selectedDays: trainingDays,
      storedDays: useProtocolStore.getState().trainingDays,
    });

    saveSchedule(trainingDays);

    console.log("After save:", useProtocolStore.getState().trainingDays);

    navigate("/builder/goal");
  };

  const count = trainingDays.length;
  const split = getSplit(count);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-3 py-6">
      <Header
        title="AI Protocol Builder"
        step={STEP}
        total={TOTAL}
        onBack={() => navigate(-1)}
      />

      <SegmentedProgress step={STEP} total={TOTAL} />

      <section className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
          <SlidersHorizontal size={12} />
          Biomechanical Calibration
        </span>
        <h1 className="text-[32px] font-extrabold leading-tight">
          Which day do you train?
        </h1>
        <p className="text-[15px] leading-relaxed text-zinc-400">
          Choose your weekly training rhythm. The algorithm calibrates volume,
          recovery intervals, and progressive overload around these days.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider">
            Weekly Schedule
          </h2>
          <span className="rounded-md bg-mint/15 px-2 py-1 text-[10px] font-bold text-mint">
            {count} Active {count === 1 ? "Day" : "Days"}
          </span>
        </div>
        <DayPicker selected={trainingDays} onToggle={toggleDay} />
      </section>

      <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          <Repeat size={14} className="text-mint" />
          Recommended Split
        </span>
        <span className="text-sm font-bold text-mint">{split.name}</span>
      </div>

      <SummaryCard selected={trainingDays} />
      <FlexibilityNote />

      <div className="mt-auto space-y-3 pt-2 text-center">
        <button
          type="button"
          disabled={count === 0}
          onClick={handleContinue}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-4 text-base font-bold shadow-lg shadow-brand/30 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to Goal
          <ArrowRight size={18} />
        </button>
        <p className="text-[11px] font-semibold text-zinc-500">
          Next: Primary training adaptation &amp; target lifts
        </p>
      </div>
    </main>
  );
}
