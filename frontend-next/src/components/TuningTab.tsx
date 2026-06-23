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

const TYPE_PRESETS = [
  { label: "CODE", value: "0.92" },
  { label: "DETERMINISTIC", value: "0.95" },
  { label: "RAG", value: "0.88" },
  { label: "CONVERSATIONAL", value: "0.82" },
] as const;

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
    <div className="flex flex-col gap-[18px]">
      {/* Threshold slider */}
      <div className="ge-card tuning-card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <TitleWithTip tip={TIPS.tuningThreshold} placement="bottom">
                Similarity threshold
              </TitleWithTip>
            </div>
            <div className="card-subtitle">
              Higher = stricter matching. Current:{" "}
              <span className="pc-mono text-t-1">{simThresh.toFixed(2)}</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-run-suite btn-run-suite-sm"
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
            className="pc-slider w-full"
            style={{
              background: `linear-gradient(to right, #f97316 ${((simThresh - 0.5) / 0.49) * 100}%, #252b3b ${((simThresh - 0.5) / 0.49) * 100}%)`,
            }}
          />
          <div className="flex justify-between text-xs text-t-3 pc-mono">
            <span>0.50 (permissive)</span>
            <span>0.99 (strict)</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {TYPE_PRESETS.map((p) => (
              <div key={p.label} className="type-preset-chip">
                <span className="type-preset-label pc-mono">{p.label}</span>
                <span className="type-preset-value pc-mono">{p.value}</span>
              </div>
            ))}
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
      <div className="ge-card tuning-card">
        <div className="card-header !border-b-0 !pb-0">
          <div>
            <div className="card-title flex flex-wrap items-center gap-x-3 gap-y-1">
              Prefix optimizer
              <span className="text-[12.5px] font-normal text-t-2">
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
              </span>
            </div>
            <p className="card-subtitle mt-1">
              System prompt — stable content should not change between requests.
            </p>
          </div>
        </div>
        <div className="card-body flex flex-col gap-0">
          <textarea
            id="system-prompt-input"
            className="prefix-textarea"
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder="Enter your system prompt…"
          />
          {prefixAnalysis.warnings.length > 0 ? (
            <ul className="text-sm text-t-2 flex flex-col gap-1 mt-3">
              {prefixAnalysis.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="data-cell-yellow shrink-0">⚠</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="prefix-success-banner">
              <span className="data-cell-green">✓</span>
              <span>No dynamic content detected — good prefix cache stability.</span>
            </div>
          )}
          <p className="text-xs text-t-3 mt-3.5">
            Tip: move file paths, timestamps, and user-specific values to the
            end of the message array instead of the system prompt.
          </p>
        </div>
      </div>

      {/* Similarity histogram */}
      <div className="ge-card tuning-card">
        <div className="card-header !border-b-0">
          <div className="card-title">
            <TitleWithTip tip={TIPS.similarityDist} placement="bottom">
              Similarity distribution
            </TitleWithTip>
          </div>
          <span className="card-subtitle">Threshold at {simThresh.toFixed(2)}</span>
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
                      fill="#f97316"
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* False positive review queue */}
      <div className="ge-card tuning-card">
        <div className="card-header !border-b-0 !pb-0">
          <div className="card-title">
            <TitleWithTip tip={TIPS.falsePositiveQueue} placement="bottom">
              False positive queue
            </TitleWithTip>
          </div>
          <p className="card-subtitle mt-1">
            Semantic hits flagged from the call drawer during a test run.
          </p>
        </div>
        <div className="card-body p-0 pt-2">
          {fps.length === 0 ? (
            <div className="fp-empty-state">
              <div className="fp-empty-title">No false positives flagged yet</div>
              <div className="fp-empty-sub">
                Open any SEM row in the call drawer and flag suspicious matches to triage them here.
              </div>
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
                  {fps.map(r => {
                    const similarity = r.similarity ?? 0;
                    return (
                    <tr key={r.id}>
                      <td className="cell-mono data-cell-yellow">
                        {similarity > 0 ? similarity.toFixed(4) : "—"}
                      </td>
                      <td className="cell-mono text-xs text-t-3">
                        {r.timestamp
                          ? new Date(r.timestamp * 1000).toLocaleString()
                          : "—"}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
