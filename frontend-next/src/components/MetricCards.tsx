"use client";

import { memo, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { LiveStats } from "@/types";
import { fmtCost } from "@/lib/api";

interface Props { stats: LiveStats; }

interface StatProps {
  icon:  React.ReactNode;
  label: string;
  value: string;
  sub:   string;
}

function AnimatedStatValue({ value }: { value: string }) {
  const prev = useRef(value);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    setPop(true);
    const t = setTimeout(() => setPop(false), 380);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className={clsx("stat-value", pop && "stat-value-pop")}>
      {value}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: StatProps) {
  return (
    <div className="ge-card stat-card">
      <div className="stat">
        <div className="stat-icon">{icon}</div>
        <div className="stat-content">
          <div className="stat-label">{label}</div>
          <AnimatedStatValue value={value} />
          <div className="stat-subtext">{sub}</div>
        </div>
      </div>
    </div>
  );
}

export const MetricCards = memo(function MetricCards({ stats }: Props) {
  const hitPct = stats.total > 0 ? Math.round((stats.hits / stats.total) * 100) : null;

  return (
    <div className="shrink-0 flex flex-col gap-5">
      <div className="ge-row ge-col-3">
        <StatCard
          icon={<ServerIcon />}
          label="Total calls"
          value={stats.total.toLocaleString()}
          sub="prompts in this run"
        />
        <StatCard
          icon={<CheckIcon />}
          label="Cache hit rate"
          value={hitPct !== null ? `${hitPct}%` : "—"}
          sub={`${stats.hits} hits · ${stats.misses} misses`}
        />
        <StatCard
          icon={<ExactIcon />}
          label="Exact hits"
          value={stats.exact.toLocaleString()}
          sub="identical prompt and response"
        />
      </div>

      <div className="ge-row ge-col-3">
        <StatCard
          icon={<SemanticIcon />}
          label="Semantic hits"
          value={stats.semantic.toLocaleString()}
          sub="matched by similarity score"
        />
        <StatCard
          icon={<TokenIcon />}
          label="Tokens saved"
          value={stats.tokens_saved > 0 ? stats.tokens_saved.toLocaleString() : "0"}
          sub="not sent to the API"
        />
        <StatCard
          icon={<TrendIcon />}
          label="Cost saved"
          value={stats.cost_saved > 0 ? fmtCost(stats.cost_saved) : "—"}
          sub="vs calling the API every time"
        />
      </div>
    </div>
  );
});

function ServerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" />
      <circle cx="6" cy="6" r="1" fill="currentColor" /><circle cx="6" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ExactIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
    </svg>
  );
}
function SemanticIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" /><path d="M12 6v6l4 2" />
    </svg>
  );
}
function TokenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 8l-4 4 4 4M17 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 1v22" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}
