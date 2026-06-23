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

  return (
    <div className="card cp shrink-0">
      <div className="flex items-center gap-3 mb-2 text-[11px]">
        <span style={{ color: isErr ? "var(--red)" : isDone ? "var(--green)" : "var(--action)" }} className="inline-flex items-center gap-1">
          {viewingSavedRun ? "Saved run" : PHASE_LABEL[phase]}
          <InfoTip content={TIPS.runProgress} placement="bottom" />
        </span>
        {total > 0 && (
          <span className="rlat">{progress}<span style={{ color: "var(--t3)" }}> / {total}</span></span>
        )}
        {total > 0 && !isDone && <span className="rlat">{pct}%</span>}
        <div className="flex-1" />
        {displayElapsed > 0 && <span className="rsim">{fmtDuration(displayElapsed)}</span>}
        {etaMs != null && !isDone && phase === "running" && (
          <span className="rsim">ETA {fmtDuration(etaMs)}</span>
        )}
      </div>

      <div className="bar-track mb-2">
        <div
          className={clsx("bseg", isErr ? "bs-miss" : isDone ? "bs-exact" : "bs-sem")}
          style={{ width: `${isDone ? 100 : pct}%` }}
        />
      </div>

      {isErr && runError && (
        <p className="run-error-inline" role="alert">{runError}</p>
      )}

      {phase === "done" && (
        <div className="bar-foot">
          {runId && (
            <span>
              {viewingSavedRun ? `Viewing #${runId}` : `Saved as #${runId}`}
            </span>
          )}
          <div className="flex gap-2 ml-auto">
            {csvUrl && (
              <a href={csvUrl} download={`run-${runId ?? "export"}.csv`} className="top-btn no-underline">
                Export CSV
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
