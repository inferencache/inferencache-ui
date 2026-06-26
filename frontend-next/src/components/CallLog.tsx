"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { fmtCost } from "@/lib/api";
import { useEnterKeys } from "@/lib/useEnterKeys";
import type { PendingCall, RunEvent } from "@/types";
import { CallDrawer } from "@/components/CallDrawer";
import { InfoTip } from "@/components/InfoTip";
import { TIPS } from "@/lib/tooltips";
import clsx from "clsx";

interface Props {
  entries:  RunEvent[];
  pending:  PendingCall | null;
  hasKey:   boolean;
  runId?:   string | null;
  runError?: string | null;
  phase?:   string;
}

type Filter = "all" | "exact" | "semantic" | "miss" | "error";

const FILTERS: { id: Filter; label: string; tip: string }[] = [
  { id: "all",      label: "All",      tip: TIPS.filterAll },
  { id: "exact",    label: "Exact",    tip: TIPS.filterExact },
  { id: "semantic", label: "Semantic", tip: TIPS.filterSemantic },
  { id: "miss",     label: "Miss",     tip: TIPS.filterMiss },
  { id: "error",    label: "Error",    tip: TIPS.filterError },
];

type LogRow =
  | { kind: "call";  ev: RunEvent }
  | { kind: "error"; ev: RunEvent };

function ResultBadge({ type }: { type: "exact" | "semantic" | "generative" | "miss" | "stale_miss" }) {
  const [cls, lbl] =
    type === "exact" ? ["b-e", "EXACT"] :
    type === "semantic" ? ["b-s", "SEM"] :
    type === "generative" ? ["b-g", "GEN"] :
    type === "stale_miss" ? ["b-st", "STALE"] :
    ["b-m", "MISS"];
  return <span className={clsx("badge", cls)}>{lbl}</span>;
}

