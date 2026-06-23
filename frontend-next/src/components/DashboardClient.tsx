"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppNavbar } from "@/components/AppNavbar";
import { MetricsGrid }     from "@/components/metrics/MetricsGrid";
import { HitBar }          from "@/components/HitBar";
import { RunProgress }     from "@/components/RunProgress";
import { LazyCharts }      from "@/components/LazyCharts";
import { CallLog }         from "@/components/CallLog";
import { AnalyticsTab }    from "@/components/AnalyticsTab";
import { TuningTab }       from "@/components/TuningTab";
import { LeftSidebar }     from "@/components/LeftSidebar";
import { ResizableSidebar } from "@/components/ResizableSidebar";
import { ApiKeysModal }    from "@/components/ApiKeysModal";
import {
  fetchSuites, downloadTimelineCsv, fetchAnalysis, setThreshold,
} from "@/lib/api";
import { useRunSession }   from "@/lib/useRunSession";
import { useApiKeys }      from "@/lib/useApiKeys";
import type { RunConfig, RunDetail } from "@/types";

type Tab = "live" | "analytics" | "tuning";

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

export function DashboardClient() {
  const searchParams = useSearchParams();
  const [config,       setConfig]       = useState<RunConfig>(DEFAULT_CONFIG);
  const [suites,       setSuites]       = useState<string[]>(["general_qa", "coding", "summarization"]);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [refreshTick,  setRefreshTick]  = useState(0);
  const [activeTab,    setActiveTab]    = useState<Tab>("live");

  const {
    running, phase, runId, runError, entries, timeline, stats,
    progress, total, pending, elapsedMs, etaMs, timerStartedAt,
    viewingSavedRun,
    run, clear, loadSavedRun,
  } = useRunSession();
  const { keys, addKey, deleteKey, getKey } = useApiKeys();

  const prevPhase = useRef(phase);

  useEffect(() => {
    if (prevPhase.current !== "done" && phase === "done") setRefreshTick(t => t + 1);
    prevPhase.current = phase;
  }, [phase]);

  useEffect(() => {
    fetchSuites().then(s => s.length > 0 && setSuites(s)).catch(() => {});
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "analytics" || tab === "tuning" || tab === "live") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const openaiKey    = getKey("openai");
  const anthropicKey = getKey("anthropic");

  const handleRun = useCallback(() => {
    run({ ...config, openai_api_key: openaiKey, anthropic_api_key: anthropicKey });
    setActiveTab("live");
  }, [run, config, openaiKey, anthropicKey]);

  const handleClear = useCallback(() => {
    clear(config.model);
  }, [clear, config.model]);

  const handleRerun = useCallback((cfg: {
    suite_name: string; model: string; provider: string; threshold: number; repeat_factor: number;
  }) => {
    setConfig(prev => ({ ...prev, ...cfg, provider: cfg.provider as RunConfig["provider"] }));
  }, []);

  const handleViewRun = useCallback((detail: RunDetail) => {
    loadSavedRun(detail);
    setConfig(prev => ({
      ...prev,
      suite_name:    detail.suite_name,
      model:         detail.model,
      provider:      detail.provider as RunConfig["provider"],
      threshold:     detail.threshold,
      repeat_factor: detail.repeat_factor,
    }));
    setActiveTab("live");
  }, [loadSavedRun]);

  const handleThresholdChange = useCallback(async (t: number) => {
    await setThreshold(config.model, t).catch(() => {});
    setConfig(prev => ({ ...prev, threshold: t }));
  }, [config.model]);

  const openKeys  = useCallback(() => setShowKeyModal(true),  []);
  const closeKeys = useCallback(() => setShowKeyModal(false), []);

  const keyStatuses = useMemo(
    () => ({ openai: !!openaiKey, anthropic: !!anthropicKey }),
    [openaiKey, anthropicKey],
  );

  const handleExportCsv = useCallback(() => {
    downloadTimelineCsv(timeline, `run-${runId ?? "export"}.csv`);
  }, [timeline, runId]);

  const hasKey   = keyStatuses.openai || keyStatuses.anthropic;

  return (
    <div className="app-shell h-screen overflow-hidden">
      <AppNavbar
        page="dashboard"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        running={running}
        phase={phase}
        progress={progress}
        total={total}
        keyCount={keys.length}
        keysReady={hasKey}
        onOpenKeys={openKeys}
        onRun={handleRun}
        onClear={handleClear}
        hasChart={timeline.length > 0}
        onExportCsv={handleExportCsv}
      />

      <div className="app-shell-body">
        <ResizableSidebar>
          <LeftSidebar
            config={config} setConfig={setConfig}
            suites={suites} setSuites={setSuites}
            refreshTick={refreshTick}
            onRerun={handleRerun}
            onViewRun={handleViewRun}
          />
        </ResizableSidebar>

        <div className="main-column">
          <main id="main-content" tabIndex={-1} className="main-content outline-none">
          {activeTab === "live" && (
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
          )}

          {activeTab === "analytics" && (
            <div className="content">
              <AnalyticsTab model={config.model} />
            </div>
          )}

          {activeTab === "tuning" && (
            <div className="content">
              <TuningTab
                model={config.model}
                threshold={config.threshold}
                onThresholdChange={handleThresholdChange}
              />
            </div>
          )}
        </main>
        </div>
      </div>

      {showKeyModal && (
        <ApiKeysModal keys={keys} onAdd={addKey} onDelete={deleteKey} onClose={closeKeys} />
      )}
    </div>
  );
}
