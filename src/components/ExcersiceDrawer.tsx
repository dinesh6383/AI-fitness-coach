import { ArrowRight, Check, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  EXERCISES,
  getExercise,
  iconFor,
  type Category,
} from "../lib/exercises";
import { DAY_FULL } from "../lib/plantemplates";
import type { PlanDay } from "../store/Useprotocolstore";

type Props = {
  day: PlanDay;
  onAdd: (exerciseIds: string[]) => void;
  onClose: () => void;
};

type Tab = "All" | Category;
const TABS: Tab[] = ["All", ...CATEGORIES];

const countFor = (tab: Tab) =>
  tab === "All"
    ? EXERCISES.length
    : EXERCISES.filter((e) => e.category === tab).length;

export default function ExerciseDrawer({ day, onAdd, onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("All");
  const [selected, setSelected] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  const dayLabel = `${DAY_FULL[day.dayIndex]}`;

  // Lock page scroll, focus the dialog and close on Escape
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClosing(true);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      EXERCISES.filter(
        (e) =>
          (tab === "All" || e.category === tab) &&
          (!q ||
            [e.name, ...e.muscles, ...e.tags]
              .join(" ")
              .toLowerCase()
              .includes(q)),
      ),
    [tab, q],
  );

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleAdd = () => {
    onAdd(selected);
    setClosing(true);
  };

  const first = selected.length ? getExercise(selected[0]) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        onClick={() => setClosing(true)}
        aria-hidden
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm ${
          closing ? "animate-fade-out" : "animate-fade-in"
        }`}
      />

      {/* Sheet */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) onClose();
        }}
        className={`relative flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl border border-b-0 border-line bg-[#15131f] outline-none ${
          closing ? "animate-sheet-down" : "animate-sheet-up"
        }`}
      >
        {/* Header */}
        <div className="space-y-3 px-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-mint/40 bg-mint/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-mint">
                {DAY_FULL[day.dayIndex]} • {day.name}
              </span>
              <span className="rounded border border-brand/40 bg-brand/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-soft">
                {EXERCISES.length} Exercises
              </span>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setClosing(true)}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-line text-zinc-300 hover:text-white focus-visible:outline-2 focus-visible:outline-brand-soft"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <h2 id="drawer-title" className="text-2xl font-extrabold">
              Add Exercise
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-400">
              Select movements from the biomechanics library to calibrate target
              loads.
            </p>
          </div>

          {/* Search */}
          <label className="flex items-center gap-3 rounded-xl border border-line bg-canvas/70 px-3">
            <Search size={16} className="shrink-0 text-zinc-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${EXERCISES.length} exercises...`}
              aria-label="Search exercises"
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500"
            />
          </label>

          {/* Category tabs */}
          <div
            role="tablist"
            aria-label="Muscle group"
            className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1"
          >
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand-soft ${
                  tab === t
                    ? "border-brand bg-brand text-white shadow-lg shadow-brand/30"
                    : "border-line bg-surface text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {t} ({countFor(t)})
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <ul className="flex-1 space-y-2.5 overflow-y-auto px-5 py-3">
          {visible.map((exercise) => {
            const inPlan = day.exerciseIds.includes(exercise.id);
            const isSelected = selected.includes(exercise.id);
            const Icon = iconFor(exercise);

            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  disabled={inPlan}
                  aria-pressed={isSelected}
                  onClick={() => toggle(exercise.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-soft ${
                    inPlan
                      ? "cursor-not-allowed border-line bg-surface/50 opacity-50"
                      : isSelected
                        ? "border-brand bg-brand/15"
                        : "border-line bg-surface hover:border-zinc-600"
                  }`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                      isSelected
                        ? "bg-brand/30 text-mint"
                        : "bg-line text-brand-soft"
                    }`}
                  >
                    <Icon size={18} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold">
                        {exercise.name}
                      </span>
                      {isSelected && (
                        <span className="rounded bg-mint/15 px-1.5 py-0.5 text-[10px] font-bold text-mint">
                          Target: RPE {exercise.rpe.toFixed(1)}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                      <span className="font-semibold text-indigo-300">
                        {exercise.muscles.join(" • ")}
                      </span>
                      <span className="size-1 rounded-full bg-zinc-600" />
                      {exercise.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-line px-1.5 py-0.5 font-semibold text-zinc-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  </span>

                  {inPlan ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-mint/15 px-2 py-1 text-[10px] font-bold text-mint">
                      <Check size={11} strokeWidth={3} />
                      In Plan
                    </span>
                  ) : isSelected ? (
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-mint text-canvas">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-line text-zinc-300">
                      <Plus size={14} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="py-10 text-center text-sm text-zinc-500">
              No exercises match your search.
            </li>
          )}
        </ul>

        {/* Footer */}
        <div className="space-y-3 border-t border-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold">
            <span className="flex min-w-0 items-center gap-2 text-zinc-300">
              <span
                className={`size-1.5 shrink-0 rounded-full ${selected.length ? "bg-mint" : "bg-zinc-600"}`}
              />
              <span className="truncate">
                {first
                  ? selected.length === 1
                    ? `1 selected • ${first.name} (Target: RPE ${first.rpe.toFixed(1)})`
                    : `${selected.length} selected • ${first.name} +${selected.length - 1} more`
                  : "No exercises selected"}
              </span>
            </span>
            {selected.length > 0 && (
              <span className="shrink-0 font-bold text-mint">
                Ready to Sync
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={selected.length === 0}
            onClick={handleAdd}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-4 text-center text-base font-bold leading-tight shadow-lg shadow-brand/30 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add to {dayLabel}
            <ArrowRight size={18} className="shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
