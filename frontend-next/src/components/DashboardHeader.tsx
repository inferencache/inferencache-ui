"use client";

import Link from "next/link";
import clsx from "clsx";
import { memo, useEffect, useState } from "react";
import { ShellControlsToggle } from "@/components/ShellNavToggle";
import { fmtCost } from "@/lib/api";
import type { LiveStats, RunPhase } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Tab = "live" | "analytics" | "tuning";

interface Props {
  activeTab:    Tab;
  onTabChange:  (tab: Tab) => void;
  phase:        RunPhase;
  progress:     number;
  total:        number;
  keyCount:     number;
  stats:        LiveStats;
  chartUrl?:    string;
  hasChart?:    boolean;
  onOpenKeys:   () => void;
  running?:     boolean;
  keysReady?:   boolean;
  onRun?:       () => void;
  onClear?:     () => void;
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

function MetricCell({
  label, value, sub, tone,
}: {
  label: string; value: string; sub: string; tone?: "green" | "amber" | "purple";
}) {
  return (
    <div className="mc">
      <div className="mc-label">{label}</div>
      <div className={clsx("mc-val", tone && `v-${tone}`)}>{value}</div>
      <div className="mc-sub">{sub}</div>
    </div>
  );
}

export const DashboardHeader = memo(function DashboardHeader({
  activeTab,
  onTabChange,
  phase,
  progress,
  total,
  keyCount,
  stats,
  chartUrl,
  hasChart = false,
  onOpenKeys,
  running = false,
  keysReady = false,
  onRun,
  onClear,
}: Props) {
  const { ms, ok } = useLatency();
  const host = API_BASE.replace(/^https?:\/\//, "");
  const isRunning = phase === "running" || phase === "starting";
  const isDone    = phase === "done";
  const isErr     = phase === "error";
  const hasRunData = stats.total > 0;
  const hitPct = hasRunData
    ? `${Math.round((stats.hits / stats.total) * 100)}%`
    : "—";

  return (
    <header className="dashboard-main-header">
      <div className="topbar">
        <ShellControlsToggle className="topbar-mobile-toggle lg:hidden" />

        <nav className="top-tabs" aria-label="Main tabs">
          <button
            type="button"
            className={clsx("top-tab", activeTab === "live" && "active")}
            onClick={() => onTabChange("live")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Cache testing
          </button>
          <Link href="/db" className="top-tab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Saved runs
          </Link>
        </nav>

        {phase !== "idle" && (
          <div className={clsx(
            "topbar-phase-chip hidden sm:flex text-[11px] px-2 py-1 rounded-md border",
            isRunning && "border-[var(--green)] text-[var(--green)]",
            isDone && "border-[var(--green)] text-[var(--green)]",
            isErr && "border-[var(--red)] text-[var(--red)]",
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
        )}

        <div className="topbar-right">
          {activeTab === "live" && onRun && (
            <>
              {!keysReady && (
                <button type="button" onClick={onOpenKeys} className="top-btn top-btn-warn hidden sm:inline-flex">
                  Add API key
                </button>
              )}
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  disabled={running}
                  className="top-btn hidden sm:inline-flex disabled:opacity-35"
                  title="Clear cache for the selected model"
                >
                  Clear cache
                </button>
              )}
              <button
                type="button"
                onClick={onRun}
                disabled={running || !keysReady}
                aria-busy={running}
                className={clsx("run-btn-inline", (running || !keysReady) && "is-disabled")}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {running ? "Running…" : "Run test suite"}
              </button>
            </>
          )}

          <div className="ping-chip">
            <span className={clsx("sidebar-live-dot", ok && "is-live", !ok && "is-offline")} />
            {host}
            {ms !== null && (
              <>
                <span className="ping-sep">·</span>
                <span>{ms}ms</span>
              </>
            )}
          </div>

          {chartUrl && hasChart && (
            <a href={chartUrl} target="_blank" rel="noopener noreferrer" className="top-btn hidden md:inline-flex">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              chart-output.com
            </a>
          )}

          <button type="button" onClick={onOpenKeys} className="top-btn relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            API keys
            {keyCount > 0 && <span className="badge-count">{keyCount}</span>}
          </button>
        </div>
      </div>

      <div className="mstrip" aria-label="Current run statistics">
        <MetricCell label="Total calls" value={hasRunData ? stats.total.toLocaleString() : "0"} sub="this run" />
        <MetricCell label="Hit rate" value={hitPct} sub={`${stats.hits} hits · ${stats.misses} misses`} tone={hasRunData ? "green" : undefined} />
        <MetricCell label="Exact hits" value={hasRunData ? String(stats.exact) : "0"} sub="SHA-256 match" tone={stats.exact > 0 ? "green" : undefined} />
        <MetricCell label="Semantic hits" value={hasRunData ? String(stats.semantic) : "0"} sub="embedding match" tone={stats.semantic > 0 ? "amber" : undefined} />
        <MetricCell label="Tokens saved" value={hasRunData ? stats.tokens_saved.toLocaleString() : "0"} sub="via cache" tone={stats.tokens_saved > 0 ? "purple" : undefined} />
        <MetricCell label="Cost saved" value={stats.cost_saved > 0 ? fmtCost(stats.cost_saved) : "—"} sub="vs all-API" tone={stats.cost_saved > 0 ? "green" : undefined} />
      </div>
    </header>
  );
});

export type { Tab as DashboardTab };
