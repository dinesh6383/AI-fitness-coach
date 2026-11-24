import { ChevronLeft } from "lucide-react";

type Props = { step: number; total: number };

export default function PercentProgress({ step, total }: Props) {
  const percent = Math.round((step / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
        <span className="flex items-center gap-1 text-zinc-400">
          <ChevronLeft size={12} />
          Step {step} of {total}
        </span>
        <span className="text-white normal-case">{percent}% Complete</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
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
