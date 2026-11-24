import { CalendarDays, ChevronRight, Flame, Utensils } from "lucide-react";
import type { ProfileSummary } from "../lib/Profile";

type TileProps = {
  label: string;
  value: string;
  sub?: string;
  valueTone?: string;
  subTone?: string;
};

function StatTile({
  label,
  value,
  sub,
  valueTone = "text-white",
  subTone = "text-zinc-500",
}: TileProps) {
  return (
    <div className="rounded-xl border border-line bg-canvas/60 px-2 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className={`mt-1 text-sm font-extrabold ${valueTone}`}>{value}</p>
      {sub && <p className={`text-[10px] font-bold ${subTone}`}>{sub}</p>}
    </div>
  );
}

type Props = { summary: ProfileSummary; onEdit: () => void };

export default function ProfileCard({ summary, onEdit }: Props) {
  return (
    <section className="space-y-3 rounded-3xl border border-line bg-surface p-4">
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit profile"
        className="flex w-full items-start justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-brand-soft"
      >
        <span className="min-w-0">
          <span className="block text-xl font-bold">{summary.name}</span>
          <span className="mt-1.5 inline-block rounded border border-mint/30 bg-mint/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mint">
            {summary.levelChip}
          </span>
          <span className="mt-1.5 block text-xs text-zinc-400">
            {summary.splitLine}
          </span>
        </span>
        <ChevronRight size={18} className="mt-1 shrink-0 text-zinc-400" />
      </button>

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Height"
          value={`${summary.heightCm} cm`}
          sub={`(${summary.heightImperial})`}
        />
        <StatTile
          label="Weight"
          value={`${summary.weight.toFixed(1)} kg`}
          valueTone="text-mint"
          sub="Current"
        />
        <StatTile
          label="Goal"
          value={`${summary.targetWeight.toFixed(1)} kg`}
          valueTone="text-brand-soft"
          sub={summary.goalDelta}
          subTone="text-mint"
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-canvas/60 px-3 py-2.5">
        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="shrink-0 text-brand-soft" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Training Frequency
            </p>
            <p className="text-xs font-bold">{summary.frequency}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-line px-2.5 py-1.5 text-[10px] font-bold text-zinc-300">
          {summary.experienceChip}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 px-3 py-3">
          <Flame size={18} className="shrink-0 text-mint" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Daily Fuel
            </p>
            <p className="text-sm font-extrabold">
              {summary.kcal.toLocaleString("en-US")} kcal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 px-3 py-3">
          <Utensils size={18} className="shrink-0 text-mint" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Protein Target
            </p>
            <p className="text-sm font-extrabold">{summary.protein}g Daily</p>
          </div>
        </div>
      </div>
    </section>
  );
}
