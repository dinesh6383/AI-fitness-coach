import { BarChart3 } from "lucide-react";
import { getSplit } from "../lib/splits";

type Props = { selected: number[] };

export default function SummaryCard({ selected }: Props) {
  const count = selected.length;
  const { description } = getSplit(count);

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/20 text-brand-soft">
          <BarChart3 size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold">
            {count} Training {count === 1 ? "Day" : "Days"} Selected
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 text-xs">
        <span className="font-semibold text-zinc-500">Cadence</span>
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <span
              key={i}
              className={`rounded-full ${
                selected.includes(i) ? "size-2 bg-mint" : "size-1.5 bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
