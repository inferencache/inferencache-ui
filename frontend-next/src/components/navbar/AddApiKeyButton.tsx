"use client";

import { memo } from "react";

interface Props {
  onClick: () => void;
}

export const AddApiKeyButton = memo(function AddApiKeyButton({ onClick }: Props) {
  return (
    <button type="button" onClick={onClick} className="top-btn top-btn-warn hidden sm:inline-flex">
      Add API key
    </button>
  );
});
