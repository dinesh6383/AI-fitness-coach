import { Brain, Sparkles } from "lucide-react";

type Props = {
  /** Disables the button, e.g. while the generator isn't available */
  disabled?: boolean;
  /** Shows the in-progress state while the AI is working */
  loading?: boolean;
  onGenerate?: () => void;
};

export default function AiSplitCard({
  disabled = true,
  loading = false,
  onGenerate,
}: Props) {
  return (
    <section className="rounded-2xl border border-brand/40 bg-linear-to-br from-brand/15 to-surface p-4 shadow-[0_0_32px_-12px] shadow-brand/60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/25 text-brand-soft">
            <Sparkles size={18} />
          </div>
          <h2 className="text-sm font-bold">AI Split Generator</h2>
        </div>
        <span className="shrink-0 rounded-full border border-brand/50 bg-brand/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-brand-soft">
          Auto-Balance
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        Craft personalized volume, exercise selection, and rep targets based on
        your goals in seconds.
      </p>

      <button
        type="button"
        disabled={disabled || loading}
        aria-busy={loading}
        onClick={onGenerate}
        title={disabled ? "Coming soon" : undefined}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold shadow-lg shadow-brand/30 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        <Brain size={16} className={loading ? "animate-pulse" : undefined} />
        {loading ? "Generating plan…" : "Generate Workout with AI"}
      </button>
    </section>
  );
}
