import { useState } from "react";
import { useAuth } from "../lib/AuthProvider";
import { ChevronRight, LogOut, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CoachConnectCard from "../components/CoachConnectCard";
import DataStorageSection from "../components/DataStorageSection";
import ProfileCard from "../components/ProfileCard";
import { useCoachConnection } from "../hooks/useCoachConnection";
import {
  APP_BUILD,
  APP_NAME,
  APP_VERSION,
  buildProfileSummary,
} from "../lib/Profile";
import { useProtocolStore } from "../store/Useprotocolstore";

export default function ProfilePage() {
  const navigate = useNavigate();
  const goal = useProtocolStore((s) => s.goal);
  const body = useProtocolStore((s) => s.body);
  const trainingDays = useProtocolStore((s) => s.trainingDays);
  const plan = useProtocolStore((s) => s.plan);
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const coach = useCoachConnection();

  const summary = buildProfileSummary({ goal, body, trainingDays, plan });

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut(); // also clears the local store (see AuthProvider)
      navigate("/signin", { replace: true });
    } catch {
      setSignOutError("Couldn't sign out. Please try again.");
      setSigningOut(false);
    }
  };

  return (
    <main className="space-y-5 px-5 pt-6">
      <ProfileCard summary={summary} onEdit={() => navigate("/profile/edit")} />

      <CoachConnectCard
        connected={coach.connected}
        connecting={coach.connecting}
        error={coach.error}
        onConnect={coach.connect}
        onDisconnect={coach.disconnect}
      />

      <button
        type="button"
        onClick={() => navigate("/profile/coach")}
        className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-zinc-600 focus-visible:outline-2 focus-visible:outline-brand-soft"
      >
        <span className="flex items-center gap-3 text-sm font-bold">
          <SlidersHorizontal size={18} className="text-brand-soft" />
          Coach Settings &amp; Connection
        </span>
        <ChevronRight size={18} className="text-zinc-400" />
      </button>

      <DataStorageSection />

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-4 text-sm font-bold text-red-400 transition-colors hover:border-red-400/50 focus-visible:outline-2 focus-visible:outline-brand-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut size={16} aria-hidden="true" />
          {signingOut ? "Signing out…" : "Sign Out"}
        </button>
        {signOutError && (
          <p role="alert" className="text-center text-xs text-red-400">
            {signOutError}
          </p>
        )}
      </div>

      <footer className="space-y-2 px-2 pt-2 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-bold">
          <span className="size-2 rounded-full bg-mint" />
          {APP_NAME} {APP_VERSION} (Build {APP_BUILD})
        </p>
        <p className="text-xs leading-relaxed text-zinc-500">
          Zero cloud tracking. All workout logs and physiological biomarkers
          remain exclusively in your local storage engine.
        </p>
      </footer>
    </main>
  );
}
