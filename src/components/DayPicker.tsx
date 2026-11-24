const DAYS = [
  { short: "MON", letter: "M" },
  { short: "TUE", letter: "T" },
  { short: "WED", letter: "W" },
  { short: "THU", letter: "T" },
  { short: "FRI", letter: "F" },
  { short: "SAT", letter: "S" },
  { short: "SUN", letter: "S" },
];

type Props = {
  selected: number[];
  onToggle: (index: number) => void;
};

export default function DayPicker({ selected, onToggle }: Props) {
  return (
    <div
      className="grid grid-cols-7 gap-1.5"
      role="group"
      aria-label="Training days"
    >
      {DAYS.map((day, i) => {
        const active = selected.includes(i);
        return (
          <button
            key={day.short}
            type="button"
            aria-pressed={active}
            aria-label={day.short}
            onClick={() => onToggle(i)}
            className={`flex h-20 flex-col items-center justify-center gap-1 rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-brand-soft ${
              active
                ? "border-brand bg-brand shadow-lg shadow-brand/30"
                : "border-line bg-surface hover:border-zinc-600"
            }`}
          >
            <span
              className={`text-[10px] font-bold ${active ? "text-white" : "text-zinc-500"}`}
            >
              {day.short}
            </span>
            <span
              className={`text-xl font-extrabold leading-none ${
                active ? "text-white" : "text-zinc-500"
              }`}
            >
              {day.letter}
            </span>
            <span
              className={`mt-1 size-1.5 rounded-full ${
                active
                  ? "bg-mint shadow-[0_0_8px_2px_rgba(74,222,128,0.7)]"
                  : "bg-zinc-700"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
