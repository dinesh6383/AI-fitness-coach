import { Brain } from "lucide-react";

export default function FlexibilityNote() {
  return (
    <section className="flex gap-3 rounded-2xl border border-line bg-surface p-5">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
        <Brain size={18} />
      </div>
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-mint">
          Algorithmic Flexibility
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-zinc-300">
          No streak shaming or rigid penalties. Missed a lift? The protocol
          auto-shifts recovery targets. You can easily adjust your split
          anytime.
        </p>
      </div>
    </section>
  );
}
