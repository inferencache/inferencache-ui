import { costPerToken } from "@/lib/api";
import type { LiveStats, RunDetail, RunEvent, RunPhase, TimelinePoint } from "@/types";

export interface HydratedRunSession {
  stats:     LiveStats;
  timeline:  TimelinePoint[];
  entries:   RunEvent[];
  runId:     string;
  progress:  number;
  total:     number;
  phase:     RunPhase;
  elapsedMs: number;
  runError:  string | null;
}

function errorEventsFromDetail(detail: RunDetail): RunEvent[] {
  return (detail.errors ?? []).map((e) => ({
    event_type:     "error" as const,
    run_id:         detail.id,
    prompt_index:   e.prompt_index ?? undefined,
    prompt_preview: e.prompt_preview,
    model:          e.model ?? detail.model,
    message:        e.message,
  }));
}

export function hydrateRunFromDetail(detail: RunDetail): HydratedRunSession {
  const cpt = costPerToken(detail.model);
  let tokensSaved = 0;
  let costSaved   = 0;

  const callEvents: RunEvent[] = detail.calls.map((c) => {
    const isHit    = c.hit_type !== "miss";
    const savedTok = isHit ? (c.tokens_used || 200) : 0;
    tokensSaved += savedTok;
    costSaved   += savedTok * cpt;

    return {
      event_type:       "call",
      run_id:           detail.id,
      prompt_index:     c.prompt_index,
      prompt_preview:   c.prompt_preview,
      hit:              isHit,
      hit_type:         c.hit_type,
      similarity:       c.similarity,
      latency_ms:       c.latency_ms,
      tokens_used:      c.tokens_used,
      cost_usd:         c.cost_usd,
      response_preview: c.response_preview,
      endpoint:         c.endpoint ?? "dashboard/run-suite",
      session_id:       c.session_id ?? detail.id,
      model:            c.model ?? detail.model,
      call_id:          c.call_id,
      tokens_input:     c.tokens_input ?? null,
      tokens_output:    c.tokens_output ?? null,
    };
  });

  const stats: LiveStats = {
    total:        detail.total_calls,
    hits:         detail.cache_hits,
    exact:        detail.exact_hits,
    semantic:     detail.semantic_hits,
    generative:   detail.generative_hits ?? 0,
    misses:       detail.total_calls - detail.cache_hits,
    tokens_saved: detail.tokens_saved ?? tokensSaved,
    cost_saved:   detail.cost_saved ?? costSaved,
    total_tokens: detail.total_tokens,
    total_cost:   detail.total_cost_usd,
  };

  const timeline: TimelinePoint[] = detail.calls.map((c, idx) => {
    const isHit = c.hit_type !== "miss";
    return {
      idx,
      hit_ms:  isHit ? c.latency_ms : null,
      miss_ms: !isHit ? c.latency_ms : null,
      cost:    c.cost_usd,
      tokens:  c.tokens_used,
      type:    c.hit_type,
    };
  });

  const errorEvents = errorEventsFromDetail(detail);
  const apiErrors = detail.api_errors ?? errorEvents.length;

  const summaryEvent: RunEvent = {
    event_type:      "summary",
    run_id:          detail.id,
    total_calls:     detail.total_calls,
    cache_hits:      detail.cache_hits,
    exact_hits:      detail.exact_hits,
    semantic_hits:   detail.semantic_hits,
    generative_hits: detail.generative_hits,
    total_tokens:    detail.total_tokens,
    total_cost_usd:  detail.total_cost_usd,
    total_time_ms:   detail.total_time_ms,
    hit_rate:        detail.hit_rate,
    api_errors:      apiErrors,
    error_messages:  errorEvents.map((e) => e.message ?? "").filter(Boolean),
  };

  const runError = errorEvents[0]?.message
    ?? (apiErrors > 0 ? `${apiErrors} API call${apiErrors === 1 ? "" : "s"} failed` : null);

  const phase: RunPhase =
    detail.status === "error" || (apiErrors > 0 && detail.total_calls === 0)
      ? "error"
      : "done";

  return {
    stats,
    timeline,
    entries:   [...callEvents, ...errorEvents, summaryEvent],
    runId:     detail.id,
    progress:  detail.total_calls + apiErrors,
    total:     detail.total_calls + apiErrors,
    phase,
    elapsedMs: detail.total_time_ms,
    runError,
  };
}
