"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteRun, fetchRunDetail, fetchRuns, fmtCost } from "@/lib/api";
import type { RunDetail, RunRecord } from "@/types";
import clsx from "clsx";
import { InfoTip } from "@/components/InfoTip";
import { TIPS } from "@/lib/tooltips";

interface Props {
  refreshTick: number;
  embedded?: boolean;
  onCountChange?: (count: number) => void;
  onRerun: (cfg: {
    suite_name: string; model: string; provider: string; threshold: number; repeat_factor: number;
  }) => void;
  onViewRun: (detail: RunDetail) => void;
}

function HitBadge({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  return (
    <span className={clsx("hi-badge", pct >= 95 ? "hi-perfect" : "hi-good")}>
      {pct}%
    </span>
  );
}

function fmtRunDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function RunHistory({
  refreshTick, embedded = false, onCountChange, onRerun, onViewRun,
}: Props) {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    try {
      const list = await fetchRuns();
      setRuns(list);
      onCountChange?.(list.length);
    } catch {
      /* ignore */
    }
  }, [onCountChange]);

  useEffect(() => { loadRuns(); }, [loadRuns]);
  useEffect(() => {
    if (refreshTick > 0) loadRuns();
  }, [refreshTick, loadRuns]);

  async function handleSelect(runId: string) {
    if (selected === runId) {
      setSelected(null);
      return;
    }
    setSelected(runId);
    try {
      const d = await fetchRunDetail(runId);
      onViewRun(d);
    } catch {
      setSelected(null);
    }
  }

  async function handleDelete(runId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (pendingDelete !== runId) {
      setPendingDelete(runId);
      return;
    }
    try {
      await deleteRun(runId);
      setRuns((prev) => {
        const next = prev.filter((r) => r.id !== runId);
        onCountChange?.(next.length);
        return next;
      });
      if (selected === runId) setSelected(null);
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <>
      {!embedded && (
        <div className="sh sh-row">
          <span className="inline-flex items-center gap-1">
            Past runs
            <InfoTip content={TIPS.pastRuns} placement="right" />
          </span>
          {runs.length > 0 && <span className="sh-count">{runs.length}</span>}
        </div>
      )}
      <div className={clsx("run-scroll", embedded && "run-scroll-fill")}>
        {runs.length === 0 ? (
          <p className="px-2 py-2 text-[11px]" style={{ color: "var(--t3)" }}>
            No past runs yet
          </p>
        ) : (
          runs.map((run) => (
            <button
              key={run.id}
              type="button"
              className={clsx("ri", selected === run.id && "active")}
              onClick={() => handleSelect(run.id)}
              onContextMenu={(e) => handleDelete(run.id, e)}
            >
              <div className="ri-meta">
                <div className="ri-id">{run.id.slice(0, 8)}</div>
                <div className="ri-name">{run.suite_name}</div>
                <div className="ri-info">
                  {run.model} · {fmtCost(run.total_cost_usd)} · {fmtRunDate(run.created_at)}
                </div>
              </div>
              <HitBadge rate={run.hit_rate} />
            </button>
          ))
        )}
      </div>
    </>
  );
}
