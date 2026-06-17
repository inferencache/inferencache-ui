"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  fetchSimilarityDist, fetchFalsePositives, flagCallFalsePositive, fmtCost,
} from "@/lib/api";
import { TitleWithTip } from "@/components/InfoTip";
import { TIPS } from "@/lib/tooltips";
import { analyzeSystemPrompt } from "@/lib/prefixPatterns";
import type { FalsePositiveRow, SimilarityBucket } from "@/types";

const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful assistant. Answer concisely and accurately.";

interface Props {
  model:     string;
  threshold: number;
  onThresholdChange: (v: number) => void;
}

export function TuningTab({ model, threshold, onThresholdChange }: Props) {
  const [dist,       setDist]       = useState<SimilarityBucket[]>([]);
  const [fps,        setFps]        = useState<FalsePositiveRow[]>([]);
  const [simThresh,  setSimThresh]  = useState(threshold);
  const [loading,    setLoading]    = useState(false);
  const [unflagging, setUnflagging] = useState<number | null>(null);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);

  const prefixAnalysis = analyzeSystemPrompt(systemPrompt);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, f] = await Promise.all([
      fetchSimilarityDist(model, 24, 20),
      fetchFalsePositives(model, 50),
    ]);
    setDist(d);
    setFps(f);
    setLoading(false);
  }, [model]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSimThresh(threshold); }, [threshold]);

  async function unflagRow(id: number) {
    setUnflagging(id);
    try {
      await flagCallFalsePositive(id, false);
      setFps(prev => prev.filter(r => r.id !== id));
    } finally {
      setUnflagging(null);
    }
  }

  // Compute counterfactual hit rate at simThresh
  const totalSemantic = dist.reduce((acc, b) => acc + b.count, 0);
  const hitsAtThresh  = dist
    .filter(b => b.bucket_floor >= simThresh)
    .reduce((acc, b) => acc + b.count, 0);
  const simHitRate = totalSemantic > 0
    ? ((hitsAtThresh / totalSemantic) * 100).toFixed(1)
    : "—";

  return (
    <div className="flex flex-col gap-8 p-1">
      {/* Threshold slider */}
      <div className="ge-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <TitleWithTip tip={TIPS.tuningThreshold} placement="bottom">
                Similarity threshold
              </TitleWithTip>
            </div>
            <div className="card-subtitle">
              Higher = stricter matching. Current: <strong>{simThresh.toFixed(2)}</strong>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onThresholdChange(simThresh)}
          >
            Apply
          </button>
        </div>
        <div className="card-body flex flex-col gap-4">
          <input
            type="range"
            min={0.5}
            max={0.99}
            step={0.01}
            value={simThresh}
            onChange={e => setSimThresh(Number(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-t-3">
            <span>0.50 (permissive)</span>
            <span>0.99 (strict)</span>
          </div>
          {dist.length > 0 && (
            <p className="text-sm text-t-2">
              At threshold {simThresh.toFixed(2)}: estimated{" "}
              <strong className="data-cell-teal">{simHitRate}%</strong> of semantic
              candidates would pass ({hitsAtThresh}/{totalSemantic} in last 24h).
            </p>
          )}
        </div>
      </div>

      {/* Prefix optimizer */}
      <div className="ge-card">
        <div className="card-header">
          <div>
            <div className="card-title">Prefix optimizer</div>
            <div className="card-subtitle">
              System prompt stability:{" "}
              <strong className={
                prefixAnalysis.stability_score >= 0.75
                  ? "data-cell-green"
                  : prefixAnalysis.stability_score >= 0.5
                    ? "data-cell-yellow"
                    : "data-cell-red"
              }>
                {(prefixAnalysis.stability_score * 100).toFixed(0)}%
              </strong>
            </div>
          </div>
        </div>
        <div className="card-body flex flex-col gap-3">
          <label className="text-xs text-t-3" htmlFor="system-prompt-input">
            System prompt (stable content should not change between requests)
          </label>
          <textarea
            id="system-prompt-input"
            className="w-full rounded border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-t-1 font-mono min-h-[100px] resize-y"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="Enter your system prompt…"
          />
          {prefixAnalysis.warnings.length > 0 ? (
            <ul className="text-sm text-t-2 flex flex-col gap-1">
              {prefixAnalysis.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="data-cell-yellow shrink-0">⚠</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-t-2 data-cell-green">
              No dynamic content detected — good prefix cache stability.
            </p>
          )}
          <p className="text-xs text-t-3">
            Tip: move file paths, timestamps, and user-specific values to the
            end of the message array instead of the system prompt.
          </p>
        </div>
      </div>

      {/* Similarity histogram */}
      <div className="ge-card">
        <div className="card-header">
          <div className="card-title">
            <TitleWithTip tip={TIPS.similarityDist} placement="bottom">
              Similarity distribution
            </TitleWithTip>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
        <div className="card-body" style={{ height: 220 }}>
          {dist.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-t-3">
              No semantic hits yet — run a test suite
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dist}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="bucket_floor"
                  tickFormatter={v => Number(v).toFixed(2)}
                  tick={{ fontSize: 10, fill: "var(--text-3)" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} />
                <Tooltip
                  formatter={(v: number | string) => [Number(v) || 0, "Hits"]}
                  labelFormatter={(l: number | string) => `Similarity ≥ ${Number(l).toFixed(2)}`}
                />
                <ReferenceLine
                  x={simThresh}
                  stroke="var(--accent-yellow)"
                  strokeDasharray="4 2"
                  label={{ value: "threshold", fontSize: 10, fill: "var(--accent-yellow)" }}
                />
                {dist.map(b => (
                  <Bar key={b.bucket_floor} dataKey="count">
                    <Cell
                      key={`cell-${b.bucket_floor}`}
                      fill={b.bucket_floor >= simThresh
                        ? "var(--accent-green)"
                        : "var(--accent-red)"}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* False positive review queue */}
      <div className="ge-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <TitleWithTip tip={TIPS.falsePositiveQueue} placement="bottom">
                False positive queue
              </TitleWithTip>
            </div>
            <div className="card-subtitle">
              Semantic hits flagged from the Call drawer
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {fps.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-t-3">
              No false positives flagged yet
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ge-table">
                <thead>
                  <tr>
                    <th>Similarity</th>
                    <th>Time</th>
                    <th>Original prompt</th>
                    <th>Cached response</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fps.map(r => (
                    <tr key={r.id}>
                      <td className="cell-mono data-cell-yellow">
                        {r.similarity.toFixed(4)}
                      </td>
                      <td className="cell-mono text-xs text-t-3">
                        {new Date(r.timestamp * 1000).toLocaleString()}
                      </td>
                      <td className="text-xs max-w-[200px] truncate" title={r.original_prompt}>
                        {r.original_prompt}
                      </td>
                      <td className="text-xs max-w-[200px] truncate" title={r.cached_response}>
                        {r.cached_response}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-xs"
                          disabled={unflagging === r.id}
                          onClick={() => unflagRow(r.id)}
                        >
                          {unflagging === r.id ? "…" : "Unflag"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
