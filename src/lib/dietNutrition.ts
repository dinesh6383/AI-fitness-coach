import { z } from "zod";

export const DIET_NUTRIENTS = [
  ["protein_g", "Protein", "bg-mint"],
  ["carbs_g", "Carbs", "bg-brand-soft"],
  ["fat_g", "Fats", "bg-amber-400"],
  ["fibre_g", "Fibre", "bg-sky-400"],
] as const;

export type NutrientKey = (typeof DIET_NUTRIENTS)[number][0];

const grams = z.number().min(0).max(10_000);
export const foodSchema = z.object({
  food_name: z.string().trim().min(1).max(120),
  serving_size: z.string().trim().min(1).max(80),
  calories_kcal: z.number().min(0).max(10_000),
  protein_g: grams,
  carbs_g: grams,
  fat_g: grams,
  fibre_g: grams,
});

export type Food = z.infer<typeof foodSchema>;
export const MAX_DIET_PHOTO_BYTES = 1_500_000;
