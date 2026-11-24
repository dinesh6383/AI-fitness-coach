import { Brain, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function AiCoachRow() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="ai-coach-details"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-brand-soft"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-mint/15 text-mint">
          <Brain size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            AI Coach &amp; Progression Engine
          </span>
          <span className="block text-[11px] font-semibold text-mint/80">
            Offline hybrid • Gemini proxy
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <p
          id="ai-coach-details"
          className="border-t border-line px-4 py-3 text-xs leading-relaxed text-zinc-400"
        >
          Progression targets are calculated on your device from your logged
          sets, and the AI coach refines them when you are online.
        </p>
      )}
    </section>
  );
}
