import { loadEnv } from "vite";
import { z } from "zod";

const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
const MODEL =
  process.env.GEMINI_MODEL ?? env.GEMINI_MODEL ?? "gemini-2.5-flash";
const KEY = process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY;

const inputSchema = z.object({
  weightKg: z.number().positive().max(500),
  targetWeightKg: z.number().positive().max(500),
  goal: z.enum([
    "gain_weight_build_muscle",
    "lose_weight_build_muscle",
    "maintain_weight_build_muscle",
  ]),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  splitName: z.string().min(1).max(100),
  days: z
    .array(
      z.object({
        dayIndex: z.number().int().min(0).max(6),
        title: z.string().min(1).max(100),
      }),
    )
    .min(1)
    .max(7),
  library: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        name: z.string().min(1).max(120),
        category: z.string().max(80),
        muscles: z.array(z.string().max(80)).max(12),
      }),
    )
    .min(4)
    .max(500),
});

const outputSchema = z.object({
  days: z.array(
    z.object({ dayIndex: z.number().int(), exerciseIds: z.array(z.string()) }),
  ),
});

const responseSchema = {
  type: "OBJECT",
  properties: {
    days: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          dayIndex: { type: "INTEGER" },
          exerciseIds: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["dayIndex", "exerciseIds"],
      },
    },
  },
  required: ["days"],
};

function reply(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchGeminiWithRetry(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, options);

    if (![429, 503].includes(response.status) || attempt === MAX_ATTEMPTS - 1) {
      return response;
    }

    const delay = 2000 * Math.pow(2, attempt) + Math.random() * 1000;

    console.warn(
      `Gemini returned ${response.status}. ` +
        `Retrying in ${Math.round(delay)}ms...`,
    );

    await sleep(delay);
  }

  throw new Error("Gemini retry attempts exhausted");
}

export async function POST(request: Request): Promise<Response> {
  if (!KEY) return reply({ ok: false, error: "not_configured" }, 500);
  const raw = await request.json().catch(() => null);
  const checked = inputSchema.safeParse(raw);
  if (!checked.success)
    return reply({ ok: false, error: "invalid_input" }, 400);
  const input = checked.data;
  if (
    new Set(input.days.map((d) => d.dayIndex)).size !== input.days.length ||
    new Set(input.library.map((e) => e.id)).size !== input.library.length
  ) {
    return reply({ ok: false, error: "invalid_input" }, 400);
  }

  const prompt = `You are an experienced strength coach designing a balanced weekly gym workout plan.
Return JSON only, following the required schema.
Rules:
- Return EXACTLY one entry for EACH requested dayIndex. Do not add days.
- Choose 4 to 8 DIFFERENT exercise IDs per day, using ONLY IDs from the catalog.
- Respect each day's focus, the split, training frequency, experience and fitness goal.
- For push days prioritize chest/shoulders/triceps; pull days back/rear delts/biceps; leg days lower body.
- For full body days distribute movement patterns. Avoid excessive overlap and account for recovery between sessions.
- Put major compound exercises first, then accessories, then isolation.
- For beginners avoid advanced lifts and favor manageable technique.
- Vary exercise selection between repeated training focuses.
User: ${JSON.stringify({ weightKg: input.weightKg, targetWeightKg: input.targetWeightKg, goal: input.goal, experience: input.experience, splitName: input.splitName })}
Days: ${JSON.stringify(input.days)}
Exercise catalog (id | name | category | muscles):
${input.library.map((e) => `${e.id} | ${e.name} | ${e.category} | ${e.muscles.join(", ")}`).join("\n")}`;

  let upstream: Response;
  try {
    upstream = await fetchGeminiWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": KEY },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
      },
    );
  } catch {
    return reply({ ok: false, error: "upstream_error" }, 502);
  }

  if (!upstream.ok) {
    const details = (await upstream.json().catch(() => null)) as {
      error?: {
        code?: number;
        message?: string;
        status?: string;
      };
    } | null;

    console.error("Gemini generation failed:", {
      model: MODEL,
      httpStatus: upstream.status,
      googleError: details?.error,
    });

    const message = details?.error?.message?.toLowerCase() ?? "";

    const error =
      upstream.status === 503
        ? "model_overloaded"
        : upstream.status === 404
          ? "model_not_found"
          : upstream.status === 429 || message.includes("quota")
            ? "rate_limited"
            : upstream.status === 401 ||
                upstream.status === 403 ||
                message.includes("api key")
              ? "invalid_key"
              : "upstream_error";

    return reply(
      {
        ok: false,
        error,
        model: MODEL,
        details: details?.error?.message ?? "No details returned",
      },
      upstream.status === 404 ? 404 : 502,
    );
  }

  try {
    const payload = (await upstream.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("");
    if (!text) return reply({ ok: false, error: "bad_output" }, 502);
    const parsed = outputSchema.parse(JSON.parse(text));
    const allowed = new Set(input.library.map((e) => e.id));
    const expected = new Set(input.days.map((d) => d.dayIndex));
    if (
      parsed.days.length !== input.days.length ||
      new Set(parsed.days.map((d) => d.dayIndex)).size !== parsed.days.length ||
      parsed.days.some(
        (d) =>
          !expected.has(d.dayIndex) ||
          d.exerciseIds.length < 4 ||
          d.exerciseIds.length > 8 ||
          new Set(d.exerciseIds).size !== d.exerciseIds.length ||
          d.exerciseIds.some((id) => !allowed.has(id)),
      )
    ) {
      return reply({ ok: false, error: "bad_output" }, 502);
    }
    return reply({ ok: true, days: parsed.days });
  } catch {
    return reply({ ok: false, error: "bad_output" }, 502);
  }
}
