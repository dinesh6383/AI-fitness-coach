import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  const currentUserId = useRef<string | null>(null);
  const loadVersion = useRef(0);

  useEffect(() => {
    let active = true;
    const updateSession = (next: Session | null) => {
      const nextUserId = next?.user.id ?? null;
      if (currentUserId.current !== nextUserId) {
        currentUserId.current = nextUserId;
        loadVersion.current += 1;
      }
      setSession(next);
      setLoading(false);
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Session restore failed", error);
      updateSession(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (event === "SIGNED_OUT") {
        useProtocolStore.getState().reset();
      }
      updateSession(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  const refreshOnboarding = useCallback(async () => {
    if (!userId || currentUserId.current !== userId) {
      throw new Error("Not signed in");
    }

    const version = ++loadVersion.current;
    const isCurrent = () =>
      currentUserId.current === userId && loadVersion.current === version;

    setOnboarding({ userId, status: "checking", error: null });

    let completed = false;
    try {
      completed = await hasCompletedOnboarding(userId);
      if (!isCurrent()) return;

      if (completed) await hydrateFromSupabase(userId, isCurrent);
      if (!isCurrent()) return;

      setOnboarding({
        userId,
        status: completed ? "complete" : "incomplete",
        error: null,
      });
    } catch (error) {
      if (!isCurrent()) return;

      console.error("Couldn't load account data", error);
      setOnboarding({
        userId,
        status: "error",
        error: completed
          ? "Couldn't load your saved workout plan and logs. Please try again."
          : "Couldn't check your profile. Please try again.",
      });
      throw error;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    queueMicrotask(() => {
      if (active) void refreshOnboarding().catch(() => {});
    });
    return () => {
      active = false;
      loadVersion.current += 1;
    };
  }, [userId, refreshOnboarding]);

  const onboardingStatus =
    onboarding.userId === userId ? onboarding.status : "checking";

  useEffect(() => {
    if (!userId || onboardingStatus !== "complete") return;

    const retry = () => void retryWorkoutSync(userId);
    retry();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [userId, onboardingStatus]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      onboardingStatus,
      onboardingError: onboarding.userId === userId ? onboarding.error : null,
      refreshOnboarding,
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      },
    }),
    [session, loading, onboarding, onboardingStatus, userId, refreshOnboarding],
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
