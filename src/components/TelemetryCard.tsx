import {
  Activity,
  Flag,
  Flame,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { Telemetry } from "../lib/Today";

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function recoveryStatus(pct: number) {
  if (pct >= 85) return { label: "Optimal", tone: "text-mint" };
  if (pct >= 65) return { label: "Moderate", tone: "text-amber-400" };
  return { label: "Low", tone: "text-rose-400" };
}

export type BurnState = {
  /** Calories burned so far today, from logged workouts */
  burned: number;
  /** Gemini's estimate for the whole planned session (null while unknown) */
  planned: number | null;
  status: "idle" | "loading" | "error";
  onRetry: () => void;
};

type Props = { data: Telemetry; burn: BurnState; morningWeight: number | null };

export default function TelemetryCard({ data, burn, morningWeight }: Props) {
  const status = recoveryStatus(data.recoveryPct);
  const DeltaIcon = data.weekDelta < 0 ? TrendingDown : TrendingUp;
  const fuelPercent = burn.planned
    ? Math.min(100, (burn.burned / burn.planned) * 100)
    : 0;

  const plannedText =
    burn.planned !== null
      ? `/ ${burn.planned.toLocaleString("en-US")}`
      : burn.status === "loading"
        ? "/ …"
        : burn.status === "error"
          ? "/ —"
          : "";

  return (
    <section
      aria-labelledby="telemetry-title"
      className="space-y-3 rounded-3xl border border-line bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="telemetry-title"
          className="flex items-center gap-2 text-[11px] font-bold uppercase leading-tight tracking-wider"
        >
          <Activity size={18} className="text-mint" />
          <span>
            Biometric
            <br />
            Telemetry
          </span>
        </h2>
        <span className="flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1.5 text-[10px] font-bold text-mint">
          <Flag size={11} />
          Target: {data.targetWeight.toFixed(1)} kg
          {data.targetDate && ` by ${formatDate(data.targetDate)}`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-canvas/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Morning Weight
          </p>
          <p className="mt-1 text-3xl font-extrabold leading-none">
            <p className="mt-1 text-3xl font-extrabold leading-none">
              {morningWeight !== null ? morningWeight.toFixed(1) : "-"}
              <span className="ml-1 text-sm font-semibold text-zinc-400">
                kg
              </span>
            </p>
          </p>
          <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-mint">
            <DeltaIcon size={12} />
            {data.weekDelta > 0 ? "+" : ""}
            {data.weekDelta.toFixed(1)} kg this week
          </p>
        </div>

        <div className="rounded-xl border border-line bg-canvas/60 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Metabolic Fuel
            </p>
            <Flame size={13} className="text-amber-400" />
          </div>
          <p className="mt-1 text-3xl font-extrabold leading-none">
            {burn.burned.toLocaleString("en-US")}
            <span className="ml-1 text-[11px] font-semibold text-zinc-500">
              {plannedText} kcal
              <span className="sr-only"> burned today</span>
            </span>
          </p>
          <div
            role="progressbar"
            aria-label="Calories burned today"
            aria-valuemin={0}
            aria-valuemax={burn.planned ?? 0}
            aria-valuenow={burn.burned}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
          >
            <div
              className="h-full rounded-full bg-amber-400"
              style={{ width: `${fuelPercent}%` }}
            />
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] text-zinc-500">
            {burn.status === "error" ? (
              <>
                Estimate failed
                <button
                  type="button"
                  onClick={burn.onRetry}
                  className="font-bold text-brand-soft underline focus-visible:outline-2 focus-visible:outline-brand-soft"
                >
                  Retry
                </button>
              </>
            ) : (
              "Burned today • AI est."
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-canvas/60 px-3 py-2.5 text-xs">
        <span className="flex items-center gap-2">
          <Zap size={14} className="text-brand-soft" />
          <span>
            <span className="font-bold">CNS System Recovery: </span>
            <span className={`font-bold ${status.tone}`}>
              {status.label} ({data.recoveryPct}%)
            </span>
          </span>
        </span>
      </div>
    </section>
  );
}
