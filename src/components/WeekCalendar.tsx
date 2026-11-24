import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { dateKey } from "../lib/Today";
import { addDays, isSameDay, startOfWeek } from "../lib/weekDates";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export type CalendarDayStatus = "completed" | "in_progress" | "not_started" | "rest";

export default function WeekCalendar({
  heading,
  selectedDate,
  today,
  onSelectDate,
  getStatus,
}: {
  heading: ReactNode;
  selectedDate: Date;
  today: Date;
  onSelectDate: (date: Date) => void;
  getStatus?: (date: Date) => CalendarDayStatus;
}) {
  const weekStart = startOfWeek(selectedDate);
  const nextWeekStart = addDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  const canGoNext = dateKey(nextWeekStart) <= dateKey(today);

  const monthLabel = weekStart.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <section className="space-y-3">
      {heading}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectDate(addDays(weekStart, -7))}
            aria-label="Previous week"
            className="flex size-8 items-center justify-center rounded-lg bg-surface text-zinc-300 transition hover:text-white"
          >
            <ChevronLeft size={17} />
          </button>

          <span className="min-w-19 text-center text-[10px] font-semibold text-zinc-400">
            {monthLabel}
          </span>

          <button
            type="button"
            onClick={() =>
              onSelectDate(isSameDay(nextWeekStart, startOfWeek(today)) ? today : nextWeekStart)
            }
            disabled={!canGoNext}
            aria-label="Next week"
            className="flex size-8 items-center justify-center rounded-lg bg-surface text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date, index) => {
          const selected = isSameDay(date, selectedDate);
          const future = dateKey(date) > dateKey(today);
          const status = getStatus?.(date);

          const completed = status === "completed";
          const inProgress = status === "in_progress";

          return (
            <button
              key={dateKey(date)}
              type="button"
              disabled={future}
              onClick={() => onSelectDate(date)}
              aria-label={date.toDateString()}
              aria-pressed={selected}
              className={[
                "flex min-w-0 flex-col items-center rounded-xl px-0.5 py-2",
                "transition-colors focus-visible:outline-2 focus-visible:outline-mint",
                selected
                  ? "bg-brand text-white shadow-lg shadow-brand/25"
                  : "bg-surface text-zinc-200",
                future ? "cursor-not-allowed opacity-35" : "cursor-pointer",
              ].join(" ")}
            >
              <span className="text-[8px] font-bold uppercase text-zinc-300">
                {DAY_LABELS[index]}
              </span>

              <span className="mt-1 text-[13px] font-extrabold">
                {date.getDate()}
              </span>

              <span
                className={[
                  "mt-1 flex size-4 items-center justify-center rounded-full",
                  completed
                    ? selected
                      ? "bg-[#01010D] text-mint"
                      : "bg-mint/15 text-mint"
                    : "bg-transparent",
                ].join(" ")}
              >
                {completed ? (
                  <Check size={11} strokeWidth={3} />
                ) : (
                  <span
                    className={[
                      "size-1.5 rounded-full",
                      inProgress
                        ? "bg-brand-soft"
                        : selected
                          ? "bg-white/50"
                          : "bg-zinc-700",
                    ].join(" ")}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
