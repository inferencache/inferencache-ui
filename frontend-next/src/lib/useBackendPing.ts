"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function useBackendPing() {
  const [ms, setMs] = useState<number | null>(null);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      const t = performance.now();
      try {
        await fetch(`${API_BASE}/health`, { cache: "no-store" });
        if (!cancelled) {
          setMs(Math.round(performance.now() - t));
          setOk(true);
        }
      } catch {
        if (!cancelled) {
          setMs(null);
          setOk(false);
        }
      }
    }

    ping();
    const id = setInterval(ping, 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const host = API_BASE.replace(/^https?:\/\//, "");
  return { ms, ok, host };
}
