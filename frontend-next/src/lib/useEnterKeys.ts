import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 500;

/**
 * Applies an enter class the first time each key appears (for fade-in).
 * Rows are never hidden while waiting — each new key animates independently.
 */
export function useEnterKeys(
  keys: string[],
  resetDep?: string | null,
  options?: {
    enabled?: boolean;
    durationMs?: number;
    enterClass?: string;
  },
) {
  const {
    enabled = true,
    durationMs = DEFAULT_DURATION_MS,
    enterClass = "is-entering",
  } = options ?? {};

  const seenRef = useRef(new Set<string>());
  const timersRef = useRef(new Map<string, number>());
  const [entering, setEntering] = useState<ReadonlySet<string>>(() => new Set());

  const clearTimers = useCallback(() => {
    for (const id of Array.from(timersRef.current.values())) {
      window.clearTimeout(id);
    }
    timersRef.current.clear();
  }, []);

  const startEnter = useCallback(
    (key: string) => {
      setEntering((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(Array.from(prev));
        next.add(key);
        return next;
      });

      const existing = timersRef.current.get(key);
      if (existing != null) window.clearTimeout(existing);

      timersRef.current.set(
        key,
        window.setTimeout(() => {
          timersRef.current.delete(key);
          setEntering((prev) => {
            if (!prev.has(key)) return prev;
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }, durationMs),
      );
    },
    [durationMs],
  );

  useEffect(() => {
    seenRef.current.clear();
    clearTimers();
    setEntering(new Set());
  }, [resetDep, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!enabled) {
      for (const key of keys) seenRef.current.add(key);
      clearTimers();
      setEntering(new Set());
      return;
    }

    for (const key of keys) {
      if (seenRef.current.has(key)) continue;
      seenRef.current.add(key);
      startEnter(key);
    }
  }, [keys, enabled, startEnter, clearTimers]);

  return useCallback(
    (key: string) => (enabled && entering.has(key) ? enterClass : ""),
    [enabled, entering, enterClass],
  );
}
