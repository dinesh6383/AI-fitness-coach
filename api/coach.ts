import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const CONNECT_MODEL =
  process.env.GEMINI_MODEL ?? env.GEMINI_MODEL ?? "gemini-2.5-flash";

type Reply =
  | { ok: true; model: string }
  | {
      ok: true;
      recommendation: {
        weight: number | null;
        reps: number;
        reason: string;
        source: "gemini" | "local";
      };
    }
  | { ok: false; error: string };

type WorkoutSet = {
  weight: number | null;
  reps: number;
  done: boolean;
  rpe?: number | null;
};

type RecommendInput = {
  exercise: string;
  targetReps: number;
  sets: WorkoutSet[];
};

type Recommendation = {
  weight: number | null;
  reps: number;
  reason: string;
  source: "gemini" | "local";
};

const reply = (body: Reply, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

/** Sends a small request to Gemini to verify the API key and connectivity. */
async function connect(apiKey: string): Promise<Response> {
  let upstream: Response;

  try {
    upstream = await fetch(`${GEMINI_URL}/${CONNECT_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: "Reply with the single word: ready" }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 16,
        },
      }),
    });
  } catch {
    return reply({ ok: false, error: "network" }, 502);
  }

  if (!upstream.ok) {
    const detail = (await upstream.json().catch(() => null)) as {
      error?: {
        message?: string;
        status?: string;
      };
    } | null;

    const message = detail?.error?.message?.toLowerCase() ?? "";
    const status = detail?.error?.status?.toLowerCase() ?? "";

    if (
      upstream.status === 401 ||
      upstream.status === 403 ||
      message.includes("api key") ||
      status.includes("permission_denied")
    ) {
      return reply({ ok: false, error: "invalid_key" }, 401);
    }

    if (
      upstream.status === 429 ||
      message.includes("quota") ||
      message.includes("rate limit")
    ) {
      return reply({ ok: false, error: "rate_limited" }, 429);
    }

    return reply({ ok: false, error: "upstream_error" }, 502);
  }

  return reply({ ok: true, model: CONNECT_MODEL });
}

async function recommend(apiKey: string, rawInput: unknown): Promise<Response> {
  if (!rawInput || typeof rawInput !== "object") {
    return reply({ ok: false, error: "invalid_input" }, 400);
  }

  const input = rawInput as Partial<RecommendInput>;

  if (
    typeof input.exercise !== "string" ||
    !input.exercise.trim() ||
    input.exercise.length > 120 ||
    !Number.isInteger(input.targetReps) ||
    (input.targetReps ?? 0) < 1 ||
    (input.targetReps ?? 0) > 30 ||
    !Array.isArray(input.sets) ||
    input.sets.length === 0 ||
    input.sets.length > 20
  ) {
    return reply({ ok: false, error: "invalid_input" }, 400);
  }

  const validSets = input.sets.every(
    (set) =>
      set != null &&
      typeof set.done === "boolean" &&
      Number.isInteger(set.reps) &&
      set.reps >= 0 &&
      set.reps <= 100 &&
      (set.weight === null ||
        (typeof set.weight === "number" &&
          Number.isFinite(set.weight) &&
          set.weight >= 0 &&
          set.weight <= 1000)) &&
      (set.rpe == null ||
        (Number.isInteger(set.rpe) && set.rpe >= 1 && set.rpe <= 10)),
  );

  if (!validSets) {
    return reply({ ok: false, error: "invalid_input" }, 400);
  }

  const completed = input.sets.filter((set) => set.done);

  if (completed.length === 0) {
    return reply({ ok: false, error: "no_completed_sets" }, 400);
  }

  const last = completed[completed.length - 1];

  const fallback: Recommendation = {
    weight: last.weight,
    reps: Math.max(1, Math.min(input.targetReps!, last.reps || 1)),
    reason:
      "Maintain your previous load and adjust repetitions based on fatigue and technique.",
    source: "local",
  };

  const prompt = `
You are an AI strength training assistant.

Exercise: ${JSON.stringify(input.exercise)}
Target repetitions: ${input.targetReps}

Completed workout sets:
${JSON.stringify(completed)}

Recommend the NEXT set.

RPE is measured from 1 to 10.
Higher RPE means greater effort.

Rules:
- Prioritize safe, gradual progression.
- Consider fatigue, repetitions and RPE.
- Do not increase weight when RPE is 8 or higher.
- Do not increase weight when RPE is missing.
- Never encourage training through pain.
- Keep the explanation short.
- Return only JSON with these fields:
  weight: number or null
  reps: integer from 1 to 30
  reason: string, maximum 180 characters
`;

  try {
    const upstream = await fetch(
      `${GEMINI_URL}/${CONNECT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 350,
          },
        }),
      },
    );

    if (!upstream.ok) {
      console.error("Gemini recommendation failed:", upstream.status);

      return reply({
        ok: true,
        recommendation: fallback,
      });
    }

    const data = (await upstream.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("");

    if (!text) {
      return reply({
        ok: true,
        recommendation: fallback,
      });
    }

    const parsed: unknown = JSON.parse(text);

    if (!parsed || typeof parsed !== "object") {
      return reply({
        ok: true,
        recommendation: fallback,
      });
    }

    const result = parsed as {
      weight?: unknown;
      reps?: unknown;
      reason?: unknown;
    };

    if (
      !Number.isInteger(result.reps) ||
      (result.reps as number) < 1 ||
      (result.reps as number) > 30 ||
      typeof result.reason !== "string" ||
      result.reason.length > 180 ||
      (result.weight !== null &&
        (typeof result.weight !== "number" ||
          !Number.isFinite(result.weight) ||
          result.weight < 0 ||
          result.weight > 1000))
    ) {
      return reply({
        ok: true,
        recommendation: fallback,
      });
    }

    const proposedWeight = result.weight as number | null;

    let safeWeight: number | null;

    if (last.weight === null) {
      safeWeight = null;
    } else {
      const maxWeight =
        last.rpe == null || last.rpe >= 8 ? last.weight : last.weight * 1.05;

      safeWeight = Math.min(proposedWeight ?? last.weight, maxWeight);
    }

    return reply({
      ok: true,
      recommendation: {
        weight: safeWeight,
        reps: result.reps as number,
        reason: result.reason,
        source: "gemini",
      },
    });
  } catch (error) {
    console.error(
      "Gemini recommendation exception:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return reply({
      ok: true,
      recommendation: fallback,
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY;

  if (!apiKey) {
    return reply({ ok: false, error: "not_configured" }, 500);
  }

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    input?: unknown;
  } | null;

  switch (body?.action) {
    case "connect":
      return connect(apiKey);

    case "recommend":
      return recommend(apiKey, body.input);

    default:
      return reply({ ok: false, error: "unknown_action" }, 400);
  }
}
