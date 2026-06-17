"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { ShellControlsToggle } from "@/components/ShellNavToggle";
import { PrimaryNav } from "@/components/PrimaryNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { RunPhase } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  phase:      RunPhase;
  progress:   number;
  total:      number;
  keyCount:   number;
  onOpenKeys: () => void;
}

function useLatency() {
  const [ms, setMs] = useState<number | null>(null);
  const [ok, setOk] = useState(true);
  useEffect(() => {
    let c = false;
    async function ping() {
      const t = performance.now();
      try {
        await fetch(`${API_BASE}/health`, { cache: "no-store" });
        if (!c) { setMs(Math.round(performance.now() - t)); setOk(true); }
      } catch {
        if (!c) { setMs(null); setOk(false); }
      }
    }
    ping();
    const id = setInterval(ping, 12_000);
    return () => { c = true; clearInterval(id); };
  }, []);
  return { ms, ok };
}

export function Topbar({ phase, progress, total, keyCount, onOpenKeys }: Props) {
  const { ms, ok } = useLatency();
  const host = API_BASE.replace(/^https?:\/\//, "");
  const isRunning = phase === "running" || phase === "starting";
  const isDone    = phase === "done";
  const isErr     = phase === "error";

  return (
    <header className="ge-topbar">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        <PrimaryNav />
        <ShellControlsToggle />

        <div className="topbar-host-chip hidden lg:flex">
          <span className={clsx("status", ok ? "status-green" : "status-red")}>
            {ok ? "Online" : "Offline"}
          </span>
          <span className="text-t-4">·</span>
          <span className="truncate max-w-[160px]">{host}</span>
          {ms !== null && (
            <>
              <span className="text-t-4">·</span>
              <span className="data-cell-teal">{ms}ms</span>
            </>
          )}
        </div>

        {phase !== "idle" && (
          <div className={clsx(
            "topbar-phase-chip hidden sm:flex",
            isRunning && "topbar-phase-running",
            isDone    && "topbar-phase-done",
            isErr     && "topbar-phase-error",
          )}>
            {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)] animate-pulse-dot" />}
            {isDone && "✓ "}
            {isErr  && "✕ "}
            <span>
              {phase === "starting"    && "Starting…"}
              {phase === "running"     && (total > 0 ? `${progress} / ${total}` : "Running")}
              {phase === "summarizing" && "Summarizing…"}
              {phase === "done"        && "Done"}
              {phase === "error"       && "Error"}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 topbar-actions-compact shrink-0">
        <ThemeToggle />
        <button type="button" onClick={onOpenKeys} className="btn btn-outline btn-sm relative min-w-11">
          API keys
          {keyCount > 0 && (
            <span className="badge-count">{keyCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}
