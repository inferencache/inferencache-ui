// Types shared across all dashboard components

export type Provider = "openai" | "anthropic";

export type HitType = "exact" | "semantic" | "generative" | "miss" | "stale_miss";

export type CacheMode = "cold" | "warm";

export interface RunConfig {
  suite_name:        string;
  model:             string;
  provider:          Provider;
  threshold:         number;
  repeat_factor:     number;
  delay_between_ms:  number;
  openai_api_key:    string;
  anthropic_api_key: string;
  batch_id?:         string;
  cache_mode?:       CacheMode;
}

export type RunPhase = "idle" | "starting" | "running" | "summarizing" | "done" | "error";

export interface PendingCall {
  prompt_index:   number;
  prompt_preview: string;
  model:          string;
}

export interface RunEvent {
  event_type:    "start" | "call_start" | "call" | "summary" | "error";
  run_id:        string;
  // call fields
  prompt_index?:   number;
  total_prompts?:  number;
  prompt_preview?: string;
  hit?:            boolean;
  hit_type?:       HitType;
  similarity?:     number;
  latency_ms?:     number;
  tokens_used?:    number;
  cost_usd?:       number;
  model?:          string;
  response_preview?: string;
  // enriched call fields (spec §8.1)
  call_id?:        number;
  tokens_input?:   number | null;
  tokens_output?:  number | null;
  endpoint?:       string;
  session_id?:     string;
  matched_prompt?: string;
  adaptation_model?: string;
  adaptation_tokens_in?: number | null;
  adaptation_tokens_out?: number | null;
  adaptation_cost_usd?: number | null;
  // start fields
  suite?:          string;
  threshold?:      number;
  repeat_factor?:  number;
  // summary fields
  total_calls?:    number;
  cache_hits?:     number;
  exact_hits?:     number;
  semantic_hits?:  number;
  generative_hits?: number;
  total_tokens?:   number;
  total_cost_usd?: number;
  total_time_ms?:  number;
  hit_rate?:       number;
  api_errors?:     number;
  error_messages?: string[];
  // error
  message?:        string;
  // multi-tier fields
  tier1_hit?:       boolean;
  tier2_cached_tokens?: number;
  tier3_hit?:       boolean;
}

// ── Analytics types ───────────────────────────────────────────────────────────

export interface HitRateBucket {
  time_bucket:   number;
  exact_hits:    number;
  semantic_hits: number;
  generative_hits?: number;
  misses:        number;
  total_calls:   number;
}

export interface CostSavedPoint {
  timestamp:        number;
  cost_saved:       number;
  cumulative_saved: number;
}

export interface EndpointRow {
  endpoint:       string;
  total_calls:    number;
  cache_hits:     number;
  hit_rate:       number;
  avg_latency_ms: number;
  total_cost_usd: number;
  cost_saved_usd: number;
}

export interface TierBreakdownRow {
  tier:         "tier1_semantic" | "tier2_prefix" | "tier3_inference";
  label:        string;
  tokens_saved: number;
  cost_saved:   number;
  hit_count:    number;
}

export interface SimilarityBucket {
  bucket_floor:     number;
  count:            number;
  semantic_count?:  number;
  generative_count?: number;
}

export interface StaleMissRate {
  stale_misses:    number;
  regular_misses:  number;
  total_misses:    number;
  stale_miss_rate: number;
}

export type AlertStatus = "ok" | "warn" | "alert";

export interface AlertState {
  hit_rate:  { status: AlertStatus; value: number; drop: number };
  quality:   { status: AlertStatus; risky_ratio: number };
  cost_rate: { status: AlertStatus; hourly_usd: number };
}

export interface FalsePositiveRow {
  id:               number;
  prompt_hash:      string;
  similarity?:      number;
  timestamp?:       number;
  original_prompt?: string;
  cached_response?: string;
}

export type TimeWindow = "1h" | "6h" | "24h" | "7d" | "30d";
export const WINDOW_HOURS: Record<TimeWindow, number> = {
  "1h": 1, "6h": 6, "24h": 24, "7d": 168, "30d": 720,
};

export interface LiveStats {
  total:        number;
  hits:         number;
  exact:        number;
  semantic:     number;
  generative:   number;
  misses:       number;
  tokens_saved: number;
  cost_saved:   number;
  total_tokens: number;
  total_cost:   number;
}

export interface TimelinePoint {
  idx:     number;
  hit_ms:  number | null;
  miss_ms: number | null;
  cost:    number;
  tokens:  number;
  type:    HitType;
}

// ── Persisted run history ─────────────────────────────────────────────────────

export interface RunRecord {
  id:            string;
  created_at:    string;
  suite_name:    string;
  model:         string;
  provider:      string;
  threshold:     number;
  repeat_factor: number;
  total_calls:   number;
  cache_hits:    number;
  exact_hits:    number;
  semantic_hits: number;
  generative_hits?: number;
  total_tokens:  number;
  total_cost_usd: number;
  total_time_ms:  number;
  hit_rate:      number;
  tokens_saved?: number;
  cost_saved?:   number;
  batch_id?:     string;
  cache_mode?:   string;
  delay_between_ms?: number;
  status?:       string;
  api_errors?:   number;
}

export interface RunErrorRecord {
  prompt_index?:   number | null;
  prompt_preview?: string;
  model?:          string;
  message:         string;
}

export interface RunCallRecord {
  prompt_index:    number;
  prompt_preview:  string;
  hit_type:        HitType;
  latency_ms:      number;
  tokens_used:     number;
  cost_usd:        number;
  similarity:      number;
  response_preview: string;
  best_similarity?: number;
  prompt_hash?:    string;
  lookup_ms?:      number;
  group_id?:       string;
  endpoint?:       string;
  session_id?:     string;
  model?:          string;
  call_id?:        number;
  tokens_input?:   number | null;
  tokens_output?:  number | null;
}

export interface RunDetail extends RunRecord {
  calls:  RunCallRecord[];
  errors?: RunErrorRecord[];
}

// ── Experiment / batch ────────────────────────────────────────────────────────

export interface ExperimentPreset {
  id:            string;
  batch_id:      string;
  description:   string;
  cell_count:    number;
}

export interface BatchConfig {
  batch_id:          string;
  description:       string;
  base:              Record<string, unknown>;
  matrix:            Record<string, unknown[]>;
  openai_api_key:    string;
  anthropic_api_key: string;
  skip_existing:     boolean;
}

export interface BatchProgress {
  batch_id:    string;
  cell_index:  number;
  total_cells: number;
  suite_name?: string;
  model?:      string;
  threshold?:  number;
  cache_mode?: CacheMode;
  completed:   number;
  skipped:     number;
  phase:       "idle" | "running" | "complete";
}

export interface ThresholdRecommendation {
  suite:              string;
  model:              string;
  cache_mode:         string;
  optimal_threshold:  number;
  expected_hit_rate:  number;
  confidence:         string;
  sample_runs:        number;
}

export interface AnalysisResult {
  recommendations:  ThresholdRecommendation[];
  near_misses:      Array<{
    suite: string;
    model: string;
    prompt_preview: string;
    best_similarity: number;
    threshold: number;
    group_id: string;
  }>;
  suite_rankings:   Array<{
    suite: string;
    model: string;
    cache_mode: string;
    avg_hit_rate: number;
    runs: number;
  }>;
  total_runs_analyzed: number;
}
