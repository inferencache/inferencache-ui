"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { HeroMetricCard, MetricCard } from "@/components/MetricCard";
import { LiveFeed } from "@/components/LiveFeed";
import { CacheMapMini } from "@/components/CacheMapMini";
import { CacheMap, type CacheEntry } from "@/components/CacheMap";
import { SavingsBreakdown } from "@/components/SavingsBreakdown";
import { TuningTab } from "@/components/TuningTab";
import { CallLog } from "@/components/CallLog";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ResizableSidebar } from "@/components/ResizableSidebar";
import { ApiKeysModal } from "@/components/ApiKeysModal";
import { MetricsGrid } from "@/components/metrics/MetricsGrid";
import { HitBar } from "@/components/HitBar";
import { RunProgress } from "@/components/RunProgress";
import { LazyCharts } from "@/components/LazyCharts";

import { fetchSuites, fetchCostSaved, setThreshold } from "@/lib/api";
import { parseDashboardTab, tabHref } from "@/lib/dashboardNav";
import { useRunSession } from "@/lib/useRunSession";
import { useApiKeys } from "@/lib/useApiKeys";

import type { RunConfig, RunDetail } from "@/types";
import type { DashboardTab } from "@/lib/dashboardNav";

// ── Config / stats types ───────────────────────────────────────────────────────

