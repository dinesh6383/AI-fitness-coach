import { useState } from "react";
import { connectCoach } from "../lib/coachApi";
import { useProtocolStore } from "../store/Useprotocolstore";

export function useCoachConnection() {
  const connected = useProtocolStore((s) => s.coachConnected);
  const setCoachConnected = useProtocolStore((s) => s.setCoachConnected);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    setError(null);
    const result = await connectCoach();
    if (result.ok) setCoachConnected(true);
    else setError(result.message);
    setConnecting(false);
  };

  const disconnect = () => {
    setCoachConnected(false);
    setError(null);
  };

  return { connected, connecting, error, connect, disconnect };
}
