import { CirclePlus, Pencil, X } from "lucide-react";
import { useState } from "react";
import { getExercise, iconFor } from "../lib/exercises";
import { DAY_FULL, DAY_SHORT } from "../lib/plantemplates";
import type { PlanDay } from "../store/Useprotocolstore";

type Props = {
  index: number;
  day: PlanDay;
  onRename: (name: string) => void;
  onRemove: (exerciseId: string) => void;
  onAdd: () => void;
};

export default function DayPlanCard({
  index,
  day,
  onRename,
  onRemove,
  onAdd,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(day.name);

  const count = day.exerciseIds.length;

  const commit = () => {
    const name = draft.trim();
    if (name) onRename(name);
    else setDraft(day.name);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(day.name);
    setEditing(false);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded border border-mint/40 bg-mint/10 px-1.5 py-0.5 text-[10px] font-bold text-mint">
            {DAY_SHORT[day.dayIndex]}
          </span>
          <span className="text-xs font-semibold text-zinc-400">
            Day {String(index + 1).padStart(2, "0")}
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-mint">
          <span className="size-1.5 rounded-full bg-mint" />
          {count} {count === 1 ? "Exercise" : "Exercises"}
        </span>
      </div>

      {/* Editable day name */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-canvas/60 px-3 py-2.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            maxLength={40}
            aria-label="Day name"
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            className="min-w-0 flex-1 bg-transparent text-lg font-bold outline-none"
          />
        ) : (
          <h3 className="truncate text-lg font-bold">{day.name}</h3>
        )}
        <button
          type="button"
          aria-label="Rename day"
          onMouseDown={(e) => e.preventDefault()} // keep input focus so blur doesn't double-fire
          onClick={() =>
            editing ? commit() : (setDraft(day.name), setEditing(true))
          }
          className="grid size-7 shrink-0 place-items-center rounded-md text-brand-soft hover:bg-line focus-visible:outline-2 focus-visible:outline-brand-soft"
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* Exercises */}
      <ul className="space-y-2">
        {day.exerciseIds.map((id) => {
          const exercise = getExercise(id);
          if (!exercise) return null;
          const Icon = iconFor(exercise);
          return (
            <li
              key={id}
              className="flex items-center gap-3 rounded-xl border border-line bg-canvas/60 p-3"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-line text-brand-soft">
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {exercise.name}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {exercise.muscles.join(" • ")}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${exercise.name}`}
                onClick={() => onRemove(id)}
                className="grid size-7 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-line hover:text-white focus-visible:outline-2 focus-visible:outline-brand-soft"
              >
                <X size={14} />
              </button>
            </li>
          );
        })}
        {count === 0 && (
          <li className="rounded-xl border border-dashed border-line py-4 text-center text-xs text-zinc-500">
            No exercises yet
          </li>
        )}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas/60 py-3 text-xs font-bold text-brand-soft transition-colors hover:border-brand/60 focus-visible:outline-2 focus-visible:outline-brand-soft"
      >
        <CirclePlus size={15} />
        Add Exercise to {DAY_FULL[day.dayIndex]}
      </button>
    </section>
  );
}
