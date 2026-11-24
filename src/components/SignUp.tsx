import { ArrowRight, Lock, Mail, MailCheck } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../lib/AuthProvider";
import { supabase } from "../lib/supabase";

// Keep these password rules identical to the sign-in page
const signUpSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Add at least one uppercase letter")
      .regex(/[a-z]/, "Add at least one lowercase letter")
      .regex(/[0-9]/, "Add at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

type Field = "email" | "password" | "confirmPassword";

const friendlyAuthError = (message: string) => {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "An account with this email already exists. Try signing in.";
  if (m.includes("password") && m.includes("weak"))
    return "That password is too weak. Try a longer one.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("fetch") || m.includes("network"))
    return "Can't reach the server. Check your connection.";
  return "Something went wrong. Please try again.";
};

// 16px (text-base) stops iOS Safari from zooming in when an input is focused
const inputClass =
  "w-full rounded-xl border bg-surface px-4 py-3.5 font-mono text-base text-white placeholder:text-zinc-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

const labelClass =
  "mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when Supabase needs the user to confirm their email before signing in
  const [confirmEmailSentTo, setConfirmEmailSentTo] = useState<string | null>(
    null,
  );

  const navigate = useNavigate();
  const {
    session,
    loading: authLoading,
    onboardingStatus,
    onboardingError,
    refreshOnboarding,
  } = useAuth();

  // First error message per field (empty object when everything is valid)
  const { isValid, errors } = useMemo(() => {
    const result = signUpSchema.safeParse({
      email,
      password,
      confirmPassword,
    });
    const errs: Partial<Record<Field, string>> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0] as Field;
        if (!errs[key]) errs[key] = issue.message;
      }
    }
    return { isValid: result.success, errors: errs };
  }, [email, password, confirmPassword]);

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));

  const emailError = touched.email ? errors.email : undefined;
  const passwordError = touched.password ? errors.password : undefined;
  // Once the user has typed a confirmation, show a mismatch straight away
  const confirmError =
    touched.confirmPassword || confirmPassword
      ? password !== confirmPassword && confirmPassword
        ? "Passwords don't match"
        : touched.confirmPassword
          ? errors.confirmPassword
          : undefined
      : undefined;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setTouched({ email: true, password: true, confirmPassword: true });
      return;
    }
    setError(null);
    setLoading(true);
    const cleanEmail = email.trim();
    const { data, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/builder/schedule`,
      },
    });
    setLoading(false);

    if (authError) {
      setError(friendlyAuthError(authError.message));
      return;
    }

    // With email confirmation on, Supabase returns a fake success for an
    // address that is already registered: the user has no identities.
    if (data.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists. Try signing in.");
      return;
    }

    if (data.session) {
      navigate("/builder/schedule", { replace: true }); // confirmation is off: signed in
    } else {
      setConfirmEmailSentTo(cleanEmail); // confirmation is on: check inbox
    }
  };

  // Already signed in: skip the form
  if (!authLoading && session) {
    if (onboardingStatus === "complete") {
      return <Navigate to="/today" replace />;
    }

    if (onboardingStatus === "incomplete") {
      return <Navigate to="/builder/schedule" replace />;
    }

    if (onboardingStatus === "checking") {
      return (
        <main role="status" className="grid min-h-screen place-items-center">
          Checking your profile…
        </main>
      );
    }

    if (onboardingStatus === "error") {
      return (
        <main className="grid min-h-screen place-items-center px-5">
          <div className="space-y-4 text-center">
            <p role="alert" className="text-sm text-red-400">
              {onboardingError}
            </p>
            <button
              type="button"
              onClick={() => void refreshOnboarding().catch(() => {})}
              className="rounded-xl bg-brand px-6 py-3 font-bold"
            >
              Retry
            </button>
          </div>
        </main>
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      {/* Brand */}
      <p className="flex items-center gap-1.5 font-mono text-lg font-bold uppercase tracking-[0.2em]">
        AI Coach
        <span className="size-1.5 rounded-full bg-brand shadow-[0_0_8px] shadow-brand" />
      </p>

      {confirmEmailSentTo ? (
        <section className="mt-10 space-y-4" role="status" aria-live="polite">
          <div className="grid size-12 place-items-center rounded-xl bg-mint/15 text-mint">
            <MailCheck size={22} aria-hidden="true" />
          </div>
          <h1 className="text-4xl font-extrabold leading-tight">
            Check your inbox.
          </h1>
          <p className="font-mono text-xs leading-relaxed text-zinc-400">
            We sent a confirmation link to{" "}
            <span className="font-bold text-white">{confirmEmailSentTo}</span>.
            Open it to activate your account, then sign in.
          </p>
          <Link
            to="/signin"
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-brand py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-brand/40 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft"
          >
            Go to Sign In
          </Link>
        </section>
      ) : (
        <>
          {/* Heading */}
          <header className="mt-10">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-brand-soft">
              Sign Up
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight">
              Create account.
            </h1>
            <p className="mt-2 font-mono text-xs text-zinc-400">
              Start building your protocol.
            </p>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className={labelClass}>
                <Mail size={13} aria-hidden="true" />
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => touch("email")}
                placeholder="you@example.com"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
                className={`${inputClass} ${emailError ? "border-red-400/70" : "border-line focus:border-brand"}`}
              />
              {emailError && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-2 text-xs text-red-400"
                >
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                <Lock size={13} aria-hidden="true" />
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => touch("password")}
                placeholder="Create a password"
                aria-invalid={!!passwordError}
                aria-describedby="password-hint password-error"
                className={`${inputClass} ${passwordError ? "border-red-400/70" : "border-line focus:border-brand"}`}
              />
              <p
                id="password-hint"
                className="mt-2 font-mono text-[10px] text-zinc-500"
              >
                8+ characters with upper, lower case and a number.
              </p>
              {passwordError && (
                <p
                  id="password-error"
                  role="alert"
                  className="mt-1 text-xs text-red-400"
                >
                  {passwordError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                <Lock size={13} aria-hidden="true" />
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => touch("confirmPassword")}
                placeholder="Re-enter your password"
                aria-invalid={!!confirmError}
                aria-describedby={confirmError ? "confirm-error" : undefined}
                className={`${inputClass} ${confirmError ? "border-red-400/70" : "border-line focus:border-brand"}`}
              />
              {confirmError && (
                <p
                  id="confirm-error"
                  role="alert"
                  className="mt-2 text-xs text-red-400"
                >
                  {confirmError}
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full rounded-xl bg-brand py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] shadow-lg shadow-brand/40 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          {/* Sign in */}
          <div className="mt-0 pt-10">
            <div className="rounded-xl border border-line bg-surface px-4 py-5 text-center font-mono text-[11px] text-zinc-300">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="inline-flex items-center gap-1 font-bold text-brand-soft transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-brand-soft"
              >
                Sign in
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
