import { GOALS } from "./goals";
import { buildProfileSummary } from "./Profile";
import { foodSchema, MAX_DIET_PHOTO_BYTES, type Food, type NutrientKey } from "./dietNutrition";
import { supabase } from "./supabase";

const FOOD_COLUMNS = "id,food_name,serving_size,calories_kcal,protein_g,carbs_g,fat_g,fibre_g";
export type DietTargets = Record<NutrientKey | "calories_kcal", number>;
export type DietEntry = Omit<Food, "calories_kcal"> & { id: string; calories_kcal: number | null };

export function getDietTargets(profile: Parameters<typeof buildProfileSummary>[0]) {
  const split = GOALS.find((option) => option.id === profile.goal)?.metabolic?.macros;
  const weight = profile.body.currentWeight;
  if (!split || weight == null || !Number.isFinite(weight) || weight <= 0) return null;

  const { kcal, protein } = buildProfileSummary(profile);
  const remainingCalories = Math.max(0, kcal - protein * 4);
  const splitTotal = split.carb + split.fat;

  return {
    calories_kcal: kcal,
    protein_g: protein,
    carbs_g: Math.round((remainingCalories * split.carb) / splitTotal / 4),
    fat_g: Math.round((remainingCalories * split.fat) / splitTotal / 9),
    fibre_g: Math.round((kcal * 14) / 1000),
  } satisfies DietTargets;
}

export async function loadDietEntries(userId: string, date: string, signal?: AbortSignal) {
  const query = supabase.from("diet_entries").select(FOOD_COLUMNS)
    .eq("user_id", userId).eq("log_date", date).order("created_at");
  const { data, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return data as DietEntry[];
}

export async function saveDietEntry(userId: string, date: string, entry: Food & { id: string }) {
  const { error } = await supabase.from("diet_entries").upsert(
    { ...entry, user_id: userId, log_date: date },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

async function preparePhoto(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Couldn't prepare this photo.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const photo = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!photo || photo.size > MAX_DIET_PHOTO_BYTES) {
      throw new Error("This photo is too large to analyze. Try another photo.");
    }
    return photo;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function analyzeFoodPhoto(file: File, token: string, signal: AbortSignal) {
  const photo = await preparePhoto(file).catch((error: unknown) => {
    if (error instanceof DOMException) {
      throw new Error("Couldn't open this photo. Try a JPEG or PNG.");
    }
    throw error;
  });
  const response = await fetch("/api/diet-photo", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg" },
    body: photo,
    signal,
  });

  if (response.status === 422) {
    throw new Error("Couldn't identify a single food. Try a closer photo or enter it manually.");
  }
  if (response.status === 429) {
    throw new Error("Gemini's photo analysis quota has been reached. Try again later or enter the food manually.");
  }
  if (!response.ok) {
    throw new Error("Couldn't analyze the photo. Try again or enter the food manually.");
  }
  const result = foodSchema.safeParse(await response.json());
  if (!result.success) throw new Error("Couldn't read the estimate. Enter the food manually.");
  return result.data;
}
