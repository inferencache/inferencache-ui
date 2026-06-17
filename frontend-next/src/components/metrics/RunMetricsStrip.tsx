"use client";

import { memo } from "react";
import { MetricCell } from "@/components/metrics/MetricCell";
import { fmtCost } from "@/lib/api";
import { TIPS } from "@/lib/tooltips";
import type { LiveStats } from "@/types";

interface Props {
  stats: LiveStats;
}

export const RunMetricsStrip = memo(function RunMetricsStrip({ stats }: Props) {
  const hasRunData = stats.total > 0;
  const hitPct = hasRunData
    ? `${Math.round((stats.hits / stats.total) * 100)}%`
    : "—";

  return (
    <div className="mstrip" aria-label="Current run statistics">
      <MetricCell
        label="Total calls"
        value={hasRunData ? stats.total.toLocaleString() : "0"}
        sub="this run"
        tip={TIPS.totalCalls}
      />
      <MetricCell
        label="Hit rate"
        value={hitPct}
        sub={`${stats.hits} hits · ${stats.misses} misses`}
        tone={hasRunData ? "green" : undefined}
        tip={TIPS.hitRate}
      />
      <MetricCell
        label="Exact hits"
        value={hasRunData ? String(stats.exact) : "0"}
        sub="SHA-256 match"
        tone={stats.exact > 0 ? "green" : undefined}
        tip={TIPS.exactHits}
      />
      <MetricCell
        label="Semantic hits"
        value={hasRunData ? String(stats.semantic) : "0"}
        sub="embedding match"
        tone={stats.semantic > 0 ? "amber" : undefined}
        tip={TIPS.semanticHits}
      />
      <MetricCell
        label="Tokens saved"
        value={hasRunData ? stats.tokens_saved.toLocaleString() : "0"}
        sub="via cache"
        tone={stats.tokens_saved > 0 ? "purple" : undefined}
        tip={TIPS.tokensSaved}
      />
      <MetricCell
        label="Cost saved"
        value={stats.cost_saved > 0 ? fmtCost(stats.cost_saved) : "—"}
        sub="vs all-API"
        tone={stats.cost_saved > 0 ? "green" : undefined}
        tip={TIPS.costSaved}
      />
    </div>
  );
});
