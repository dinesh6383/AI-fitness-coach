export type GenerateInput = {
  weightKg: number;
  targetWeightKg: number;
  goal:
    | "gain_weight_build_muscle"
    | "lose_weight_build_muscle"
    | "maintain_weight_build_muscle";
  experience: "beginner" | "intermediate" | "advanced";
  splitName: string;
  days: { dayIndex: number; title: string }[];
  library: { id: string; name: string; category: string; muscles: string[] }[];
};

export type GenerateResult =
  | { ok: true; days: { dayIndex: number; exerciseIds: string[] }[] }
  | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  offline: "Cannot reach the local AI endpoint. Check that Vite is running.",
  no_proxy:
    "The /api/generate endpoint is unavailable. Check api/generate.ts and restart Vite.",
  not_configured: "Set GEMINI_API_KEY in .env.local and restart Vite.",
  invalid_key: "Gemini rejected the API key. Check GEMINI_API_KEY.",
  invalid_input: "Some onboarding information is missing or invalid.",
  rate_limited: "Gemini quota or rate limit reached. Try again later.",
  model_not_found: "Gemini model not found. Check GEMINI_MODEL.",
  bad_output: "Gemini returned an invalid workout plan. Try generating again.",
  upstream_error: "Gemini could not generate a workout. Try again shortly.",
  server_error: "The local API encountered an error. Check your Vite terminal.",
  model_overloaded:
    "Gemini is experiencing high demand. Please try again in a few minutes.",
};

export async function generatePlan(
  input: GenerateInput,
): Promise<GenerateResult> {
  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, message: MESSAGES.offline };
  }
  let data: {
    ok?: boolean;
    days?: { dayIndex: number; exerciseIds: string[] }[];
    error?: string;
  } | null;
  try {
    data = await response.json();
  } catch {
    return { ok: false, message: MESSAGES.no_proxy };
  }
  if (response.ok && data?.ok && Array.isArray(data.days))
    return { ok: true, days: data.days };
  return {
    ok: false,
    message: MESSAGES[data?.error ?? ""] ?? MESSAGES.upstream_error,
  };
}
