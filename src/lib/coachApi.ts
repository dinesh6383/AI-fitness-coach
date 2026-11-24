export type CoachResult =
  | { ok: true; model: string }
  | { ok: false; message: string };

export type NextSetRecommendation = {
  weight: number | null;
  reps: number;
  reason: string;
  source: "gemini" | "local";
};

export type RecommendNextSetInput = {
  exercise: string;
  targetReps: number;
  sets: {
    weight: number | null;
    reps: number;
    done: boolean;
    rpe?: number | null;
  }[];
};

const MESSAGES: Record<string, string> = {
  offline: "You appear to be offline. Check your connection and try again.",

  no_proxy:
    "The coach server isn't running. Start the app with npm run dev, or deploy the api folder.",

  not_configured:
    "The coach server has no API key. Add GEMINI_API_KEY to .env.local and restart.",

  invalid_key: "Gemini rejected the API key. Check GEMINI_API_KEY.",

  rate_limited: "Gemini request limit reached. Try again in a minute.",

  upstream_error: "Gemini could not be reached. Try again shortly.",
};

async function callCoach(action: "connect"): Promise<CoachResult> {
  let response: Response;

  try {
    response = await fetch("/api/coach", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
  } catch {
    return {
      ok: false,
      message: MESSAGES.offline,
    };
  }

  // eslint-disable-next-line no-useless-assignment
  let data: {
    ok?: boolean;
    model?: string;
    error?: string;
  } | null = null;

  try {
    data = await response.json();
  } catch {
    return {
      ok: false,
      message: MESSAGES.no_proxy,
    };
  }

  if (data?.ok) {
    return {
      ok: true,
      model: data.model ?? "gemini",
    };
  }

  return {
    ok: false,
    message: MESSAGES[data?.error ?? ""] ?? MESSAGES.upstream_error,
  };
}

export async function recommendNextSet(
  input: RecommendNextSetInput,
): Promise<NextSetRecommendation> {
  let response: Response;

  try {
    response = await fetch("/api/coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "recommend",
        input,
      }),
    });
  } catch {
    throw new Error("Unable to reach AI Coach. Check your connection.");
  }

  let data: {
    ok?: boolean;
    error?: string;
    recommendation?: NextSetRecommendation;
  };

  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid response from the AI Coach server.");
  }

  if (!response.ok || !data.ok || !data.recommendation) {
    throw new Error(
      data.error === "not_configured"
        ? "Gemini API key is not configured."
        : "AI Coach is unavailable. Try again later.",
    );
  }

  return data.recommendation;
}

export const connectCoach = () => callCoach("connect");
