import type {
  AlertState,
  AnalysisResult,
  BatchConfig,
  CostSavedPoint,
  EndpointRow,
  ExperimentPreset,
  FalsePositiveRow,
  HitRateBucket,
  RunCallRecord,
  RunConfig,
  RunDetail,
  RunEvent,
  RunRecord,
  SimilarityBucket,
  StaleMissRate,
  TierBreakdownRow,
  ThresholdRecommendation,
  TimeWindow,
} from "@/types";
import { MODEL_OUTPUT_CPT, costPerToken } from "@/lib/models";

export { costPerToken };

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export async function fetchSuites(): Promise<string[]> {
  const res = await fetch(`${BASE}/suites`);
  if (!res.ok) throw new Error("Failed to load suites");
  const data = await res.json();
  return data.suites ?? [];
}

export async function startRun(config: RunConfig): Promise<{ run_id: string }> {
  const res = await fetch(`${BASE}/run-suite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = (body as { detail?: string }).detail ?? detail;
    } catch { /* ignore */ }
    throw new Error(`Failed to start run: ${detail}`);
  }
  return res.json();
}

export async function clearCache(model?: string): Promise<{ deleted: number }> {
  const url = model ? `${BASE}/clear?model=${model}` : `${BASE}/clear`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error("Failed to clear cache");
  return res.json();
}

export async function setThreshold(model: string, threshold: number): Promise<void> {
  await fetch(`${BASE}/set-threshold`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, threshold }),
  });
}

export async function uploadSuite(file: File): Promise<{ saved: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/upload-suite`, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

/** Open an SSE connection and call onEvent for each parsed message. Returns a cleanup fn. */
export function openEventStream(onEvent: (e: RunEvent & Record<string, unknown>) => void): () => void {
  const es = new EventSource(`${BASE}/events`);
  es.onmessage = (msg) => {
    try {
      const parsed = JSON.parse(msg.data) as RunEvent & Record<string, unknown>;
      onEvent(parsed);
    } catch {}
  };
  return () => es.close();
}

// Cost table (USD per output token) — see lib/models.ts for full catalog
export const MODEL_CPT: Record<string, number> = MODEL_OUTPUT_CPT;

export function fmtCost(n: number | null | undefined): string {
  if (!n) return "$0.000000";
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(6)}`;
}

export function fmtMs(n: number): string {
  return `${n.toFixed(0)}ms`;
}

// ── Run history ───────────────────────────────────────────────────────────────

export async function fetchRuns(limit = 50): Promise<RunRecord[]> {
  const res = await fetch(`${BASE}/runs?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch runs");
  const data = await res.json();
  return data.runs ?? [];
}

export async function fetchRunDetail(runId: string): Promise<RunDetail> {
  const res = await fetch(`${BASE}/runs/${runId}`);
  if (!res.ok) throw new Error(`Failed to fetch run ${runId}`);
  return res.json();
}

export async function deleteRun(runId: string): Promise<void> {
  const res = await fetch(`${BASE}/runs/${runId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete run ${runId}`);
}

export function buildRunCsvUrl(runId: string, calls: RunCallRecord[]): string {
  const rows = [
    "index,hit_type,latency_ms,tokens_used,cost_usd,similarity,best_similarity,group_id,prompt_preview",
    ...calls.map((c) =>
      [
        c.prompt_index,
        c.hit_type,
        c.latency_ms.toFixed(1),
        c.tokens_used,
        c.cost_usd.toFixed(8),
        c.similarity.toFixed(4),
        (c.best_similarity ?? 0).toFixed(4),
        c.group_id ?? "",
        `"${c.prompt_preview.replace(/"/g, '""')}"`,
      ].join(",")
    ),
  ].join("\n");
  const blob = new Blob([rows], { type: "text/csv" });
  return URL.createObjectURL(blob);
}

// ── Experiments / batch ───────────────────────────────────────────────────────

export async function fetchPresets(): Promise<ExperimentPreset[]> {
  const res = await fetch(`${BASE}/experiment-presets`);
  if (!res.ok) throw new Error("Failed to fetch presets");
  const data = await res.json();
  return data.presets ?? [];
}

export async function fetchPreset(id: string): Promise<BatchConfig> {
  const res = await fetch(`${BASE}/experiment-presets/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch preset ${id}`);
  const data = await res.json();
  return {
    batch_id: data.batch_id,
    description: data.description ?? "",
    base: data.base ?? {},
    matrix: data.matrix ?? {},
    openai_api_key: "",
    anthropic_api_key: "",
    skip_existing: true,
  };
}

export async function startBatch(config: BatchConfig): Promise<{ batch_id: string; total_cells: number }> {
  const res = await fetch(`${BASE}/run-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? `Failed to start batch: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchBatchStatus(): Promise<{ running: boolean }> {
  const res = await fetch(`${BASE}/batch-status`);
  if (!res.ok) throw new Error("Failed to fetch batch status");
  return res.json();
}

/** Rough cost estimate for a batch preset (misses only, round 1). */
export function estimateBatchCost(
  cellCount: number,
  model: string,
  promptsPerSuite = 25,
  repeatFactor = 2,
): number {
  const cpt = costPerToken(model);
  const tokensPerMiss = 200;
  const missesPerRun = promptsPerSuite;
  return cellCount * missesPerRun * tokensPerMiss * cpt;
}

// ── Analysis / tuning ─────────────────────────────────────────────────────────

export async function fetchAnalysis(batchId?: string): Promise<AnalysisResult> {
  const url = batchId ? `${BASE}/analyze?batch_id=${batchId}` : `${BASE}/analyze`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch analysis");
  return res.json();
}

export async function fetchRecommendations(): Promise<{ recommendations: ThresholdRecommendation[] }> {
  const res = await fetch(`${BASE}/recommendations`);
  if (!res.ok) throw new Error("Failed to fetch recommendations");
  return res.json();
}

export async function applyThreshold(
  suiteName?: string,
  model?: string,
  cacheMode = "cold",
): Promise<{ applied: { model: string; suite: string; threshold: number } }> {
  const res = await fetch(`${BASE}/apply-threshold`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suite_name: suiteName, model, cache_mode: cacheMode }),
  });
  if (!res.ok) throw new Error("Failed to apply threshold");
  return res.json();
}

