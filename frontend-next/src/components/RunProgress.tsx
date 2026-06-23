"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { InfoTip } from "@/components/InfoTip";
import { TIPS } from "@/lib/tooltips";
import type { RunPhase, TimelinePoint } from "@/types";

interface Props {
  phase:           RunPhase;
  progress:        number;
  total:           number;
  timerStartedAt:  number | null;
  elapsedMs:       number;
  etaMs:           number | null;
  runId:           string | null;
  timeline:        TimelinePoint[];
  viewingSavedRun?: boolean;
  runError?:       string | null;
}

function fmtDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const PHASE_LABEL: Record<RunPhase, string> = {
  idle:        "Idle",
  starting:    "Starting…",
  running:     "Running",
  summarizing: "Summarizing…",
  done:        "Done",
  error:       "Error",
};

function useLiveElapsed(timerStartedAt: number | null, frozenElapsed: number) {
  const [live, setLive] = useState(frozenElapsed);

  useEffect(() => {
    if (!timerStartedAt) {
      setLive(frozenElapsed);
      return;
    }
    const tick = () => setLive(Date.now() - timerStartedAt);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timerStartedAt, frozenElapsed]);

  return live;
}

function useTimelineCsvUrl(timeline: TimelinePoint[], active: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!active || timeline.length === 0) return;
    const rows = [
      "call,type,latency_ms,cost_usd,tokens",
      ...timeline.map((p) => [
        p.idx + 1,
        p.type,
        (p.hit_ms ?? p.miss_ms ?? 0).toFixed(1),
        p.cost.toFixed(8),
        p.tokens,
      ].join(",")),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv" });
    const blobUrl = URL.createObjectURL(blob);
    setUrl(blobUrl);
    return () => URL.revokeObjectURL(blobUrl);
  }, [active, timeline]);

  return url;
}

export function RunProgress({
  phase, progress, total, timerStartedAt, elapsedMs, etaMs, runId, timeline,
  viewingSavedRun = false, runError,
}: Props) {
  const csvUrl = useTimelineCsvUrl(timeline, phase === "done");
  const displayElapsed = useLiveElapsed(timerStartedAt, elapsedMs);

  if (phase === "idle") return null;

  const pct    = total > 0 ? Math.round((progress / total) * 100) : 0;
  const isDone = phase === "done" || phase === "summarizing";
  const isErr  = phase === "error";

  const statusColor = isErr ? "var(--red)" : isDone ? "var(--green)" : "var(--action)";
  const statusLabel = viewingSavedRun && isDone ? "Saved run" : PHASE_LABEL[phase];

  return (
    <div className="card cp progress-card shrink-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="progress-status inline-flex items-center gap-1" style={{ color: statusColor }}>
            {statusLabel}
            <InfoTip content={TIPS.runProgress} placement="bottom" />
          </span>
          {total > 0 && (
            <span className="progress-count">
              {progress}<span style={{ color: "var(--t3)" }}> / {total}</span>
            </span>
          )}
        </div>
        {displayElapsed > 0 && (
          <span className="progress-elapsed">{fmtDuration(displayElapsed)}</span>
        )}
      </div>

      <div className="progress-bar-track">
        <div
          className={clsx("progress-bar-fill", isErr && "!bg-[var(--red)]")}
          style={{ width: `${isDone ? 100 : pct}%` }}
        />
      </div>

      {isErr && runError && (
        <p className="run-error-inline mt-2" role="alert">{runError}</p>
      )}

      {phase === "done" && (
        <div className="progress-footer">
          {runId ? (
            <span className="progress-saved">
              {viewingSavedRun ? `Viewing #${runId.slice(0, 8)}` : `Saved as #${runId.slice(0, 8)}`}
            </span>
          ) : <span />}
          <div className="flex gap-2">
            {csvUrl && (
              <a href={csvUrl} download={`run-${runId ?? "export"}.csv`} className="mock-action-btn">
                CSV
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
