"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { uploadSuite, fetchRecommendations, applyThreshold } from "@/lib/api";
import { ModelPicker } from "@/components/ModelPicker";
import { ConfigLabel, InfoTip } from "@/components/InfoTip";
import { RunHistory } from "@/components/RunHistory";
import { StyledSelect } from "@/components/StyledSelect";
import { TIPS } from "@/lib/tooltips";
import {
  defaultModelForProvider,
  type Provider,
} from "@/lib/models";
import type { RunConfig, RunDetail, ThresholdRecommendation } from "@/types";
import clsx from "clsx";

interface Props {
  config:       RunConfig;
  setConfig:    Dispatch<SetStateAction<RunConfig>>;
  suites:       string[];
  setSuites:    Dispatch<SetStateAction<string[]>>;
  refreshTick:  number;
  onRerun: (cfg: {
    suite_name: string; model: string; provider: string; threshold: number; repeat_factor: number;
  }) => void;
  onViewRun: (detail: RunDetail) => void;
  onRun?:       () => void;
  onClear?:     () => void;
  running?:     boolean;
  keysReady?:   boolean;
  onOpenKeys?:  () => void;
}

export function LeftSidebar({
  config, setConfig, suites, setSuites,
  refreshTick, onRerun, onViewRun,
  onRun, onClear, running = false, keysReady = false, onOpenKeys,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rec, setRec] = useState<ThresholdRecommendation | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchRecommendations()
      .then((data) => {
        const match = data.recommendations.find(
          (r) => r.suite === config.suite_name && r.model === config.model,
        );
        setRec(match ?? data.recommendations[0] ?? null);
      })
      .catch(() => setRec(null));
  }, [refreshTick, config.suite_name, config.model]);

  async function handleApplyRec() {
    if (!rec) return;
    setApplying(true);
    try {
      const { applied } = await applyThreshold(config.suite_name, config.model, "cold");
      setConfig((c) => ({ ...c, threshold: applied.threshold }));
    } finally {
      setApplying(false);
    }
  }

  const set = <K extends keyof RunConfig>(key: K, val: RunConfig[K]) =>
    setConfig(c => ({ ...c, [key]: val }));

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { saved } = await uploadSuite(file);
      setSuites(prev => Array.from(new Set([...prev, saved])).sort());
      set("suite_name", saved);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Could not upload suite. Use a .json or .csv file.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleProviderChange(provider: Provider) {
    setConfig((c) => ({
      ...c,
      provider,
      model: defaultModelForProvider(provider),
    }));
  }

  return (
    <div className="sidebar-body">
      <div id="sidebar-panel-config" className="cfg">
        <div className="cg">
          <ConfigLabel tip={TIPS.provider}>Provider</ConfigLabel>
          <div className="tabs" role="radiogroup" aria-label="API provider">
            {(["openai", "anthropic"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={config.provider === p}
                className={clsx("tab-btn", config.provider === p && "active")}
                onClick={() => handleProviderChange(p)}
              >
                {p === "openai" ? "OpenAI" : "Anthropic"}
              </button>
            ))}
          </div>
          <ConfigLabel tip={TIPS.model}>Model</ConfigLabel>
          <ModelPicker
            id="run-model"
            className="mt-1.5"
            provider={config.provider}
            value={config.model}
            onChange={(model) => set("model", model)}
          />
        </div>

        <div className="cg">
          <ConfigLabel tip={TIPS.suite}>Suite</ConfigLabel>
          <StyledSelect
            id="run-suite"
            tone="sidebar"
            value={config.suite_name}
            onChange={(suite) => set("suite_name", suite)}
            options={suites.map((s) => ({ value: s, label: s }))}
          />

          <div className="mt-2">
            <ConfigLabel tip={TIPS.repeatFactor}>Repeat factor</ConfigLabel>
            <div className="rrow">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={clsx("rb", config.repeat_factor === n && "on")}
                  onClick={() => set("repeat_factor", n)}
                >
                  {n}×
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="upload-zone"
            title={TIPS.uploadSuite}
          >
            {uploading ? "Uploading…" : "↑ Upload custom suite (.json / .csv)"}
          </button>
          <input ref={fileRef} type="file" accept=".json,.csv" className="hidden"
            aria-hidden
            onChange={e => handleUpload(e.target.files?.[0])} />
          {uploadError && (
            <p role="alert" className="mt-2 text-[11px]" style={{ color: "var(--red)" }}>
              {uploadError}
            </p>
          )}
        </div>

        <div className="cg">
          {rec && rec.suite === config.suite_name && rec.model === config.model && (
            <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
              <span style={{ color: "var(--t2)" }} className="inline-flex items-center gap-1">
                Recommended {rec.optimal_threshold.toFixed(2)}
                <InfoTip content={TIPS.recommendedThreshold} placement="right" />
              </span>
              <button
                type="button"
                onClick={handleApplyRec}
                disabled={applying || Math.abs(config.threshold - rec.optimal_threshold) < 0.001}
                className="fp on"
              >
                {applying ? "…" : "Apply"}
              </button>
            </div>
          )}
          <ConfigLabel tip={TIPS.threshold}>Similarity threshold</ConfigLabel>
          <div className="rng">
            <input
              id="cache-threshold"
              type="range"
              min={0.5}
              max={1}
              step={0.01}
              value={config.threshold}
              onChange={e => set("threshold", +e.target.value)}
            />
            <span className="rng-val">{config.threshold.toFixed(2)}</span>
          </div>
          <div className="mt-2">
            <ConfigLabel tip={TIPS.delayMs}>Pause between calls (ms)</ConfigLabel>
            <input
              id="cache-delay-ms"
              type="number"
              className="mock-input"
              min={0}
              max={5000}
              step={50}
              value={config.delay_between_ms}
              onChange={e => set("delay_between_ms", +e.target.value)}
            />
          </div>
        </div>

        <div className="sidebar-run-actions">
          {!keysReady && onOpenKeys && (
            <button type="button" className="btn-clear-cache" onClick={onOpenKeys}>
              Add API keys to run tests
            </button>
          )}
          {onRun && (
            <button
              type="button"
              className="btn-run-suite"
              onClick={onRun}
              disabled={running || !keysReady}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="#fff" aria-hidden>
                <path d="M2 1.5v9l8-4.5z" />
              </svg>
              {running ? "Running…" : "Run test suite"}
            </button>
          )}
          {onClear && (
            <button
              type="button"
              className="btn-clear-cache"
              onClick={onClear}
              disabled={running}
            >
              Clear cache for this model
            </button>
          )}
        </div>
      </div>

      <div className="sidebar-past-runs">
        <p className="sidebar-past-label">PAST RUNS</p>
        <RunHistory
          embedded
          refreshTick={refreshTick}
          onRerun={onRerun}
          onViewRun={onViewRun}
        />
      </div>
    </div>
  );
}
