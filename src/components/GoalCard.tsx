import { Check } from "lucide-react";
import type { GoalOption } from "../lib/Goals";

type Props = {
  option: GoalOption;
  selected: boolean;
  onSelect: () => void;
};

export default function GoalCard({ option, selected, onSelect }: Props) {
  const { icon: Icon, badge, metabolic, tags } = option;
  const BadgeIcon = badge?.icon;

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`relative cursor-pointer rounded-2xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft ${
        selected
          ? "border-brand bg-linear-to-br from-brand/25 to-surface shadow-lg shadow-brand/20"
          : "border-line bg-surface hover:border-zinc-600"
      }`}
    >
      {/* Radio indicator */}
      <span
        className={`absolute right-4 top-4 grid size-6 place-items-center rounded-full ${
          selected ? "bg-brand text-white" : "border border-line bg-canvas"
        }`}
      >
        {selected && <Check size={14} strokeWidth={3} />}
      </span>

      <div className="flex gap-3 pr-8">
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-lg ${
            selected ? "bg-brand text-white" : "bg-line text-zinc-300"
          }`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p
            className={`text-[10px] font-bold uppercase tracking-wider ${
              selected ? "text-mint" : "text-zinc-500"
            }`}
          >
            {option.eyebrow}
          </p>
          <h3 className="text-lg font-bold leading-tight">{option.title}</h3>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-300">
        {option.description}
      </p>

      {badge && BadgeIcon && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mint/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-mint">
          <BadgeIcon size={11} />
          {badge.label}
        </span>
      )}

      {metabolic && (
        <div className="mt-3 rounded-xl border border-line bg-canvas/70 p-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className="text-zinc-500">Metabolic Profile</span>
            <span className="text-mint normal-case">{metabolic.buffer}</span>
          </div>
          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full">
            <span
              className="bg-brand"
              style={{ width: `${metabolic.macros.protein}%` }}
            />
            <span
              className="bg-mint"
              style={{ width: `${metabolic.macros.carb}%` }}
            />
            <span
              className="bg-amber-400"
              style={{ width: `${metabolic.macros.fat}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between gap-2 text-[10px] font-bold">
            <span>{metabolic.left}</span>
            <span className="text-right">{metabolic.right}</span>
          </div>
        </div>
      )}

      {tags && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-zinc-400">
          {tags.map((tag, i) => {
            const TagIcon = tag.icon;
            return (
              <span
                key={tag.label}
                className="inline-flex items-center gap-1.5"
              >
                {i > 0 && <span className="size-1 rounded-full bg-zinc-600" />}
                {TagIcon && <TagIcon size={12} className="text-zinc-500" />}
                {tag.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
