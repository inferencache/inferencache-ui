"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearCache as apiClearCache,
  costPerToken,
  openEventStream,
  startRun,
} from "@/lib/api";
import { hydrateRunFromDetail } from "@/lib/hydrateRun";
import type {
  BatchProgress,
  LiveStats,
  PendingCall,
  RunConfig,
  RunDetail,
  RunEvent,
  RunPhase,
  TimelinePoint,
} from "@/types";

const EMPTY_BATCH: BatchProgress = {
  batch_id: "", cell_index: 0, total_cells: 0,
  completed: 0, skipped: 0, phase: "idle",
};

const EMPTY_STATS: LiveStats = {
  total:        0,
  hits:         0,
  exact:        0,
  semantic:     0,
  generative:   0,
  misses:       0,
  tokens_saved: 0,
  cost_saved:   0,
  total_tokens: 0,
  total_cost:   0,
};

export function useRunSession() {
  const [phase,     setPhase]     = useState<RunPhase>("idle");
  const [running,   setRunning]   = useState(false);
  const [entries,   setEntries]   = useState<RunEvent[]>([]);
  const [timeline,  setTimeline]  = useState<TimelinePoint[]>([]);
  const [stats,     setStats]     = useState<LiveStats>(EMPTY_STATS);
  const [progress,  setProgress]  = useState(0);
  const [total,     setTotal]     = useState(0);
  const [pending,   setPending]   = useState<PendingCall | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [etaMs,     setEtaMs]     = useState<number | null>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchProgress>(EMPTY_BATCH);
  const [viewingSavedRun, setViewingSavedRun] = useState(false);

  const cleanupRef   = useRef<(() => void) | null>(null);
  const runIdRef     = useRef<string | null>(null);
  const tlIdxRef     = useRef(0);
  const startedAtRef = useRef<number>(0);

  // Running mean of observed call latencies for ETA estimation
  const latencySumRef   = useRef(0);
  const latencyCountRef = useRef(0);

  // Refs that hold the latest progress/total for ETA calc
  const progressRef = useRef(0);
  const totalRef    = useRef(0);
  const delayRef    = useRef(0);

  function stopTimer() {
    if (startedAtRef.current > 0) {
      setElapsedMs(Date.now() - startedAtRef.current);
    }
    setTimerStartedAt(null);
  }

  function startTimer() {
    startedAtRef.current = Date.now();
    setTimerStartedAt(Date.now());
    setElapsedMs(0);
    setEtaMs(null);
  }

  function updateEta() {
    const rem = totalRef.current - progressRef.current;
    if (rem > 0 && latencyCountRef.current > 0) {
      const avgMs = latencySumRef.current / latencyCountRef.current;
      setEtaMs(rem * (avgMs + delayRef.current));
    } else {
      setEtaMs(null);
    }
  }

  const cptRef = useRef(costPerToken("gpt-4o-mini"));

  function belongsToActiveRun(ev: RunEvent & Record<string, unknown>): boolean {
    const activeId = runIdRef.current;
    if (!activeId) return true;
    const evRunId = ev.run_id as string | undefined;
    if (!evRunId) return true;
    return evRunId === activeId;
  }

  function noteError(message: string) {
    const msg = message.trim();
    if (!msg) return;
    setRunError(msg);
  }

  function handleEvent(ev: RunEvent & Record<string, unknown>) {
    const et = ev.event_type as string;

    if (et === "batch_start") {
      setBatch({
        batch_id: String(ev.batch_id ?? ""),
        cell_index: 0,
        total_cells: Number(ev.total_cells ?? 0),
        completed: 0,
        skipped: 0,
        phase: "running",
      });
      return;
    }
    if (et === "batch_cell_start") {
      // Reset per-cell live state
      setRunning(true);
      setPhase("starting");
      setEntries([]);
      setTimeline([]);
      setStats(EMPTY_STATS);
      setProgress(0);
      setTotal(0);
      setPending(null);
      tlIdxRef.current = 0;
      latencySumRef.current = 0;
      latencyCountRef.current = 0;
      progressRef.current = 0;
      cptRef.current = costPerToken(String(ev.model ?? "gpt-4o-mini"));
      setBatch((b) => ({
        ...b,
        cell_index: Number(ev.cell_index ?? 0),
        suite_name: String(ev.suite_name ?? ""),
        model: String(ev.model ?? ""),
        threshold: Number(ev.threshold ?? 0),
        cache_mode: ev.cache_mode as BatchProgress["cache_mode"],
      }));
      return;
    }
    if (et === "batch_cell_skip") {
      setBatch((b) => ({
        ...b,
        cell_index: Number(ev.cell_index ?? 0),
        skipped: Number(ev.skipped ?? b.skipped + 1),
      }));
      return;
    }
    if (et === "batch_cell_complete") {
      setBatch((b) => ({
        ...b,
        completed: Number(ev.completed ?? b.completed),
        skipped: Number(ev.skipped ?? b.skipped),
      }));
      return;
    }
    if (et === "batch_complete") {
      setRunning(false);
      setPhase("idle");
      setBatch({
        batch_id: String(ev.batch_id ?? ""),
        cell_index: Number(ev.total_cells ?? 0),
        total_cells: Number(ev.total_cells ?? 0),
        completed: Number(ev.completed ?? 0),
        skipped: Number(ev.skipped ?? 0),
        phase: "complete",
      });
      return;
    }

    if (!belongsToActiveRun(ev)) return;

    if (ev.event_type === "start") {
      const tot = ev.total_prompts ?? 0;
      setTotal(tot);
      totalRef.current = tot;
      setPhase("running");
      startTimer();
    }

    if (ev.event_type === "call_start") {
      setPending({
        prompt_index:   ev.prompt_index ?? 0,
        prompt_preview: ev.prompt_preview ?? "",
        model:          ev.model ?? "",
      });
    }

    if (ev.event_type === "call") {
      setPending((prev) =>
        prev?.prompt_index === ev.prompt_index ? null : prev
      );
      setEntries((prev) => [...prev, ev]);
      setProgress((p) => {
        const next = p + 1;
        progressRef.current = next;
        return next;
      });

      const isHit     = ev.hit ?? false;
      const hitType   = ev.hit_type ?? "miss";
      const tokens    = ev.tokens_used ?? 0;
      const cost      = ev.cost_usd ?? 0;
      const latMs     = ev.latency_ms ?? 0;
      const cpt       = cptRef.current;
      const savedTok  = isHit ? (tokens || 200) : 0;
      const savedCost = isHit ? (tokens || 200) * cpt : 0;

      latencySumRef.current  += latMs;
      latencyCountRef.current += 1;
      updateEta();

      setStats((prev) => ({
        total:        prev.total + 1,
        hits:         prev.hits + (isHit ? 1 : 0),
        exact:        prev.exact + (hitType === "exact" ? 1 : 0),
        semantic:     prev.semantic + (hitType === "semantic" ? 1 : 0),
        generative:   prev.generative + (hitType === "generative" ? 1 : 0),
        misses:       prev.misses + (isHit ? 0 : 1),
        tokens_saved: prev.tokens_saved + savedTok,
        cost_saved:   prev.cost_saved + savedCost,
        total_tokens: prev.total_tokens + tokens,
        total_cost:   prev.total_cost + cost,
      }));

      const idx = tlIdxRef.current++;
      setTimeline((prev) => [
        ...prev,
        {
          idx,
          hit_ms:  isHit ? latMs : null,
          miss_ms: !isHit ? latMs : null,
          cost,
          tokens,
          type: hitType,
        },
      ]);
    }

    if (ev.event_type === "summary") {
      setPending(null);
      setPhase("summarizing");
      setEntries((prev) => [...prev, ev]);
      stopTimer();
      setRunning(false);
      const errors = ev.api_errors ?? 0;
      const calls  = ev.total_calls ?? 0;
      const msgs   = ev.error_messages ?? [];
      if (msgs.length > 0) noteError(msgs[0]);
      else if (errors > 0) noteError(`${errors} API call${errors === 1 ? "" : "s"} failed`);
      setTimeout(() => {
        if (errors > 0 && calls === 0) setPhase("error");
        else if (errors > 0) setPhase("done");
        else setPhase("done");
      }, 600);
    }

    if (ev.event_type === "error") {
      setPending(null);
      const msg = ev.message ?? "Unknown error";
      noteError(msg);
      setEntries((prev) => [...prev, ev]);
      if (ev.prompt_index != null) {
        setProgress((p) => {
          const next = p + 1;
          progressRef.current = next;
          return next;
        });
      }
      if (ev.prompt_index == null) {
        setPhase("error");
        stopTimer();
        setRunning(false);
      }
    }
  }

  // Persistent SSE — stays open for single runs and batch runs
  useEffect(() => {
    const cleanup = openEventStream(handleEvent);
    cleanupRef.current = cleanup;
    return cleanup;
  }, []);

  const run = useCallback(async (config: RunConfig) => {
    if (running) return;

    setViewingSavedRun(false);
    setRunId(null);
    runIdRef.current = null;
    setRunError(null);
    setRunning(true);
    setPhase("starting");
    setEntries([]);
    setTimeline([]);
    setStats(EMPTY_STATS);
    setProgress(0);
    setTotal(0);
    setPending(null);
    setElapsedMs(0);
    setEtaMs(null);
    tlIdxRef.current       = 0;
    latencySumRef.current  = 0;
    latencyCountRef.current = 0;
    progressRef.current    = 0;
    totalRef.current       = 0;
    delayRef.current       = config.delay_between_ms ?? 0;
    cptRef.current         = costPerToken(config.model);

    try {
      const { run_id } = await startRun(config);
      runIdRef.current = run_id;
      setRunId(run_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start run";
      setRunError(message);
      setEntries([{
        event_type: "error",
        run_id: "",
        message,
      }]);
      setRunning(false);
      setPhase("error");
      stopTimer();
    }
  }, [running]);

  const clear = useCallback(async (model?: string) => {
    await apiClearCache(model);
    setViewingSavedRun(false);
    setStats(EMPTY_STATS);
    setEntries([]);
    setTimeline([]);
    setProgress(0);
    setTotal(0);
    setPending(null);
    setElapsedMs(0);
    setEtaMs(null);
    setPhase("idle");
    setRunId(null);
    runIdRef.current = null;
    setRunError(null);
  }, []);

  const loadSavedRun = useCallback((detail: RunDetail) => {
    if (running) return;
    const hydrated = hydrateRunFromDetail(detail);
    setViewingSavedRun(true);
    setRunning(false);
    setRunId(hydrated.runId);
    runIdRef.current = hydrated.runId;
    setRunError(hydrated.runError);
    setPhase(hydrated.phase);
    setEntries(hydrated.entries);
    setTimeline(hydrated.timeline);
    setStats(hydrated.stats);
    setProgress(hydrated.progress);
    setTotal(hydrated.total);
    setPending(null);
    setElapsedMs(hydrated.elapsedMs);
    setEtaMs(null);
    setTimerStartedAt(null);
    tlIdxRef.current = detail.calls.length;
  }, [running]);

  return {
    running, phase, runId, runError, batch, entries, timeline, stats,
    progress, total, pending, elapsedMs, etaMs, timerStartedAt,
    viewingSavedRun,
    run, clear, loadSavedRun,
  };
}
