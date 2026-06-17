"use client";

import clsx from "clsx";
import { useAppShell } from "@/lib/appShell";

interface Props {
  className?: string;
}

export function ShellControlsToggle({ className }: Props) {
  const { controlsOpen, toggleControls } = useAppShell();

  return (
    <button
      type="button"
      className={clsx("btn btn-outline shell-controls-toggle lg:hidden", className)}
      aria-label={controlsOpen ? "Close configuration" : "Open configuration"}
      aria-expanded={controlsOpen}
      onClick={toggleControls}
    >
      Configuration
    </button>
  );
}
