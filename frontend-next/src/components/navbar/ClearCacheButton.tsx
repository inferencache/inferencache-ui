"use client";

import { memo } from "react";

interface Props {
  onClick:   () => void;
  disabled?: boolean;
}

export const ClearCacheButton = memo(function ClearCacheButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="top-btn hidden sm:inline-flex disabled:opacity-35"
      title="Clear cache for the selected model"
    >
      Clear cache
    </button>
  );
});
