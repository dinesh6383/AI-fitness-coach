import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";
import { hydrateFromSupabase, retryWorkoutSync } from "./sync";
import { hasCompletedOnboarding } from "./profileStatus";
import { useProtocolStore } from "../store/useProtocolStore";

type OnboardingStatus = "checking" | "complete" | "incomplete" | "error";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  onboardingStatus: OnboardingStatus;
  onboardingError: string | null;
  refreshOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState<{
    userId: string | null;
    status: OnboardingStatus;
    error: string | null;
  }>({
    userId: null,
    status: "checking",
    error: null,
  });

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Session restore failed", error);
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        useProtocolStore.getState().reset();
      }
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;

    let active = true;
    const retry = () => void retryWorkoutSync(userId);
    window.addEventListener("online", retry);

    const check = async () => {
      try {
        const completed = await hasCompletedOnboarding(userId);
        if (!active) return;

        setOnboarding({
          userId,
          status: completed ? "complete" : "incomplete",
          error: null,
        });

        if (completed) {
          try {
            await hydrateFromSupabase(userId, () => active);
          } catch (error) {
            console.error("Couldn't load saved data", error);
          }
          if (active) retry();
        }
      } catch (error) {
        if (!active) return;

        setOnboarding({
          userId,
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Unable to check your profile.",
        });
      }
    };

    void check();

    return () => {
      active = false;
      window.removeEventListener("online", retry);
    };
  }, [userId]);

  const refreshOnboarding = async () => {
    if (!userId) throw new Error("Not signed in");

    setOnboarding({
      userId,
      status: "checking",
      error: null,
    });

    try {
      const completed = await hasCompletedOnboarding(userId);

      setOnboarding({
        userId,
        status: completed ? "complete" : "incomplete",
        error: null,
      });
    } catch (error) {
      setOnboarding({
        userId,
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Unable to check your profile.",
      });
      throw error;
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      onboardingStatus:
        onboarding.userId === userId ? onboarding.status : "checking",
      onboardingError: onboarding.userId === userId ? onboarding.error : null,
      refreshOnboarding,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, loading, onboarding, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
