"use client";

import { memo } from "react";

interface Props {
  onClick:   () => void;
  keyCount?: number;
}

export const ApiKeysButton = memo(function ApiKeysButton({ onClick, keyCount = 0 }: Props) {
  return (
    <button type="button" onClick={onClick} className="top-btn relative">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
      <span className="hidden sm:inline">API keys</span>
      {keyCount > 0 && <span className="badge-count">{keyCount}</span>}
    </button>
  );
});
