"use client";

import { memo } from "react";
import { MetricCard } from "./MetricCard";
import { fmtCost } from "@/lib/api";
import type { LiveStats } from "@/types";

interface Props {
  stats: LiveStats;
}

export const MetricsGrid = memo(function MetricsGrid({ stats }: Props) {
  const hasRunData = stats.total > 0;
  const hitPct = hasRunData
    ? `${Math.round((stats.hits / stats.total) * 100)}%`
    : "—";

  return (
    <div className="metrics-grid" aria-label="Current run statistics">
      <MetricCard
        label="Total calls"
        value={hasRunData ? stats.total.toLocaleString() : "0"}
        sub="this run"
      />
      <MetricCard
        label="Hit rate"
        value={hitPct}
        sub={`${stats.hits} hits · ${stats.misses} misses`}
        tone={hasRunData ? "green" : undefined}
      />
      <MetricCard
        label="Exact hits"
        value={hasRunData ? String(stats.exact) : "0"}
        sub="SHA-256 match"
        tone={stats.exact > 0 ? "green" : undefined}
      />
      <MetricCard
        label="Semantic hits"
        value={hasRunData ? String(stats.semantic) : "0"}
        sub="embedding match"
        tone={stats.semantic > 0 ? "amber" : undefined}
      />
      <MetricCard
        label="Tokens saved"
        value={hasRunData ? stats.tokens_saved.toLocaleString() : "0"}
        sub="via cache"
        tone={stats.tokens_saved > 0 ? "purple" : undefined}
      />
      <MetricCard
        label="Cost saved"
        value={stats.cost_saved > 0 ? fmtCost(stats.cost_saved) : "—"}
        sub="vs all-API"
        tone={stats.cost_saved > 0 ? "green" : undefined}
      />
    </div>
  );
});
