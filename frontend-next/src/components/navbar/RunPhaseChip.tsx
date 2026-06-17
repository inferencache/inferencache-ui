"use client";

import clsx from "clsx";
import { memo } from "react";
import type { RunPhase } from "@/types";

interface Props {
  phase:    RunPhase;
  progress: number;
  total:    number;
}

export const RunPhaseChip = memo(function RunPhaseChip({ phase, progress, total }: Props) {
  if (phase === "idle") return null;

  const isRunning = phase === "running" || phase === "starting";
  const isDone    = phase === "done";
  const isErr     = phase === "error";

  return (
    <div className={clsx(
      "app-navbar-phase hidden md:flex",
      isRunning && "is-running",
      isDone && "is-done",
      isErr && "is-error",
    )}>
      {isRunning && <span className="sidebar-live-dot is-live" />}
      <span>
        {phase === "starting"    && "Starting…"}
        {phase === "running"     && (total > 0 ? `${progress} / ${total}` : "Running")}
        {phase === "summarizing" && "Summarizing…"}
        {phase === "done"        && "Done"}
        {phase === "error"       && "Error"}
      </span>
    </div>
  );
});
