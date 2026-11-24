// Workout-plan generator: asks Gemini to fill each training day with exercises from the app's library.
// The API key lives only here, on the server, and never reaches the browser bundle.

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.8-flash"; // override with GEMINI_MODEL
const MIN_PER_DAY = 3; // fewer than this is treated as a bad answer
const MAX_PER_DAY = 8; // extra exercises beyond this are dropped

const EXPERIENCE = ["beginner", "intermediate", "advanced"] as const;
type Experience = (typeof EXPERIENCE)[number];

type DayInput = { dayIndex: number; title: string };
type LibraryItem = {
  id: string;
  name: string;
  category: string;
  muscles: string[];
};
type Input = {
  weightKg: number;
  experience: Experience;
  splitName: string;
  days: DayInput[];
  library: LibraryItem[];
};

type Reply =
  | { ok: true; days: { dayIndex: number; exerciseIds: string[] }[] }
  | { ok: false; error: string };

const reply = (body: Reply, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Keeps only safe characters, so text from the browser can't smuggle instructions into the prompt. */
const clean = (value: unknown, max: number): string =>
  typeof value === "string"
    ? value
        .replace(/[^\p{L}\p{N} '&()/,.+-]/gu, "")
        .trim()
        .slice(0, max)
    : "";

/** Never trust the browser: check every field. */
function parseInput(body: unknown): Input | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as {
    weightKg?: unknown;
    experience?: unknown;
    splitName?: unknown;
    days?: unknown;
    library?: unknown;
  };

  if (!isNumber(b.weightKg) || b.weightKg < 20 || b.weightKg > 400) return null;
  if (!EXPERIENCE.includes(b.experience as Experience)) return null;
  const splitName = clean(b.splitName, 40);
  if (!splitName) return null;

  // Training days
  if (!Array.isArray(b.days) || b.days.length < 1 || b.days.length > 7)
    return null;
  const seenDays = new Set<number>();
  const days: DayInput[] = [];
  for (const raw of b.days) {
    if (typeof raw !== "object" || raw === null) return null;
    const { dayIndex, title } = raw as { dayIndex?: unknown; title?: unknown };
    if (
      !isNumber(dayIndex) ||
      !Number.isInteger(dayIndex) ||
      dayIndex < 0 ||
      dayIndex > 6
    )
      return null;
    if (seenDays.has(dayIndex)) return null;
    seenDays.add(dayIndex);
    const cleanTitle = clean(title, 40);
    if (!cleanTitle) return null;
    days.push({ dayIndex, title: cleanTitle });
  }

  // The exercise library the AI is allowed to pick from
  if (
    !Array.isArray(b.library) ||
    b.library.length < 6 ||
    b.library.length > 200
  )
    return null;
  const seenIds = new Set<string>();
  const library: LibraryItem[] = [];
  for (const raw of b.library) {
    if (typeof raw !== "object" || raw === null) return null;
    const e = raw as {
      id?: unknown;
      name?: unknown;
      category?: unknown;
      muscles?: unknown;
    };
    if (
      typeof e.id !== "string" ||
      !/^[a-z0-9-]{1,60}$/.test(e.id) ||
      seenIds.has(e.id)
    )
      return null;
    seenIds.add(e.id);
    const name = clean(e.name, 60);
    const category = clean(e.category, 40);
    if (!name || !category) return null;
    const muscles = Array.isArray(e.muscles)
      ? e.muscles
          .slice(0, 6)
          .map((m) => clean(m, 30))
          .filter(Boolean)
      : [];
    library.push({ id: e.id, name, category, muscles });
  }

  return {
    weightKg: b.weightKg,
    experience: b.experience as Experience,
    splitName,
    days,
    library,
  };
}

function buildPrompt(input: Input): string {
  const days = input.days.map((d) => `- dayIndex ${d.dayIndex}: ${d.title}`);
  const library = input.library.map(
    (e) => `${e.id} | ${e.name} | ${e.category} | ${e.muscles.join(", ")}`,
  );

  return [
    "You are an experienced strength and hypertrophy coach. Build a one-week training plan.",
    "",
    `Lifter: ${input.experience}, ${input.weightKg} kg.`,
    `Split: ${input.splitName}.`,
    "Training days (use exactly these dayIndex values; 0 = Monday ... 6 = Sunday):",
    ...days,
    "",
    "Exercise library. Use ONLY these ids (format: id | name | category | muscles):",
    ...library,
    "",
    "Rules:",
    "- Give each day 4 to 6 exercises (closer to 4 for a beginner).",
    "- Match each day to its title: for example Push = chest, shoulders and triceps; Pull = back and biceps;",
    "  Legs = quads, hamstrings, glutes and core; Upper / Lower = that half of the body; Full Body = one main lift per region.",
    "- Put compound lifts first and isolation work last.",
    "- When a focus repeats (for example Push Day 1 and Push Day 2), vary the exercises between those days.",
    "- Suit the lifter: simpler, more stable movements for a beginner; more free-weight variety for an advanced lifter.",
    "- Use body weight only where it affects suitability, such as heavy bodyweight movements.",
    "- No exercise may appear twice on the same day.",
    "- Reply with JSON only, in exactly this shape, with one entry for every training day listed:",
    '{"days":[{"dayIndex":<number>,"exerciseIds":["<id>","<id>"]}]}',
  ].join("\n");
}

/** Pulls the JSON object out of the model's text, even if it is wrapped in code fences. */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Checks the model's answer. Unknown and repeated ids are dropped, extras are trimmed,
 * and the answer is rejected if any requested day is missing or ends up too short.
 */
function readDays(
  parsed: unknown,
  input: Input,
): { dayIndex: number; exerciseIds: string[] }[] | null {
  const raw = (parsed as { days?: unknown } | null)?.days;
  if (!Array.isArray(raw)) return null;

  const allowed = new Set(input.library.map((e) => e.id));
  const byDay = new Map<number, string[]>();

  for (const item of raw) {
    const { dayIndex, exerciseIds } = (item ?? {}) as {
      dayIndex?: unknown;
      exerciseIds?: unknown;
    };
    if (!isNumber(dayIndex) || !Array.isArray(exerciseIds)) continue;
    const ids: string[] = [];
    for (const id of exerciseIds) {
      if (typeof id === "string" && allowed.has(id) && !ids.includes(id))
        ids.push(id);
    }
    byDay.set(dayIndex, ids.slice(0, MAX_PER_DAY));
  }

  const result: { dayIndex: number; exerciseIds: string[] }[] = [];
  for (const day of input.days) {
    const ids = byDay.get(day.dayIndex);
    if (!ids || ids.length < MIN_PER_DAY) return null;
    result.push({ dayIndex: day.dayIndex, exerciseIds: ids });
  }
  return result;
}

/** Maps Gemini's HTTP status to a short code the app understands. */
function upstreamError(status: number, message: string): Response {
  if (status === 401 || status === 403)
    return reply({ ok: false, error: "invalid_key" }, 401);
  if (status === 400 && /api key/i.test(message))
    return reply({ ok: false, error: "invalid_key" }, 401);
  if (status === 402) return reply({ ok: false, error: "no_credits" }, 402);
  if (status === 404)
    return reply({ ok: false, error: "model_not_found" }, 502);
  if (status === 429) return reply({ ok: false, error: "rate_limited" }, 429);
  return reply({ ok: false, error: "upstream_error" }, 502);
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return reply({ ok: false, error: "not_configured" }, 500);

  const input = parseInput(await request.json().catch(() => null));
  if (!input) return reply({ ok: false, error: "bad_request" }, 400);

  const configured = process.env.GEMINI_MODEL;
  const model =
    configured && /^[a-z0-9.-]+$/.test(configured) ? configured : DEFAULT_MODEL;

  let upstream: Response;
  try {
    upstream = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.6,
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    return reply({ ok: false, error: "network" }, 502);
  }

  if (!upstream.ok) {
    const detail = (await upstream.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return upstreamError(upstream.status, detail?.error?.message ?? "");
  }

  const data = (await upstream.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";

  const days = readDays(extractJson(text), input);
  if (!days) return reply({ ok: false, error: "bad_output" }, 502);

  return reply({ ok: true, days });
}
