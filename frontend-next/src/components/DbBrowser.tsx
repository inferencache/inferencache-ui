"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { AppNavbar } from "@/components/AppNavbar";
import { deleteRun, fetchRunDetail, fetchRuns, fmtCost } from "@/lib/api";
import type { HitType, RunCallRecord, RunDetail, RunRecord } from "@/types";

type CallFilter = "all" | HitType;

function HitBadge({ type }: { type: HitType }) {
  const label = type === "exact" ? "Exact hit" : type === "semantic" ? "Semantic hit" : "Cache miss";
  return (
    <span
      className={clsx(
        "inline-flex px-1.5 py-0.5 rounded text-2xs font-bold uppercase tracking-wider",
        type === "exact"    && "bg-hit-exact/15 text-hit-exact",
        type === "semantic" && "bg-hit-semantic/15 text-hit-semantic",
        type === "miss"     && "bg-miss/10 text-miss",
      )}
      aria-label={label}
    >
      {type === "exact" ? "EXACT" : type === "semantic" ? "SEM" : "MISS"}
    </span>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="ge-meta-label">{label}</span>
      <span className="ge-meta-value">{value}</span>
    </div>
  );
}

export function DbBrowser() {
  const [runs,       setRuns]       = useState<RunRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail,     setDetail]     = useState<RunDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState("");
  const [callFilter, setCallFilter] = useState<CallFilter>("all");
  const [sortSim,    setSortSim]    = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchRuns(200);
      setRuns(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load saved runs. Check that the server is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const loadDetail = useCallback(async (runId: string) => {
    setSelectedId(runId);
    setDetailLoading(true);
    setError(null);
    try {
      const d = await fetchRunDetail(runId);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load call records for this run.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const filteredRuns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return runs;
    return runs.filter((r) =>
      r.id.toLowerCase().includes(q) ||
      r.suite_name.toLowerCase().includes(q) ||
      r.model.toLowerCase().includes(q) ||
      r.provider.toLowerCase().includes(q)
    );
  }, [runs, search]);

  const filteredCalls = useMemo(() => {
    if (!detail) return [];
    let calls = detail.calls;
    if (callFilter !== "all") {
      calls = calls.filter((c) => c.hit_type === callFilter);
    }
    if (sortSim) {
      calls = [...calls].sort(
        (a, b) =>
          (b.best_similarity ?? b.similarity) - (a.best_similarity ?? a.similarity),
      );
    }
    return calls;
  }, [detail, callFilter, sortSim]);

  async function handleDelete(runId: string) {
    if (pendingDelete !== runId) {
      setPendingDelete(runId);
      return;
    }
    setError(null);
    try {
      await deleteRun(runId);
      setRuns((prev) => prev.filter((r) => r.id !== runId));
      if (selectedId === runId) {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete this run. Try again.");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="app-shell h-screen overflow-hidden">
      <AppNavbar
        page="saved-runs"
        rightExtra={
          <button
            type="button"
            onClick={loadRuns}
            disabled={loading}
            aria-busy={loading}
            className="navbar-menu-item w-full"
          >
            <span className="navbar-menu-item-label">{loading ? "Loading…" : "↻ Refresh runs"}</span>
          </button>
        }
      />

      {error && (
        <div role="alert" className="ge-alert ge-alert-error mx-4 mt-2 shrink-0">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline shrink-0"
            onClick={() => { setError(null); loadRuns(); }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="app-shell-body">
        <div id="main-content" tabIndex={-1} className="page-wrapper flex flex-col flex-1 min-h-0 gap-8 outline-none w-full overflow-y-auto">
            <div className="page-header shrink-0">
              <div className="page-header-row">
                <div>
                  <h1 className="page-title">Saved runs</h1>
                </div>
                <span className="text-xs cell-mono text-t-3" title="Local database file">
                  ~/.cache/promptcache-dashboard/runs.db
                </span>
              </div>
            </div>

            <div className="ge-card flex flex-1 min-h-0 overflow-hidden">
              <div className="db-split">
        {/* Left: runs table */}
        <div className="db-runs-pane">
          <div className="card-header shrink-0 !border-b">
            <div>
              <div className="card-title">Runs</div>
              <div className="card-subtitle">{filteredRuns.length} row{filteredRuns.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          <div className="px-4 py-3 shrink-0 section-divider-b">
            <input
              type="search"
              placeholder="Search by run ID, suite, or model…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ge-input text-xs"
            />
          </div>

          <div className="flex-1 overflow-auto">
            {loading && runs.length === 0 ? (
              <p className="px-4 py-6 text-xs animate-pulse text-t-3">Loading runs…</p>
            ) : filteredRuns.length === 0 ? (
              <p className="px-4 py-6 text-xs text-t-3">
                No saved runs yet. Complete a test run on the dashboard first.
              </p>
            ) : (
              <table className="ge-table">
                <thead>
                  <tr>
                    <th>id</th>
                    <th>suite</th>
                    <th>model</th>
                    <th className="text-right">Hit rate</th>
                    <th className="text-right">Calls</th>
                    <th>created</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map((run) => (
                    <tr
                      key={run.id}
                      onClick={() => loadDetail(run.id)}
                      className={clsx(
                        "cursor-pointer group",
                        selectedId === run.id && "row-selected",
                      )}
                    >
                      <td className="cell-mono data-cell-teal">{run.id}</td>
                      <td className="truncate max-w-[100px]">{run.suite_name}</td>
                      <td className="truncate max-w-[90px]">{run.model}</td>
                      <td className="text-right data-cell-green">
                        {Math.round(run.hit_rate * 100)}%
                      </td>
                      <td className="text-right">{run.total_calls}</td>
                      <td className="whitespace-nowrap">{fmtDate(run.created_at)}</td>
                      <td>
                        {pendingDelete === run.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDelete(run.id); }}
                              className="btn btn-sm btn-primary"
                              aria-label={`Confirm delete run ${run.id}`}
                            >
                              Delete run
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPendingDelete(null); }}
                              className="btn btn-sm btn-outline"
                              aria-label="Cancel delete"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(run.id); }}
                            className="hidden group-hover:block group-focus-within:block text-2xs min-h-11 min-w-11 data-cell-red"
                            aria-label={`Delete run ${run.id}`}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: run detail + run_calls */}
        <div className="db-detail-pane">
          {!selectedId ? (
            <div className="ge-empty-state">
              <span className="text-3xl opacity-20">⊞</span>
              <span className="text-sm">Select a run to view its call records</span>
            </div>
          ) : detailLoading ? (
            <p className="px-5 py-6 text-xs animate-pulse text-t-3">Loading run detail…</p>
          ) : detail ? (
            <>
              <div className="card-header shrink-0">
                <div>
                  <div className="card-title cell-mono">{detail.id}</div>
                  <div className="card-subtitle">{fmtDate(detail.created_at)}</div>
                </div>
              </div>
              <div className="px-5 py-4 shrink-0 section-divider-b">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                  <MetaCell label="Suite" value={detail.suite_name} />
                  <MetaCell label="Model" value={detail.model} />
                  <MetaCell label="Provider" value={detail.provider} />
                  <MetaCell label="Threshold" value={detail.threshold.toFixed(2)} />
                  <MetaCell label="Repeat" value={`${detail.repeat_factor}×`} />
                  <MetaCell label="Hit rate" value={`${Math.round(detail.hit_rate * 100)}%`} />
                  <MetaCell label="Exact hits" value={String(detail.exact_hits)} />
                  <MetaCell label="Semantic hits" value={String(detail.semantic_hits)} />
                  <MetaCell label="Tokens" value={detail.total_tokens.toLocaleString()} />
                  <MetaCell label="Cost" value={fmtCost(detail.total_cost_usd)} />
                  <MetaCell label="Duration" value={`${(detail.total_time_ms / 1000).toFixed(1)}s`} />
                  <MetaCell label="Calls" value={String(detail.total_calls)} />
                  {detail.batch_id && <MetaCell label="Batch" value={detail.batch_id} />}
                  {detail.cache_mode && <MetaCell label="Cache mode" value={detail.cache_mode} />}
                </div>
              </div>

              <div className="flex items-center gap-2 px-5 py-2.5 shrink-0 card-header !py-2">
                <span className="card-title mr-2">Call records</span>
                {(["all", "exact", "semantic", "miss"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCallFilter(f)}
                    className={clsx(
                      "btn btn-sm capitalize",
                      callFilter === f ? "btn-primary" : "btn-outline",
                    )}
                    aria-pressed={callFilter === f}
                  >
                    {f}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setSortSim((s) => !s)}
                  className={clsx("btn btn-sm", sortSim ? "btn-primary" : "btn-outline")}
                  aria-pressed={sortSim}
                >
                  Sort by similarity
                </button>
                <span className="text-2xs cell-mono text-t-3">
                  {filteredCalls.length} row{filteredCalls.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex-1 overflow-auto table-responsive">
                <table className="ge-table">
                  <thead>
                    <tr>
                      <th className="w-10">#</th>
                      <th className="w-16">type</th>
                      <th className="w-16 text-right">Latency</th>
                      <th className="w-14 text-right">Tokens</th>
                      <th className="w-20 text-right">Cost</th>
                      <th className="w-16 text-right">Similarity</th>
                      <th className="w-16 text-right">Best match</th>
                      <th>prompt</th>
                      <th>response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCalls.map((c: RunCallRecord) => (
                      <tr key={c.prompt_index}>
                        <td className="cell-mono data-cell-muted">{c.prompt_index + 1}</td>
                        <td><HitBadge type={c.hit_type} /></td>
                        <td className={clsx(
                          "text-right cell-mono",
                          c.hit_type !== "miss" ? "data-cell-teal" :
                            c.latency_ms < 800 ? "data-cell-yellow" : "data-cell-red",
                        )}>
                          {c.latency_ms.toFixed(0)}ms
                        </td>
                        <td className="text-right cell-mono data-cell-purple">{c.tokens_used || "—"}</td>
                        <td className="text-right cell-mono data-cell-orange">
                          {c.cost_usd ? fmtCost(c.cost_usd) : "—"}
                        </td>
                        <td className={clsx(
                          "text-right cell-mono",
                          c.similarity >= 0.8 ? "data-cell-orange" : "data-cell-muted",
                        )}>
                          {c.hit_type === "exact" ? "1.000" :
                           c.similarity > 0 ? c.similarity.toFixed(3) : "—"}
                        </td>
                        <td className={clsx(
                          "text-right cell-mono",
                          (c.best_similarity ?? 0) >= 0.8 ? "data-cell-orange" : "data-cell-muted",
                        )}>
                          {c.hit_type === "miss" && (c.best_similarity ?? 0) > 0
                            ? c.best_similarity!.toFixed(3)
                            : "—"}
                        </td>
                        <td className="max-w-[200px] truncate" title={c.prompt_preview}>
                          {c.prompt_preview}
                        </td>
                        <td className="max-w-[200px] truncate" title={c.response_preview}>
                          {c.response_preview || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
