import { Plus, Scale } from "lucide-react";
import { useEffect, useRef } from "react";

const SHAKE_EVERY_MS = 5000;
const SHAKE_MS = 600;

const SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-5px) rotate(-1deg)" },
  { transform: "translateX(5px) rotate(1deg)" },
  { transform: "translateX(-4px)" },
  { transform: "translateX(4px)" },
  { transform: "translateX(0)" },
];

type Props = {
  onLog: () => void;
  /** Set to false to pause the shake, e.g. while the weight dialog is open */
  shaking?: boolean;
};

export default function WeightLogCard({ onLog, shaking = true }: Props) {
  const ref = useRef<HTMLElement>(null);

  // Shake briefly every few seconds to flag the daily task
  useEffect(() => {
    if (!shaking) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const id = window.setInterval(() => {
      if (reduceMotion.matches) return; // respect the user's motion setting
      ref.current?.animate(SHAKE_KEYFRAMES, {
        duration: SHAKE_MS,
        easing: "ease-in-out",
      });
    }, SHAKE_EVERY_MS);
    return () => window.clearInterval(id);
  }, [shaking]);

  return (
    <section
      ref={ref}
      className="flex items-center justify-between gap-3 rounded-2xl border border-brand/40 bg-linear-to-br from-brand/15 to-surface p-4 shadow-[0_0_32px_-12px] shadow-brand/60"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/25 text-brand-soft">
          <Scale size={18} aria-hidden="true" />
        </div>
        <p className="text-sm font-bold">Log your today&apos;s weight</p>
      </div>

      <button
        type="button"
        onClick={onLog}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold uppercase tracking-wider shadow-lg shadow-brand/30 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft"
      >
        <Plus size={14} aria-hidden="true" />
        Log
      </button>
    </section>
  );
}
