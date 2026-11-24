import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthProvider";
import { retryWorkoutSync, useWorkoutSyncStore } from "../lib/sync";

export default function ProtectedRoute() {
  const {
    session,
    loading,
    onboardingStatus,
    onboardingError,
    refreshOnboarding,
  } = useAuth();

  const location = useLocation();
  const hasPendingLogs = useWorkoutSyncStore((state) => {
    const pending = session && state.pending[session.user.id];
    return Boolean(pending && Object.keys(pending).length);
  });

  if (loading || (session && onboardingStatus === "checking")) {
    return (
      <div className="grid min-h-screen place-items-center" role="status">
        <span className="size-2 animate-pulse rounded-full bg-brand" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (onboardingStatus === "error") {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-bold">Couldn't load your profile</h1>
          <p role="alert" className="text-sm text-red-400">
            {onboardingError}
          </p>
          <button
            onClick={() => void refreshOnboarding().catch(() => {})}
            className="rounded-xl bg-brand px-6 py-3 font-bold"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const isBuilder = location.pathname.startsWith("/builder/");
  const completed = onboardingStatus === "complete";

  if (!completed && !isBuilder) {
    return <Navigate to="/builder/schedule" replace />;
  }

  if (completed && isBuilder) {
    return <Navigate to="/today" replace />;
  }

  return (
    <>
      {hasPendingLogs && (
        <aside className="flex items-center justify-between gap-3 bg-surface px-4 py-2 text-sm">
          <p role="status">Workout changes are waiting to sync.</p>
          <button
            type="button"
            className="shrink-0 rounded-lg px-3 py-2 font-bold text-brand"
            onClick={() => void retryWorkoutSync(session.user.id)}
          >
            Retry sync
          </button>
        </aside>
      )}
      <Outlet />
    </>
  );
}
