"use client";

import clsx from "clsx";
import { memo } from "react";

interface Props {
  onClick:   () => void;
  running?:  boolean;
  disabled?: boolean;
}

export const RunTestButton = memo(function RunTestButton({
  onClick, running = false, disabled = false,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={running}
      className={clsx("run-btn-inline", disabled && "is-disabled")}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      <span className="hidden sm:inline">{running ? "Running…" : "Run test suite"}</span>
      <span className="sm:hidden">{running ? "…" : "Run"}</span>
    </button>
  );
});