// ── Analytics endpoints (spec §8) ─────────────────────────────────────────────
// Prefer /cache-stats/ — ad blockers often block URLs containing "analytics".

async function fetchStatsData<T>(path: string, query: string): Promise<T[]> {
  for (const prefix of ["cache-stats", "analytics"]) {
    try {
      const res = await fetch(`${BASE}/${prefix}/${path}?${query}`);
      if (res.ok) return (await res.json()).data ?? [];
    } catch {
      /* try fallback prefix */
    }
  }
  return [];
}

export async function fetchHitRate(
  model: string,
  windowHours = 24,
  bucketMinutes = 30,
): Promise<HitRateBucket[]> {
  return fetchStatsData(
    "hit-rate",
    `model=${encodeURIComponent(model)}&window_hours=${windowHours}&bucket_minutes=${bucketMinutes}`,
  );
}

export async function fetchCostSaved(
  model: string,
  windowHours = 24,
): Promise<CostSavedPoint[]> {
  return fetchStatsData(
    "cost-saved",
    `model=${encodeURIComponent(model)}&window_hours=${windowHours}`,
  );
}

export async function fetchEndpoints(
  model: string,
  windowHours = 24,
): Promise<EndpointRow[]> {
  return fetchStatsData(
    "endpoints",
    `model=${encodeURIComponent(model)}&window_hours=${windowHours}`,
  );
}

export async function fetchTierBreakdown(
  model: string,
  windowHours = 24,
): Promise<TierBreakdownRow[]> {
  return fetchStatsData(
    "tier-breakdown",
    `model=${encodeURIComponent(model)}&window_hours=${windowHours}`,
  );
}

export async function fetchSimilarityDist(
  model: string,
  windowHours = 24,
  buckets = 20,
): Promise<SimilarityBucket[]> {
  return fetchStatsData(
    "similarity-dist",
    `model=${encodeURIComponent(model)}&window_hours=${windowHours}&buckets=${buckets}`,
  );
}

export async function fetchStaleMissRate(
  model: string,
  windowHours = 24,
): Promise<StaleMissRate | null> {
  for (const prefix of ["cache-stats", "analytics"]) {
    try {
      const res = await fetch(
        `${BASE}/${prefix}/stale-miss-rate?model=${encodeURIComponent(model)}&window_hours=${windowHours}`
      );
      if (res.ok) return (await res.json()).data ?? null;
    } catch {
      /* try fallback prefix */
    }
  }
  return null;
}

export async function fetchAlerts(model: string): Promise<AlertState | null> {
  const res = await fetch(`${BASE}/alerts/check?model=${encodeURIComponent(model)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function flagCallFalsePositive(
  callId: number,
  flagged: boolean,
): Promise<void> {
  await fetch(`${BASE}/calls/${callId}/flag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flagged }),
  });
}

export async function fetchFalsePositives(
  model: string,
  limit = 50,
): Promise<FalsePositiveRow[]> {
  const res = await fetch(
    `${BASE}/tuning/false-positives?model=${encodeURIComponent(model)}&limit=${limit}`
  );
  if (!res.ok) return [];
  const rows: Partial<FalsePositiveRow>[] = (await res.json()).data ?? [];
  return rows.map((row) => ({
    id: row.id ?? 0,
    prompt_hash: row.prompt_hash ?? "",
    similarity: row.similarity ?? 0,
    timestamp: row.timestamp ?? 0,
    original_prompt: row.original_prompt ?? "",
    cached_response: row.cached_response ?? "",
  }));
}

export type TimelineExportPoint = {
  idx:     number;
  hit_ms:  number | null;
  miss_ms: number | null;
  cost:    number;
  tokens?: number;
  type?:   string;
};

/** Build CSV text for a run timeline export. */
export function buildTimelineCsv(
  points: TimelineExportPoint[],
): string {
  const rows = [
    "call,type,latency_ms,cost_usd,tokens",
    ...points.map((p) => {
      const type = p.type ?? (p.hit_ms !== null ? "cache" : "api");
      const ms = p.hit_ms ?? p.miss_ms ?? 0;
      return [
        p.idx + 1,
        type,
        ms.toFixed(1),
        (p.cost ?? 0).toFixed(8),
        p.tokens ?? 0,
      ].join(",");
    }),
  ];
  return rows.join("\n");
}

/** Trigger a browser download of the run timeline CSV. */
export function downloadTimelineCsv(
  points: TimelineExportPoint[],
  filename = "run-export.csv",
): void {
  if (points.length === 0) return;
  const blob = new Blob([buildTimelineCsv(points)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** @deprecated chart-output.com no longer accepts ?data= CSV URLs */
export function buildChartOutputUrl(points: TimelineExportPoint[]): string {
  if (points.length === 0) return "https://chart-output.com";
  return `https://chart-output.com/?data=${encodeURIComponent(buildTimelineCsv(points))}`;
}
