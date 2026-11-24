// Calorie-burn estimator: asks Gemini how many kcal the logged sets burned.
// The API key lives only here, on the server, and never reaches the browser bundle.

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.8-flash"; // override with GEMINI_MODEL (a Flash-Lite model is cheaper)
const MAX_KCAL_PER_EXERCISE = 600; // anything above this is treated as a bad answer

type LoggedSet = { weight: number | null; reps: number };
type ExerciseInput = {
  id: string;
  name: string;
  restSec: number;
  sets: LoggedSet[];
};
type Input = { weightKg: number; exercises: ExerciseInput[] };

type Reply =
  | { ok: true; items: { id: string; kcal: number }[]; total: number }
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

/** Never trust the browser: check every field, and keep only safe characters in names. */
function parseInput(body: unknown): Input | null {
  if (typeof body !== "object" || body === null) return null;
  const { weightKg, exercises } = body as {
    weightKg?: unknown;
    exercises?: unknown;
  };

  if (!isNumber(weightKg) || weightKg < 20 || weightKg > 400) return null;
  if (
    !Array.isArray(exercises) ||
    exercises.length < 1 ||
    exercises.length > 20
  )
    return null;

  const seen = new Set<string>();
  const parsed: ExerciseInput[] = [];

  for (const raw of exercises) {
    if (typeof raw !== "object" || raw === null) return null;
    const e = raw as {
      id?: unknown;
      name?: unknown;
      restSec?: unknown;
      sets?: unknown;
    };

    if (
      typeof e.id !== "string" ||
      !/^[a-z0-9-]{1,60}$/.test(e.id) ||
      seen.has(e.id)
    )
      return null;
    seen.add(e.id);

    const name =
      typeof e.name === "string"
        ? e.name
            .replace(/[^\p{L}\p{N} '&()-]/gu, "")
            .trim()
            .slice(0, 60)
        : "";
    if (!name) return null;

    const restSec = isNumber(e.restSec)
      ? Math.min(600, Math.max(0, e.restSec))
      : 60;

    if (!Array.isArray(e.sets) || e.sets.length < 1 || e.sets.length > 20)
      return null;
    const sets: LoggedSet[] = [];
    for (const s of e.sets) {
      if (typeof s !== "object" || s === null) return null;
      const { weight, reps } = s as { weight?: unknown; reps?: unknown };
      if (!isNumber(reps) || !Number.isInteger(reps) || reps < 1 || reps > 100)
        return null;
      if (weight !== null && (!isNumber(weight) || weight < 0 || weight > 1000))
        return null;
      sets.push({ weight: weight as number | null, reps });
    }

    parsed.push({ id: e.id, name, restSec, sets });
  }

  return { weightKg, exercises: parsed };
}

function buildPrompt({ weightKg, exercises }: Input): string {
  const blocks = exercises.map((e, i) => {
    const sets = e.sets
      .map(
        (s, j) =>
          `   Set ${j + 1}: ${s.weight === null ? "bodyweight" : `${s.weight} kg`} x ${s.reps} reps`,
      )
      .join("\n");
    return `${i + 1}. id=${e.id} | ${e.name} | about ${e.restSec}s rest between sets\n${sets}`;
  });

  return [
    "You are a sports-science assistant. Estimate the active calories (kcal) burned while",
    "performing each resistance-training exercise below, including the rest between its sets.",
    `The person weighs ${weightKg} kg.`,
    "",
    "Exercises:",
    ...blocks,
    "",
    "Rules:",
    "- Be realistic. A typical exercise of three sets burns tens of kcal, not hundreds.",
    "- Use whole numbers.",
    "- Reply with JSON only, in exactly this shape, with one entry per exercise and the ids as given:",
    '{"items":[{"id":"<id>","kcal":<integer>}]}',
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

/** Checks the model's answer and returns one whole-number kcal value per requested id. */
function readItems(
  parsed: unknown,
  ids: string[],
): { id: string; kcal: number }[] | null {
  const items = (parsed as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return null;

  const byId = new Map<string, number>();
  for (const item of items) {
    const { id, kcal } = (item ?? {}) as { id?: unknown; kcal?: unknown };
    if (
      typeof id !== "string" ||
      !isNumber(kcal) ||
      kcal < 0 ||
      kcal > MAX_KCAL_PER_EXERCISE
    ) {
      return null;
    }
    byId.set(id, Math.round(kcal));
  }

  if (ids.some((id) => !byId.has(id))) return null;
  return ids.map((id) => ({ id, kcal: byId.get(id) as number }));
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
  const apiKey =
    process.env.GEMINI_API_KEY;
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
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(25_000),
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

  const items = readItems(
    extractJson(text),
    input.exercises.map((e) => e.id),
  );
  if (!items) return reply({ ok: false, error: "bad_output" }, 502);

  return reply({
    ok: true,
    items,
    total: items.reduce((sum, i) => sum + i.kcal, 0),
  });
}
