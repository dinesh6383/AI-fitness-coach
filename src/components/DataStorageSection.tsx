import { Download, Lock, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadWorkoutsJson } from "../lib/ExportData";
import { useProtocolStore } from "../store/useProtocolStore";
import SectionLabel from "./SectionLabel";

export default function DataStorageSection() {
  const navigate = useNavigate();
  const [exported, setExported] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const exportTimer = useRef<number | undefined>(undefined);
  const confirmTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(exportTimer.current);
      window.clearTimeout(confirmTimer.current);
    },
    [],
  );

  const handleExport = () => {
    const { goal, body, trainingDays, plan } = useProtocolStore.getState();
    downloadWorkoutsJson({ goal, body, trainingDays, plan });
    setExported(true);
    window.clearTimeout(exportTimer.current);
    exportTimer.current = window.setTimeout(() => setExported(false), 2000);
  };

  // First tap asks for confirmation, second tap (within 4s) clears everything
  const handleClear = () => {
    if (!confirming) {
      setConfirming(true);
      confirmTimer.current = window.setTimeout(
        () => setConfirming(false),
        4000,
      );
      return;
    }
    window.clearTimeout(confirmTimer.current);
    useProtocolStore.getState().reset();
    useProtocolStore.persist.clearStorage();
    navigate("/", { replace: true });
  };

  return (
    <section className="space-y-3">
      <SectionLabel
        title="Data & Storage"
        right={<Lock size={14} className="text-zinc-500" />}
      />

      <button
        type="button"
        onClick={handleExport}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface p-4 text-sm font-bold transition-colors hover:border-zinc-600 focus-visible:outline-2 focus-visible:outline-brand-soft"
      >
        <Download size={16} className="text-brand-soft" />
        {exported ? "Exported" : "Export Workouts as JSON"}
      </button>

      <button
        type="button"
        onClick={handleClear}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-surface p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-rose-300 ${
          confirming
            ? "border-rose-400/60"
            : "border-line hover:border-zinc-600"
        }`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-rose-300">
            {confirming
              ? "Tap again to confirm reset"
              : "Clear Local Cache & Reset"}
          </span>
          <span className="block text-xs text-zinc-400" aria-live="polite">
            {confirming
              ? "This clears your plan and settings and restarts setup."
              : "Purges offline workout history from browser DB"}
          </span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-300">
          <Trash2 size={16} />
        </span>
      </button>
    </section>
  );
}
