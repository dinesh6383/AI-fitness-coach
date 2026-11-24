import { Medal } from "lucide-react";
import { EXPERIENCE_LEVELS } from "../lib/biometrics";
import type { ExperienceLevel } from "../store/Useprotocolstore";

type Props = {
  value: ExperienceLevel;
  onChange: (level: ExperienceLevel) => void;
};

export default function ExperienceSelector({ value, onChange }: Props) {
  const active = EXPERIENCE_LEVELS.find((l) => l.id === value)!;

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Experience level"
        className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-canvas/60 p-1"
      >
        {EXPERIENCE_LEVELS.map((level) => {
          const selected = level.id === value;
          return (
            <button
              key={level.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(level.id)}
              className={`rounded-lg px-1 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-brand-soft ${
                selected
                  ? "bg-brand text-white shadow-lg shadow-brand/30"
                  : "text-zinc-300 hover:bg-line"
              }`}
            >
              <span className="block text-xs font-bold">{level.label}</span>
              <span
                className={`block text-[10px] ${selected ? "text-white/80" : "text-zinc-500"}`}
              >
                {level.duration}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 rounded-xl border border-line bg-canvas/60 p-3">
        <Medal size={16} className="mt-0.5 shrink-0 text-brand-soft" />
        <p className="text-xs leading-relaxed text-zinc-300">
          <span className="font-bold text-white">{active.label}:</span>{" "}
          {active.description}
        </p>
      </div>
    </div>
  );
}
