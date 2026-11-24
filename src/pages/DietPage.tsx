import { Camera, Soup } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import WeekCalendar from "../components/WeekCalendar";
import { useAuth } from "../lib/AuthProvider";
import {
  analyzeFoodPhoto,
  getDietTargets,
  loadDietEntries,
  saveDietEntry,
  type DietEntry,
  type DietTargets,
} from "../lib/diet";
import { DIET_NUTRIENTS, foodSchema, type Food } from "../lib/dietNutrition";
import { dateKey } from "../lib/Today";
import { startOfDay } from "../lib/weekDates";
import { useProtocolStore } from "../store/useProtocolStore";

type FoodDraft = Record<keyof Food, string>;
const EMPTY_DRAFT: FoodDraft = {
  food_name: "", serving_size: "", calories_kcal: "", protein_g: "", carbs_g: "", fat_g: "", fibre_g: "",
};
const DAILY_NUTRITION = [["calories_kcal", "Calories", "bg-orange-400"], ...DIET_NUTRIENTS] as const;
const formatAmount = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const inputClass =
  "mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-base text-white outline-none focus-visible:border-mint";

function newEntryId() {
  // getRandomValues also works when testing on a phone over the local HTTP network.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function DailyNutrients({
  entries,
  targets,
}: {
  entries: DietEntry[];
  targets: DietTargets | null;
}) {
  const missingCalories = entries.some((entry) => entry.calories_kcal === null);

  return (
    <section aria-label="Daily nutrition" className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <div>
        <h2 className="font-extrabold">Daily nutrition</h2>
        <p className="text-xs text-zinc-400">
          {targets ? "Estimated targets from your fitness profile" : "Complete your fitness profile to see targets."}
        </p>
      </div>
      {DAILY_NUTRITION.map(([key, label, color]) => {
        const isCalories = key === "calories_kcal";
        const unit = isCalories ? "kcal" : "g";
        const name = isCalories && missingCalories ? "Known calories" : label;
        const total = entries.reduce((sum, entry) => sum + (entry[key] ?? 0), 0);
        const target = targets?.[key] ?? 0;
        const value = target > 0 ? Math.min(100, (total / target) * 100) : 0;
        const formatted = formatAmount.format(total);
        const unrecorded = isCalories && missingCalories && entries.every((entry) => entry.calories_kcal === null);
        return (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-semibold">{name}</span>
              <span className="text-zinc-300">
                {unrecorded ? "Not recorded" : formatted}
                {target > 0 && ` / ${formatAmount.format(target)} ${unit}`}
                {target <= 0 && !unrecorded && ` ${unit}`}
              </span>
            </div>
            {target > 0 && (
              <div
                role="progressbar"
                aria-label={name}
                aria-valuenow={unrecorded ? undefined : value}
                aria-valuetext={unrecorded ? "Calories not recorded" : `${formatted} of ${target} ${isCalories ? "kilocalories" : "grams"}`}
                className="h-2 overflow-hidden rounded-full bg-line"
              >
                <div className={`h-full rounded-full transition-[width] ${color}`} style={{ width: `${value}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function DietDay({
  date,
  userId,
  token,
  targets,
}: {
  date: string;
  userId: string;
  token: string;
  targets: DietTargets | null;
}) {
  const [entries, setEntries] = useState<DietEntry[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [estimated, setEstimated] = useState(false);
  const [formError, setFormError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const photoRequest = useRef<AbortController | null>(null);
  const submitted = useRef<{ fingerprint: string; id: string } | null>(null);

  useEffect(() => {
    const request = new AbortController();
    void loadDietEntries(userId, date, request.signal).then(
      (result) => {
        if (!request.signal.aborted) setEntries(result);
      },
      () => {
        if (!request.signal.aborted) setLoadError("Couldn't load food entries for this day.");
      },
    );
    return () => request.abort();
  }, [date, userId, loadAttempt]);

  useEffect(() => () => photoRequest.current?.abort(), []);

  function update(key: keyof FoodDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError("");
    setSaveNotice("");
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    photoRequest.current?.abort();
    const request = new AbortController();
    photoRequest.current = request;
    setAnalyzing(true);
    setFormError("");
    setSaveNotice("");
    try {
      const food = await analyzeFoodPhoto(file, token, request.signal);
      if (request.signal.aborted) return;
      setDraft({
        food_name: food.food_name,
        serving_size: food.serving_size,
        calories_kcal: String(Number(food.calories_kcal.toFixed(2))),
        protein_g: String(Number(food.protein_g.toFixed(2))),
        carbs_g: String(Number(food.carbs_g.toFixed(2))),
        fat_g: String(Number(food.fat_g.toFixed(2))),
        fibre_g: String(Number(food.fibre_g.toFixed(2))),
      });
      setEstimated(true);
    } catch (error) {
      if (!request.signal.aborted) {
        setFormError(error instanceof Error ? error.message : "Couldn't analyze the photo.");
      }
    } finally {
      if (!request.signal.aborted) setAnalyzing(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || analyzing) return;
    const result = foodSchema.safeParse({
      ...draft,
      calories_kcal: draft.calories_kcal === "" ? NaN : Number(draft.calories_kcal),
      ...Object.fromEntries(
        DIET_NUTRIENTS.map(([key]) => [key, draft[key] === "" ? NaN : Number(draft[key])]),
      ),
    });
    if (!result.success) {
      setFormError("Enter a food name, serving size, calories, and all four nutrient amounts.");
      return;
    }

    setSaving(true);
    setFormError("");
    setSaveNotice("");
    const fingerprint = JSON.stringify(result.data);
    if (submitted.current?.fingerprint !== fingerprint) {
      submitted.current = { fingerprint, id: newEntryId() };
    }
    const entry = { ...result.data, id: submitted.current.id };

    try {
      await saveDietEntry(userId, date, entry);
      setLoadError("");
      setLoadAttempt((attempt) => attempt + 1);
      setDraft(EMPTY_DRAFT);
      setEstimated(false);
      setSaveNotice("Food saved.");
      submitted.current = null;
    } catch {
      setFormError("Couldn't save this food. Your input is still here. Try saving again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {loadError ? (
        <div className="rounded-xl border border-line bg-surface p-4 text-sm">
          <p role="alert">{loadError}</p>
          <button
            type="button"
            className="mt-2 font-bold text-mint"
            onClick={() => { setLoadError(""); setLoadAttempt((attempt) => attempt + 1); }}
          >
            Retry
          </button>
        </div>
      ) : entries ? (
        <DailyNutrients entries={entries} targets={targets} />
      ) : (
        <p role="status" className="rounded-xl bg-surface p-4 text-sm text-zinc-300">Loading food entries…</p>
      )}

      <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-extrabold">Log a food</h2>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-bold text-mint focus-within:outline-2 focus-within:outline-mint has-disabled:cursor-not-allowed has-disabled:opacity-50">
            <Camera size={17} aria-hidden="true" />
            Take photo
            <input
              aria-describedby="diet-photo-help"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => void handlePhoto(event)}
              disabled={saving || analyzing}
            />
          </label>
        </div>
        <p id="diet-photo-help" className="text-xs text-zinc-400">
          Enter values for the whole serving, or send a photo to Gemini for an estimate.
        </p>
        {analyzing && <p role="status" className="text-sm text-mint">Analyzing photo…</p>}
        {estimated && <p role="status" className="text-sm text-mint">Review the estimated serving and nutrients before saving.</p>}

        <fieldset disabled={saving || analyzing} className="space-y-3 disabled:opacity-60">
          <label className="block text-sm font-semibold">
            Food name
            <input className={inputClass} value={draft.food_name} maxLength={120} required onChange={(event) => update("food_name", event.target.value)} />
          </label>
          <label className="block text-sm font-semibold">
            Serving size
            <input className={inputClass} value={draft.serving_size} placeholder="e.g. 1 bowl or 150 g" maxLength={80} required onChange={(event) => update("serving_size", event.target.value)} />
          </label>
          <label className="block text-sm font-semibold">
            Calories (kcal)
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              min={0}
              max={10_000}
              step={0.01}
              required
              value={draft.calories_kcal}
              onChange={(event) => update("calories_kcal", event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {DIET_NUTRIENTS.map(([key, label]) => (
              <label key={key} className="block text-sm font-semibold">
                {label} (g)
                <input
                  className={inputClass}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={10_000}
                  step={0.01}
                  required
                  value={draft[key]}
                  onChange={(event) => update(key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </fieldset>
        {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
        {saveNotice && <p role="status" className="text-sm text-mint">{saveNotice}</p>}
        <button
          type="submit"
          disabled={saving || analyzing}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save food"}
        </button>
      </form>

      {entries && (
        <section aria-labelledby="diet-entries-heading" className="space-y-3">
          <h2 id="diet-entries-heading" className="font-extrabold">Logged food</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-400">No food logged for this day.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-line bg-surface p-3">
                  <p className="text-sm font-bold">{entry.food_name}</p>
                  <p className="text-xs text-zinc-400">{entry.serving_size}</p>
                  <p className="mt-1 text-xs text-zinc-300">
                    {entry.calories_kcal === null
                      ? "Calories not recorded"
                      : `${formatAmount.format(entry.calories_kcal)} kcal`}
                  </p>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-xs min-[370px]:grid-cols-4">
                    {DIET_NUTRIENTS.map(([key, label]) => (
                      <div key={key}>
                        <dt className="text-zinc-400">{label}</dt>
                        <dd>{formatAmount.format(entry[key])} g</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

export default function DietPage() {
  const { session } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const goal = useProtocolStore((state) => state.goal);
  const body = useProtocolStore((state) => state.body);
  const trainingDays = useProtocolStore((state) => state.trainingDays);
  const plan = useProtocolStore((state) => state.plan);
  const date = dateKey(selectedDate);

  return (
    <main className="min-h-screen space-y-4 bg-canvas px-3 pb-8 pt-5 text-white">
      <WeekCalendar
        heading={(
          <div className="flex items-center gap-3">
            <Soup size={24} className="text-[#88F9C0]" aria-hidden="true" />
            <h1 className="text-3xl font-extrabold">DIET</h1>
          </div>
        )}
        selectedDate={selectedDate}
        today={startOfDay(new Date())}
        onSelectDate={setSelectedDate}
      />
      {session && (
        <DietDay
          key={`${session.user.id}:${date}`}
          date={date}
          userId={session.user.id}
          token={session.access_token}
          targets={getDietTargets({ goal, body, trainingDays, plan })}
        />
      )}
    </main>
  );
}
