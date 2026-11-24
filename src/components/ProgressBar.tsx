type Props = { label: string; step: number; total: number };

export default function ProgressBar({ label, step, total }: Props) {
  const percent = (step / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
        <span className="text-mint">{label}</span>
        <span className="text-zinc-400 normal-case">
          Step {step} of {total}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step}
        className="h-1.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-brand to-mint transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
