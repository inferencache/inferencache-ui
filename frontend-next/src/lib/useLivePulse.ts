import { useEffect, useRef, useState } from "react";

/** Brief pulse flag when a live counter grows (charts, etc.). */
export function useLivePulse(length: number, live: boolean, holdMs = 1400) {
  const [pulse, setPulse] = useState(false);
  const prevLen = useRef(length);

  useEffect(() => {
    if (!live) {
      prevLen.current = length;
      setPulse(false);
      return;
    }

    if (length > prevLen.current) {
      setPulse(true);
      const timer = window.setTimeout(() => setPulse(false), holdMs);
      prevLen.current = length;
      return () => window.clearTimeout(timer);
    }

    prevLen.current = length;
  }, [length, live, holdMs]);

  return pulse;
}
