import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";

const MIN_KG = 20;
const MAX_KG = 300;

const weightSchema = z
  .string()
  .trim()
  .min(1, "Enter your weight")
  .regex(/^\d+([.,]\d)?$/, "Enter a number with up to 1 decimal, like 74.5")
  .transform((v) => Number(v.replace(",", ".")))
  .pipe(
    z
      .number()
      .min(MIN_KG, `Enter a weight between ${MIN_KG} and ${MAX_KG} kg`)
      .max(MAX_KG, `Enter a weight between ${MIN_KG} and ${MAX_KG} kg`),
  );

type Props = {
  onClose: () => void;
  /** Called with the weight in kg. May be async; the dialog closes when it resolves. */
  onSubmit: (weightKg: number) => void | Promise<void>;
};

export default function WeightLogModal({ onClose, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => weightSchema.safeParse(value), [value]);
  const isValid = result.success;
  const fieldError =
    touched && !result.success ? result.error.issues[0]?.message : undefined;

  // Focus the input when the dialog opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!result.success) {
      setTouched(true);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit(result.data);
    } catch {
      setError("Couldn't log your weight. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the backdrop
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weight-modal-title"
        className="w-full max-w-sm rounded-3xl border border-line bg-surface p-5 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="weight-modal-title" className="text-lg font-extrabold">
            Log your weight
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-line/60 text-zinc-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-brand-soft"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label
              htmlFor="weight"
              className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400"
            >
              Weight (kg)
            </label>
            {/* text-2xl is above 16px, so iOS Safari won't zoom on focus */}
            <input
              ref={inputRef}
              id="weight"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="74.5"
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? "weight-error" : undefined}
              className={`w-full rounded-xl border bg-canvas/60 px-4 py-3.5 text-center font-mono text-2xl font-bold text-white placeholder:text-zinc-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                fieldError
                  ? "border-red-400/70"
                  : "border-line focus:border-brand"
              }`}
            />
            {fieldError && (
              <p
                id="weight-error"
                role="alert"
                className="mt-2 text-xs text-red-400"
              >
                {fieldError}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isValid || saving}
            className="w-full rounded-xl bg-brand py-4 text-sm font-bold uppercase tracking-wider shadow-lg shadow-brand/30 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {saving ? "Logging…" : "Log Weight"}
          </button>
        </form>
      </div>
    </div>
  );
}
