import { Bot, Loader2, Unplug, Zap } from "lucide-react";
import SectionLabel from "./SectionLabel";

type Props = {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export default function CoachConnectCard({
  connected,
  connecting,
  error,
  onConnect,
  onDisconnect,
}: Props) {
  return (
    <section>
      <SectionLabel
        title="Smart AI Coach Connection"
        right={
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
              connected
                ? "border-mint/30 bg-mint/10 text-mint"
                : "border-line bg-surface text-zinc-400"
            }`}
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
        }
      />

      <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
        <div className="flex gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/20 text-brand-soft">
            <Bot size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold">AI Workout Assistant</h3>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-line px-2.5 py-1 text-[10px] font-bold text-zinc-400">
                <span
                  className={`size-1.5 rounded-full ${connected ? "bg-mint" : "bg-zinc-500"}`}
                />
                {connected ? "Online" : "Offline"}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Powers automatic weight adjustments, smart rest timers, and
              exercise swaps.
            </p>
          </div>
        </div>

        {connected ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas/60 py-3.5 text-sm font-bold text-zinc-300 transition-colors hover:border-zinc-600 focus-visible:outline-2 focus-visible:outline-brand-soft"
          >
            <Unplug size={15} />
            Disconnect AI Coach
          </button>
        ) : (
          <button
            type="button"
            disabled={connecting}
            onClick={onConnect}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold shadow-lg shadow-brand/30 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft disabled:cursor-wait disabled:opacity-60"
          >
            {connecting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Zap size={15} />
            )}
            {connecting ? "Connecting…" : "Connect AI Coach"}
          </button>
        )}

        {error && (
          <p role="alert" className="text-xs leading-relaxed text-rose-300">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