function truncateMessage(msg: string, max = 120): string {
  const oneLine = msg.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

function rowKey(row: LogRow): string {
  const idx = row.ev.prompt_index;
  if (row.kind === "error") {
    return `error-${idx ?? "run"}-${row.ev.message ?? ""}`;
  }
  return `call-${idx}`;
}

export const CallLog = memo(function CallLog({
  entries, pending, hasKey, runId, runError, phase,
}: Props) {
  const callsLenRef = useRef(0);
  const autoFilterRef = useRef(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [drawerCall, setDrawerCall] = useState<RunEvent | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const calls  = useMemo(() => entries.filter(e => e.event_type === "call"), [entries]);
  const errors = useMemo(
    () => entries.filter(e => e.event_type === "error"),
    [entries],
  );

  const rows = useMemo((): LogRow[] => {
    const merged: LogRow[] = [
      ...calls.map((ev): LogRow => ({ kind: "call", ev })),
      ...errors.map((ev): LogRow => ({ kind: "error", ev })),
    ];
    merged.sort((a, b) => {
      const ai = a.ev.prompt_index;
      const bi = b.ev.prompt_index;
      if (ai == null && bi == null) return 0;
      if (ai == null) return 1;
      if (bi == null) return -1;
      return ai - bi;
    });
    return merged;
  }, [calls, errors]);

  const liveUpdates =
    phase === "running" || phase === "starting" || phase === "summarizing";
  const rowKeys = useMemo(() => rows.map(rowKey), [rows]);
  const enterKey = useEnterKeys(rowKeys, runId ?? null, {
    enabled: liveUpdates,
    enterClass: "lr-enter",
    durationMs: 500,
  });

  const counts = useMemo(() => ({
    all:      rows.length,
    exact:    calls.filter(e => e.hit_type === "exact").length,
    semantic: calls.filter(e => e.hit_type === "semantic").length,
    generative: calls.filter(e => e.hit_type === "generative").length,
    miss:     calls.filter(e =>
      e.hit_type === "miss" || e.hit_type === "stale_miss" || !e.hit
    ).length,
    error:    errors.length,
  }), [rows.length, calls, errors.length]);

  const filtered = useMemo(() => (
    filter === "all"      ? rows :
    filter === "error"    ? rows.filter(r => r.kind === "error") :
    rows.filter(r =>
      r.kind === "call" && (
        filter === "exact"    ? r.ev.hit_type === "exact" :
        filter === "semantic" ? r.ev.hit_type === "semantic" :
        (r.ev.hit_type === "miss" || r.ev.hit_type === "stale_miss" || !r.ev.hit)
      )
    )
  ), [rows, filter]);

  const summaryError = useMemo(() => {
    const summary = entries.find(e => e.event_type === "summary");
    const apiErrors = summary?.api_errors ?? 0;
    const firstMsg = summary?.error_messages?.[0] ?? errors[0]?.message;
    if (firstMsg) return firstMsg;
    if (runError) return runError;
    if (apiErrors > 0 && (summary?.total_calls ?? 0) === 0) {
      return `${apiErrors} API call${apiErrors === 1 ? "" : "s"} failed — see errors below`;
    }
    if (apiErrors > 0) {
      return `${apiErrors} API call${apiErrors === 1 ? "" : "s"} failed during this run`;
    }
    if (phase === "error" && errors.length === 0) {
      return runError ?? "Run failed — no error details were returned";
    }
    return null;
  }, [entries, errors, runError, phase]);

  useEffect(() => {
    if (errors.length > 0 && !autoFilterRef.current) {
      autoFilterRef.current = true;
      setFilter("error");
    }
    if (errors.length === 0) autoFilterRef.current = false;
  }, [errors.length]);

  useEffect(() => {
    if (rows.length > callsLenRef.current && logRef.current) {
      const el = logRef.current;
      const timer = window.setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }, 120);
      callsLenRef.current = rows.length;
      return () => window.clearTimeout(timer);
    }
    callsLenRef.current = rows.length;
  }, [rows.length]);

  const showEmpty = filtered.length === 0 && !pending && !summaryError;

  return (
    <>
      <div className="card log-card">
        <div className="log-hdr">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ width: 13, height: 13, color: "var(--t3)" }} aria-hidden>
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span className="log-ttl">Call log</span>
          <InfoTip content={TIPS.callLog} placement="bottom" />
          <span className="log-n">{rows.length ? `${rows.length} events` : ""}</span>
          <div className="fpills" role="group" aria-label="Filter calls">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={clsx("fp", filter === f.id && "on")}
                onClick={() => setFilter(f.id)}
                title={f.tip}
              >
                {f.label} {counts[f.id]}
              </button>
            ))}
          </div>
        </div>

        {summaryError && (
          <div
            className="run-error-banner run-error-banner-enter"
            role="alert"
          >
            <span className="run-error-banner-label">Run error</span>
            <p className="run-error-banner-msg">{summaryError}</p>
          </div>
        )}

        <div className="log-cols">
          <span>#</span><span>result</span><span>latency</span>
          <span>tokens</span><span>cost</span><span>sim</span><span>prompt</span>
        </div>

        <div className="log-rows" ref={logRef}>
          {showEmpty ? (
            <div className="empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <p>Run a suite to see results</p>
              {!hasKey && (
                <p className="text-[11px]" style={{ color: "var(--red)" }}>
                  Add an API key first — open the menu and choose API keys.
                </p>
              )}
            </div>
          ) : (
            <>
              {filtered.map((row) => {
                const key = rowKey(row);
                const enterCls = enterKey(key);
                if (row.kind === "error") {
                  const ev = row.ev;
                  const msg = ev.message || "API error";
                  return (
                    <button
                      key={key}
                      type="button"
                      className={clsx("lr lr-error", enterCls)}
                      title={msg}
                      onClick={() => setDrawerCall(ev)}
                    >
                      <span className="idx">{ev.prompt_index != null ? ev.prompt_index + 1 : "—"}</span>
                      <span><span className="badge b-err">ERR</span></span>
                      <span className="rlat">—</span>
                      <span className="rtok">—</span>
                      <span className="rcst free">—</span>
                      <span className="rsim">—</span>
                      <span className="rprompt run-error-text">
                        {truncateMessage(msg)}
                      </span>
                    </button>
                  );
                }

                const ev = row.ev;
                const hitType = ev.hit_type ?? "miss";
                const latMs = ev.latency_ms ?? 0;
                const cost = ev.cost_usd ?? 0;
                const simV = hitType === "exact" ? "1.000"
                  : hitType === "semantic" ? (ev.similarity ?? 0).toFixed(3) : "—";
                return (
                  <button
                    key={key}
                    type="button"
                    className={clsx("lr", enterCls)}
                    onClick={() => setDrawerCall(ev)}
                  >
                    <span className="idx">{(ev.prompt_index ?? 0) + 1}</span>
                    <span><ResultBadge type={hitType} /></span>
                    <span className="rlat">{latMs}ms</span>
                    <span className="rtok">{ev.tokens_used || "—"}</span>
                    <span className={clsx("rcst", cost > 0 ? "paid" : "free")}>
                      {cost > 0 ? fmtCost(cost) : "$0.000000"}
                    </span>
                    <span className="rsim">{simV}</span>
                    <span className="rprompt">{ev.prompt_preview || "—"}</span>
                  </button>
                );
              })}
              {pending && (
                <div className="lr lr-pending">
                  <span className="idx">{pending.prompt_index + 1}</span>
                  <span className="badge b-s">…</span>
                  <span className="rlat">—</span>
                  <span className="rtok">—</span>
                  <span className="rcst free">—</span>
                  <span className="rsim">—</span>
                  <span className="rprompt">{pending.prompt_preview}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CallDrawer call={drawerCall} onClose={() => setDrawerCall(null)} />
    </>
  );
});
