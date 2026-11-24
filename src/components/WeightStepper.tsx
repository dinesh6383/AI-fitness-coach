import { Minus, Plus } from "lucide-react";

type Props = {
  name: string; // used for accessible labels
  value: number;
  caption: string;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
};

const round = (n: number) => Math.round(n * 10) / 10;

export default function WeightStepper({
  name,
  value,
  caption,
  onChange,
  step = 0.5,
  min = 30,
  max = 250,
}: Props) {
  const change = (delta: number) =>
    onChange(Math.min(max, Math.max(min, round(value + delta))));

  const buttonClass =
    "grid size-12 shrink-0 place-items-center rounded-xl border border-brand/40 bg-brand/10 text-white transition-colors hover:bg-brand/25 focus-visible:outline-2 focus-visible:outline-brand-soft disabled:opacity-40";

  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-canvas/60 p-3">
      <button
        type="button"
        aria-label={`Decrease ${name}`}
        disabled={value <= min}
        onClick={() => change(-step)}
        className={buttonClass}
      >
        <Minus size={20} />
      </button>

      <div className="text-center">
        <p className="text-[44px] font-extrabold leading-none">
          {value.toFixed(1)}
          <span className="ml-1 text-lg font-bold text-mint">kg</span>
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          {caption}
        </p>
      </div>

      <button
        type="button"
        aria-label={`Increase ${name}`}
        disabled={value >= max}
        onClick={() => change(step)}
        className={buttonClass}
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
