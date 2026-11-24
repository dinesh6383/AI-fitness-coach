import { supabase } from "./supabase";

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to check onboarding status: ${error.message}`);
  }

  return data !== null;
}
