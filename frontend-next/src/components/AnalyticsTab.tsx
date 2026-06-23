"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  fetchHitRate, fetchCostSaved, fetchEndpoints, fetchTierBreakdown, fmtCost,
} from "@/lib/api";
import { InfoTip, TitleWithTip } from "@/components/InfoTip";
import { TIPS } from "@/lib/tooltips";
import type { CostSavedPoint, EndpointRow, HitRateBucket, TierBreakdownRow, TimeWindow } from "@/types";
import { WINDOW_HOURS } from "@/types";

interface Props {
  model: string;
}

const WINDOWS: TimeWindow[] = ["1h", "6h", "24h", "7d", "30d"];

function formatTs(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
  });
}

export function AnalyticsTab({ model }: Props) {
  const [window,    setWindow]    = useState<TimeWindow>("24h");
  const [hitData,   setHitData]   = useState<HitRateBucket[]>([]);
  const [costData,  setCostData]  = useState<CostSavedPoint[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointRow[]>([]);
  const [tierData,  setTierData]  = useState<TierBreakdownRow[]>([]);
  const [loading,   setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const hours = WINDOW_HOURS[window];
    const bucket = hours <= 6 ? 5 : hours <= 24 ? 30 : hours <= 168 ? 360 : 1440;
    const [h, c, e, t] = await Promise.all([
      fetchHitRate(model, hours, bucket),
      fetchCostSaved(model, hours),
      fetchEndpoints(model, hours),
      fetchTierBreakdown(model, hours),
    ]);
    setHitData(h);
    setCostData(c);
    setEndpoints(e);
    setTierData(t);
    setLoading(false);
  }, [model, window]);

  useEffect(() => { load(); }, [load]);

  const totalSaved = costData.length > 0
    ? (costData[costData.length - 1].cumulative_saved ?? 0)
    : 0;

  const exportCsv = useCallback(() => {
    if (!endpoints.length) return;
    const rows = [
      "endpoint,total_calls,cache_hits,hit_rate,avg_latency_ms,total_cost_usd,cost_saved_usd",
      ...endpoints.map(r =>
        `"${r.endpoint}",${r.total_calls},${r.cache_hits},${r.hit_rate},${r.avg_latency_ms},${r.total_cost_usd},${r.cost_saved_usd}`
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
    a.download = `analytics-${model}-${window}.csv`;
    a.click();
  }, [endpoints, model, window]);

  const totalHits = tierData.reduce((acc, t) => acc + (t.hit_count ?? 0), 0);

  return (
    <div className="analytics-page flex flex-col gap-[18px] p-1">
      {/* Controls */}
      <div className="analytics-toolbar">
        <div className="flex items-center gap-3">
          <span className="pc-mono analytics-window-label">WINDOW</span>
          <div className="flex gap-1">
            {WINDOWS.map(w => (
              <button
                key={w}
                type="button"
                onClick={() => setWindow(w)}
                className={`window-pill ${window === w ? "is-active" : ""}`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="toolbar-btn" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button type="button" className="toolbar-btn" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Hero: cumulative cost saved */}
      <div className="ge-card analytics-hero">
        <div className="analytics-hero-top">
          <div>
            <p className="pc-mono analytics-hero-label">CUMULATIVE COST SAVED</p>
            <div className="pc-mono analytics-hero-value">{fmtCost(totalSaved)}</div>
            <p className="analytics-hero-sub">
              over last {window} · {totalHits} cache hits
            </p>
          </div>
        </div>
        <div className="card-body analytics-hero-chart" style={{ height: 150 }}>
          {costData.length === 0 ? (
            <EmptyState label="Run a test suite to see cost savings" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costData}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--accent-green)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTs}
                  tick={{ fontSize: 10, fill: "var(--text-3)" }}
                />
                <YAxis
                  tickFormatter={v => `$${Number(v).toFixed(4)}`}
                  tick={{ fontSize: 10, fill: "var(--text-3)" }}
                  width={70}
                />
                <Tooltip
                  formatter={(v: number | string) => [fmtCost(Number(v) || 0), "Cumulative saved"]}
                  labelFormatter={(l: number | string) => formatTs(Number(l))}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative_saved"
                  stroke="var(--accent-green)"
                  fill="url(#costGrad)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Savings by tier */}
      <div className="ge-card">
        <div className="card-header">
          <div className="card-title">Savings by tier</div>
          <div className="card-subtitle">
            Breakdown of tokens and cost saved per caching layer
          </div>
        </div>
        <div className="card-body p-0">
          {tierData.length === 0 ? (
            <EmptyState label="Run a test suite to see tier savings" />
          ) : (
            <div className="table-responsive">
              <table className="ge-table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Hits</th>
                    <th>Tokens saved</th>
                    <th>Cost saved</th>
                  </tr>
                </thead>
                <tbody>
                  {tierData.map(row => (
                    <tr key={row.tier}>
                      <td className="text-sm">{row.label}</td>
                      <td className="cell-mono">{row.hit_count ?? 0}</td>
                      <td className="cell-mono data-cell-teal">
                        {(row.tokens_saved ?? 0).toLocaleString()}
                      </td>
                      <td className="cell-mono data-cell-green">
                        {fmtCost(row.cost_saved ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Hit rate over time */}
      <div className="ge-card">
        <div className="card-header">
          <div className="card-title">
            <TitleWithTip tip={TIPS.hitRateChart} placement="bottom">
              Hit rate over time
            </TitleWithTip>
          </div>
        </div>
        <div className="card-body" style={{ height: 200 }}>
          {hitData.length === 0 ? (
            <EmptyState label="No data for this window" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="time_bucket"
                  tickFormatter={formatTs}
                  tick={{ fontSize: 10, fill: "var(--text-3)" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-3)" }} />
                <Tooltip labelFormatter={l => formatTs(Number(l))} />
                <Area type="monotone" dataKey="exact_hits"    stackId="1" stroke="var(--accent-green)"  fill="var(--accent-green)"  fillOpacity={0.6} dot={false} name="Exact" />
                <Area type="monotone" dataKey="semantic_hits" stackId="1" stroke="var(--accent-teal)"   fill="var(--accent-teal)"   fillOpacity={0.6} dot={false} name="Semantic" />
                <Area type="monotone" dataKey="misses"        stackId="1" stroke="var(--accent-red)"    fill="var(--accent-red)"    fillOpacity={0.3} dot={false} name="Miss" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Endpoint breakdown table */}
      {endpoints.length > 0 && (
        <div className="ge-card">
          <div className="card-header">
            <div className="card-title">
              <TitleWithTip tip={TIPS.endpointBreakdown} placement="bottom">
                Endpoint breakdown
              </TitleWithTip>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="ge-table">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Calls</th>
                    <th>Hits</th>
                    <th>Hit rate</th>
                    <th>Avg latency</th>
                    <th>Cost</th>
                    <th>Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoints.map(r => (
                    <tr key={r.endpoint}>
                      <td className="cell-mono text-xs">{r.endpoint}</td>
                      <td className="cell-mono">{r.total_calls ?? 0}</td>
                      <td className="cell-mono data-cell-green">{r.cache_hits ?? 0}</td>
                      <td className="cell-mono data-cell-teal">
                        {((r.hit_rate ?? 0) * 100).toFixed(1)}%
                      </td>
                      <td className="cell-mono">{(r.avg_latency_ms ?? 0).toFixed(0)} ms</td>
                      <td className="cell-mono data-cell-orange">{fmtCost(r.total_cost_usd)}</td>
                      <td className="cell-mono data-cell-green">{fmtCost(r.cost_saved_usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-sm text-t-3">{label}</div>
  );
}
