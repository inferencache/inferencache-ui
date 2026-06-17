"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import {
  estimateBatchCost,
  fetchPreset,
  fetchPresets,
  fmtCost,
  startBatch,
} from "@/lib/api";
import { StyledSelect } from "@/components/StyledSelect";
import type { BatchProgress, ExperimentPreset } from "@/types";

interface Props {
  batch:        BatchProgress;
  openaiKey:    string;
  anthropicKey: string;
  onRefresh:    () => void;
}

export function ExperimentPanel({ batch, openaiKey, anthropicKey, onRefresh }: Props) {
  const [open, setOpen]         = useState(false);
  const [presets, setPresets]   = useState<ExperimentPreset[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const loadPresets = useCallback(async () => {
    try {
      const list = await fetchPresets();
      setPresets(list);
      if (!selected && list.length > 0) setSelected(list[0].id);
    } catch {}
  }, [selected]);

  useEffect(() => { loadPresets(); }, [loadPresets]);

  const selectedPreset = presets.find((p) => p.id === selected);
  const estCost = selectedPreset
    ? estimateBatchCost(selectedPreset.cell_count, "gpt-4o-mini")
    : 0;

  async function handleStart() {
    if (!selected || !openaiKey) {
      setError("Add an OpenAI API key first. Click API keys in the top bar.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const preset = await fetchPreset(selected);
      await startBatch({
        ...preset,
        openai_api_key: openaiKey,
        anthropic_api_key: anthropicKey,
        skip_existing: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the experiment. Try again.");
    } finally {
      setStarting(false);
    }
  }

  const batchRunning = batch.phase === "running";
  const batchDone    = batch.phase === "complete";
  const pct = batch.total_cells > 0
    ? Math.round(((batch.completed + batch.skipped) / batch.total_cells) * 100)
    : 0;

  return (
    <div className="control-section overflow-hidden p-0">
      <button
        type="button"
        className="collapse-header"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="control-section-title mb-0">Experiments</span>
          {batchRunning && (
            <span className="text-[10px] cell-mono animate-pulse data-cell-teal">Running</span>
          )}
          {batchDone && (
            <span className="text-[10px] cell-mono data-cell-green">Complete</span>
          )}
        </div>
        <span className={clsx("collapse-chevron", open && "is-open")}>▾</span>
      </button>

      {open && (
        <div className="collapse-body animate-collapse-in">
          <div>
            <label className="field-label">Experiment preset</label>
            <StyledSelect
              value={selected ?? ""}
              onChange={setSelected}
              disabled={batchRunning}
              size="sm"
              options={presets.map((p) => ({
                value: p.id,
                label: `${p.id.replace(/_/g, " ")} — ${p.cell_count} runs`,
              }))}
            />
            {selectedPreset && (
              <p className="mt-1.5 text-[10px] leading-relaxed text-t-3">
                {selectedPreset.description}
              </p>
            )}
          </div>

          {selectedPreset && (
            <div className="flex items-center justify-between text-[10px] cell-mono text-t-3">
              <span>{selectedPreset.cell_count} configurations · est. {fmtCost(estCost)}</span>
            </div>
          )}

          {(batchRunning || batchDone) && batch.total_cells > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] cell-mono">
                <span className="data-cell-teal">
                  {batch.completed + batch.skipped}/{batch.total_cells}
                  {batch.skipped > 0 && ` (${batch.skipped} skipped)`}
                </span>
                <span className="text-t-3">{pct}%</span>
              </div>
              <div className="progress-thin">
                <div
                  className={clsx("bar transition-all", batchDone ? "bar-fill-green" : "bar-fill-teal")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {batch.suite_name && batchRunning && (
                <p className="text-[10px] cell-mono truncate text-t-3">
                  {batch.suite_name} · {batch.model} · t={batch.threshold?.toFixed(2)} · {batch.cache_mode}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-[10px] cell-mono data-cell-red" role="alert">{error}</p>}

          <button
            type="button"
            onClick={handleStart}
            disabled={batchRunning || starting || !selected}
            className="btn btn-primary w-full justify-center disabled:opacity-50"
          >
            {starting ? "Starting…" : batchRunning ? "Experiment running…" : "Start batch experiment"}
          </button>

          {batchDone && (
            <button
              type="button"
              onClick={onRefresh}
              className="btn btn-outline w-full justify-center text-[10px] data-cell-green"
            >
              Refresh results
            </button>
          )}
        </div>
      )}
    </div>
  );
}
