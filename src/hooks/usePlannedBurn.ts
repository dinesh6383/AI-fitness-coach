import { useEffect, useState } from "react";
import type { SessionItem } from "../components/SessionCard";
import { plannedExercises, plannedSignature } from "../lib/burn";
import { estimateBurn, type BurnResult } from "../lib/burnApi";
import { dateKey } from "../lib/Today";
import { useProtocolStore } from "../store/Useprotocolstore";

// Shared across renders so React Strict Mode's double effect doesn't send two requests
const inflight = new Map<string, Promise<BurnResult>>();

/**
 * Gemini's estimate of calories for the whole planned session. It runs once per day
 * and per plan, and the result is cached in the store.
 */
export function usePlannedBurn(items: SessionItem[], weightKg: number) {
  const date = dateKey();
  const planned = useProtocolStore((s) => s.plannedBurn);
  const setPlannedBurn = useProtocolStore((s) => s.setPlannedBurn);
  const [attempt, setAttempt] = useState(0);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  const signature = items.length ? plannedSignature(weightKg, items) : "";
  const cached =
    planned && planned.date === date && planned.signature === signature
      ? planned.kcal
      : null;

  useEffect(() => {
    if (!signature || cached !== null) return;
    let cancelled = false;

    let request = inflight.get(signature);
    if (!request) {
      request = estimateBurn(weightKg, plannedExercises(items)).finally(() =>
        inflight.delete(signature),
      );
      inflight.set(signature, request);
    }

    request.then((result) => {
      if (cancelled) return;
      if (result.ok) setPlannedBurn({ date, signature, kcal: result.total });
      else setFailedFor(signature);
    });

    return () => {
      cancelled = true;
    };
    // `signature` already captures everything about `items` and `weightKg` that matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, cached, attempt, date]);

  const status: "idle" | "loading" | "error" =
    !signature || cached !== null
      ? "idle"
      : failedFor === signature
        ? "error"
        : "loading";

  const retry = () => {
    setFailedFor(null);
    setAttempt((n) => n + 1);
  };

  return { kcal: cached, status, retry };
}
