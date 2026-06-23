"use client";

import { memo } from "react";
import clsx from "clsx";

interface Props {
  variant?: "landing" | "app";
  size?: number;
  className?: string;
}

export const Logo = memo(function Logo({ variant = "app", size = 22, className }: Props) {
  const stroke = variant === "landing" ? "#b86a2a" : "#10d9a0";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="1.5" y="3.5" width="19" height="4" rx="1.4" stroke={stroke} strokeWidth="1.3" />
      <rect x="4" y="9.5" width="14" height="4" rx="1.4" stroke={stroke} strokeWidth="1.3" opacity="0.6" />
      <rect x="7" y="15.5" width="8" height="3" rx="1.4" stroke={stroke} strokeWidth="1.3" opacity="0.3" />
    </svg>
  );
});