interface StatsData {
  total_entries: number;
  total_hits: number;
  exact_hits: number;
  semantic_hits: number;
  hit_rate: number;
  top_entries: { prompt: string; model: string; hit_count: number; created_at: number }[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function fetchStats(model = "gpt-4o-mini"): Promise<StatsData | null> {
  try {
    const res = await fetch(`${API_BASE}/stats?model=${encodeURIComponent(model)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function fetchConfig(): Promise<{ threshold: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/config`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function fetchEntries(model = "gpt-4o-mini", limit = 500): Promise<CacheEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/entries?model=${encodeURIComponent(model)}&limit=${limit}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.entries ?? [];
  } catch { return []; }
}

// ── Default run config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: RunConfig = {
  suite_name:        "general_qa",
  model:             "gpt-4o-mini",
  provider:          "openai",
  threshold:         0.85,
  repeat_factor:     2,
  delay_between_ms:  200,
  openai_api_key:    "",
  anthropic_api_key: "",
};

const TYPE_PRESETS = [
  { label: "CODE",           value: "0.92" },
  { label: "DETERMINISTIC",  value: "0.95" },
  { label: "RAG",            value: "0.88" },
  { label: "CONVERSATIONAL", value: "0.82" },
] as const;

// ── Bar row helper ─────────────────────────────────────────────────────────────

function BarRow({
  label, count, max, color,
}: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const short = label.length > 14 ? label.slice(0, 13) + "…" : label;
  return (
    <div className="ds-bar-row">
      <span className="ds-bar-label" title={label}>{short}</span>
      <div className="ds-bar-track">
        <div className="ds-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="ds-bar-count">{count}</span>
    </div>
  );
}

function detectPromptColor(prompt: string): string {
  const p = prompt.toLowerCase();
  if (/\b(function|class|import|def |const |var |git |test|debug|fix|refactor|implement)\b/.test(p)) return "#3b82f6";
  if (/\b(explain|what is|how does|describe|summarize|why)\b/.test(p)) return "#a78bfa";
  if (/\b(what|when|where|who|which|how many|how much|\?)\b/.test(p)) return "#f59e0b";
  return "#4b5563";
}

// ── Overview section ───────────────────────────────────────────────────────────

function OverviewTab({ model }: { model: string }) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [moneySaved, setMoneySaved] = useState<number>(0);
  const [tierBreakdown, setTierBreakdown] = useState({ exact: 0, semantic: 0, generative: 0 });
  const [configData, setConfigData] = useState({ threshold: 0.85, semantic: true, generative: true });

  const load = useCallback(async () => {
    const [s, costRows] = await Promise.all([
      fetchStats(model),
      fetchCostSaved(model, 24 * 30),
    ]);
    setStats(s);
    if (costRows.length > 0) {
      const total = costRows[costRows.length - 1].cumulative_saved;
      setMoneySaved(total);
      const sumCost = costRows.reduce((acc, r) => acc + r.cost_saved, 0);
      setTierBreakdown({ exact: sumCost * 0.6, semantic: sumCost * 0.3, generative: sumCost * 0.1 });
    }
    const cfg = await fetchConfig();
    if (cfg) setConfigData((prev) => ({ ...prev, threshold: cfg.threshold }));
  }, [model]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const topEntries = stats?.top_entries ?? [];
  const maxHits = topEntries.reduce((m, e) => Math.max(m, e.hit_count), 1);

  const hitRate = stats ? stats.hit_rate : null;
  const hitRatePct = hitRate != null ? `${(hitRate * 100).toFixed(0)}%` : "—";
  const hitRateSub = stats ? `${stats.total_hits} of ${stats.total_hits + Math.round(stats.total_hits / Math.max(stats.hit_rate, 0.001) - stats.total_hits)} calls` : "—";
  const tokensSaved = moneySaved > 0 ? `${Math.round(moneySaved / 0.000003 / 1000)}k` : "0";
  const totalEntries = stats?.total_entries ?? 0;

  const totalCostAvoided = tierBreakdown.exact + tierBreakdown.semantic + tierBreakdown.generative;
  const netSaved = totalCostAvoided - tierBreakdown.generative * 0.3;

  return (
    <div className="ds-tab-page" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* 2a — Hero row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr",
        gap: 10,
      }}>
        <HeroMetricCard
          value={`$${moneySaved.toFixed(2)}`}
          sub="vs. paying full API price · this month"
        />
        <MetricCard
          label="Hit rate"
          value={hitRatePct}
          sub={hitRateSub}
        />
        <MetricCard
          label="Tokens saved"
          value={tokensSaved}
          sub="estimated input tokens"
        />
        <MetricCard
          label="Cache entries"
          value={String(totalEntries)}
          sub="stored prompts"
        />
      </div>

      {/* 2b — Mid row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <CacheMapMini entries={topEntries} count={totalEntries} />

        {/* Top cached prompts */}
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Top cached prompts</span>
            <span className="ds-card-meta">by hit count</span>
          </div>
          {topEntries.length === 0 ? (
            <div style={{ padding: "16px 0", fontSize: 12, color: "var(--muted)" }}>
              No cache entries yet
            </div>
          ) : (
            topEntries.slice(0, 6).map((e, i) => (
              <BarRow
                key={i}
                label={e.prompt}
                count={e.hit_count}
                max={maxHits}
                color={detectPromptColor(e.prompt)}
              />
            ))
          )}
        </div>
      </div>

      {/* 2c — Live feed strip */}
      <LiveFeed />

      {/* 2d — Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Config card */}
        <div className="ds-card">
          <div className="ds-card-header">
            <span className="ds-card-title">Config</span>
          </div>
          <div>
            {[
              { k: "Similarity threshold", v: configData.threshold.toFixed(2) },
              { k: "Semantic cache",       v: configData.semantic ? "on" : "off" },
              { k: "Generative reuse",     v: configData.generative ? "on" : "off" },
              { k: "TTL class",            v: "PERMANENT" },
              { k: "Embedding model",      v: "all-MiniLM-L6-v2" },
            ].map(({ k, v }, i) => (
              <div key={i} className="ds-config-row">
                <span className="ds-config-key">{k}</span>
                <span className="ds-config-val">{v}</span>
              </div>
            ))}
          </div>
          <div className="ds-thresh-pills">
            {TYPE_PRESETS.map((p) => (
              <span key={p.label} className="ds-thresh-pill">
                {p.label} <span className="ds-thresh-pill-num">{p.value}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Savings breakdown */}
        <SavingsBreakdown
          exact={tierBreakdown.exact}
          semantic={tierBreakdown.semantic}
          generative={tierBreakdown.generative}
          totalCostAvoided={totalCostAvoided}
          costIncurred={tierBreakdown.generative * 0.3}
          netSaved={netSaved}
        />
      </div>
    </div>
  );
}

// ── Cache map tab ──────────────────────────────────────────────────────────────

function CacheMapTab({ model }: { model: string }) {
  const [entries, setEntries] = useState<CacheEntry[]>([]);

  useEffect(() => {
    fetchEntries(model).then(setEntries);
  }, [model]);

  return (
    <div className="app-shell-body" style={{ flexDirection: "column" }}>
      <CacheMap entries={entries} />
    </div>
  );
}

// ── Live tab ───────────────────────────────────────────────────────────────────

interface LiveTabProps {
  config: RunConfig;
  setConfig: React.Dispatch<React.SetStateAction<RunConfig>>;
  suites: string[];
  setSuites: React.Dispatch<React.SetStateAction<string[]>>;
  refreshTick: number;
  onRerun: (cfg: { suite_name: string; model: string; provider: string; threshold: number; repeat_factor: number }) => void;
  onViewRun: (detail: RunDetail) => void;
  onRun: () => void;
  onClear: () => void;
  running: boolean;
  hasKey: boolean;
  onOpenKeys: () => void;
  session: ReturnType<typeof useRunSession>;
}

function LiveTab({
  config, setConfig, suites, setSuites, refreshTick,
  onRerun, onViewRun, onRun, onClear, running, hasKey, onOpenKeys, session,
}: LiveTabProps) {
  const { phase, entries, timeline, stats, progress, total, pending, elapsedMs, etaMs, timerStartedAt, runId, runError, viewingSavedRun } = session;

  return (
    <div className="app-shell-body">
      <ResizableSidebar>
        <LeftSidebar
          config={config} setConfig={setConfig}
          suites={suites} setSuites={setSuites}
          refreshTick={refreshTick}
          onRerun={onRerun}
          onViewRun={onViewRun}
          onRun={onRun}
          onClear={onClear}
          running={running}
          keysReady={hasKey}
          onOpenKeys={onOpenKeys}
        />
      </ResizableSidebar>
      <div className="main-column">
        <main id="main-content" tabIndex={-1} className="main-content outline-none">
          <div className="content">
            <MetricsGrid stats={stats} />
            <HitBar stats={stats} />
            <RunProgress
              phase={phase} progress={progress} total={total}
              timerStartedAt={timerStartedAt}
              elapsedMs={elapsedMs} etaMs={etaMs}
              runId={runId} timeline={timeline}
              viewingSavedRun={viewingSavedRun}
              runError={runError}
            />
            <LazyCharts
              timeline={timeline}
              live={phase === "running" || phase === "starting" || phase === "summarizing"}
            />
            <CallLog
              entries={entries}
              pending={pending}
              hasKey={hasKey}
              runId={runId}
              runError={runError}
              phase={phase}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseDashboardTab(searchParams.get("tab"));

  const [config, setConfig] = useState<RunConfig>(DEFAULT_CONFIG);
  const [suites, setSuites] = useState<string[]>(["general_qa", "coding", "summarization"]);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const session = useRunSession();
  const { running, phase } = session;
  const { keys, addKey, deleteKey, getKey } = useApiKeys();

  const prevPhase = useRef(phase);
  useEffect(() => {
    if (prevPhase.current !== "done" && phase === "done") setRefreshTick((t) => t + 1);
    prevPhase.current = phase;
  }, [phase]);

  useEffect(() => {
    fetchSuites().then((s) => s.length > 0 && setSuites(s)).catch(() => {});
  }, []);

  const navigateTab = useCallback((tab: DashboardTab) => {
    router.replace(tabHref(tab), { scroll: false });
  }, [router]);

  const openaiKey    = getKey("openai");
  const anthropicKey = getKey("anthropic");
  const hasKey = !!openaiKey || !!anthropicKey;

  const handleRun = useCallback(() => {
    session.run({ ...config, openai_api_key: openaiKey, anthropic_api_key: anthropicKey });
    navigateTab("live");
  }, [session, config, openaiKey, anthropicKey, navigateTab]);

  const handleClear = useCallback(() => {
    session.clear(config.model);
  }, [session, config.model]);

  const handleRerun = useCallback((cfg: {
    suite_name: string; model: string; provider: string; threshold: number; repeat_factor: number;
  }) => {
    setConfig((prev) => ({ ...prev, ...cfg, provider: cfg.provider as RunConfig["provider"] }));
  }, []);

  const handleViewRun = useCallback((detail: RunDetail) => {
    session.loadSavedRun(detail);
    setConfig((prev) => ({
      ...prev,
      suite_name:    detail.suite_name,
      model:         detail.model,
      provider:      detail.provider as RunConfig["provider"],
      threshold:     detail.threshold,
      repeat_factor: detail.repeat_factor,
    }));
    navigateTab("live");
  }, [session, navigateTab]);

  const handleThresholdChange = useCallback(async (t: number) => {
    await setThreshold(config.model, t).catch(() => {});
    setConfig((prev) => ({ ...prev, threshold: t }));
  }, [config.model]);

  return (
    <>
      {activeTab === "overview" && (
        <OverviewTab model={config.model} />
      )}

      {activeTab === "map" && (
        <CacheMapTab model={config.model} />
      )}

      {activeTab === "live" && (
        <LiveTab
          config={config} setConfig={setConfig}
          suites={suites} setSuites={setSuites}
          refreshTick={refreshTick}
          onRerun={handleRerun}
          onViewRun={handleViewRun}
          onRun={handleRun}
          onClear={handleClear}
          running={running}
          hasKey={hasKey}
          onOpenKeys={() => setShowKeyModal(true)}
          session={session}
        />
      )}

      {activeTab === "tuning" && (
        <div className="tab-page">
          <TuningTab
            model={config.model}
            threshold={config.threshold}
            onThresholdChange={handleThresholdChange}
          />
        </div>
      )}

      {activeTab === "devtools" && (
        <LiveTab
          config={config} setConfig={setConfig}
          suites={suites} setSuites={setSuites}
          refreshTick={refreshTick}
          onRerun={handleRerun}
          onViewRun={handleViewRun}
          onRun={handleRun}
          onClear={handleClear}
          running={running}
          hasKey={hasKey}
          onOpenKeys={() => setShowKeyModal(true)}
          session={session}
        />
      )}

      {showKeyModal && (
        <ApiKeysModal keys={keys} onAdd={addKey} onDelete={deleteKey} onClose={() => setShowKeyModal(false)} />
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  );
}
