export type BurnExercise = {
  id: string;
  name: string;
  restSec: number;
  sets: { weight: number | null; reps: number }[];
};

export type BurnResult =
  | { ok: true; items: { id: string; kcal: number }[]; total: number }
  | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  offline: "You appear to be offline. Check your connection and try again.",
  no_proxy:
    "The AI server isn't running. Start the app with npm run dev, or deploy the api folder.",
  not_configured:
    "The AI server has no API key. Add GEMINI_API_KEY to .env.local and restart.",
  invalid_key: "Google rejected the Gemini API key. Check GEMINI_API_KEY.",
  rate_limited: "Too many AI requests right now. Try again in a minute.",
  no_credits: "Your Gemini account has no available credits.",
  model_not_found: "That Gemini model was not found. Check GEMINI_MODEL.",
  bad_output: "The AI returned an answer we could not use. Try again.",
  upstream_error: "The AI could not be reached. Try again shortly.",
};

/** Asks the server (and through it, Gemini) how many kcal these logged sets burned. */
export async function estimateBurn(
  weightKg: number,
  exercises: BurnExercise[],
): Promise<BurnResult> {
  let response: Response;
  try {
    response = await fetch("/api/burn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ weightKg, exercises }),
    });
  } catch {
    return { ok: false, message: MESSAGES.offline };
  }

  // eslint-disable-next-line no-useless-assignment
  let data: {
    ok?: boolean;
    items?: { id: string; kcal: number }[];
    total?: number;
    error?: string;
  } | null = null;
  try {
    data = await response.json();
  } catch {
    // Not JSON: the request never reached the server (for example a 404 page)
    return { ok: false, message: MESSAGES.no_proxy };
  }

  if (data?.ok && Array.isArray(data.items) && typeof data.total === "number") {
    return { ok: true, items: data.items, total: data.total };
  }
  return {
    ok: false,
    message: MESSAGES[data?.error ?? ""] ?? MESSAGES.upstream_error,
  };
}
