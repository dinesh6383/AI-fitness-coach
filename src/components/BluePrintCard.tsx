type Props = { title: string; pace: number };

const BARS = [
  { h: "h-2", color: "bg-brand" },
  { h: "h-4", color: "bg-mint" },
  { h: "h-3", color: "bg-brand" },
  { h: "h-5", color: "bg-mint" },
];

export default function BlueprintCard({ title, pace }: Props) {
  const paceText = `${pace > 0 ? "+" : ""}${pace.toFixed(2)}`;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-mint/30 bg-mint/10">
            <span className="size-4 rounded-sm bg-mint" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-mint">
              Kinetic Baseline
            </p>
            <h2 className="text-lg font-bold leading-tight">{title}</h2>
          </div>
        </div>
        <div className="text-left">
          <p className="text-[10px] font-bold leading-tight text-mint">
            Metabolic
            <br />
            Pace
          </p>
          <p className="text-sm font-bold text-mint">
            {paceText} <span className="text-[10px]">kg/wk</span>
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="size-1.5 rounded-full bg-mint" />
          Adaptive Neural Scaling Engine
        </span>
        <div className="flex items-end gap-1" aria-hidden>
          {BARS.map((bar, i) => (
            <span
              key={i}
              className={`w-1 rounded-full ${bar.h} ${bar.color}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
