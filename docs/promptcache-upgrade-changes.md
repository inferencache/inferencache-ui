# promptcache Upgrade — Change Log

**Based on:** `promptcache-upgrade-spec.docx`  
**Implemented:** June 15, 2026  
**Test results:** 69/69 library tests pass · Next.js build clean · Backend running

---

## Overview

The promptcache system was upgraded from a developer testing tool into a production-grade LLM cost intelligence system. The cache lookup logic (exact → semantic two-check sequence) was not modified. All changes are additive or replacements at the storage, analytics, and dashboard layers.

---

## 1. Dependencies

### `promptcache/pyproject.toml`

| Change | Before | After |
|--------|--------|-------|
| Core vector store | `chromadb>=0.5.0` | `qdrant-client>=1.9.0` |
| Analytics engine | — | `duckdb>=0.10.0` |
| `[all]` extra | included chromadb | includes qdrant-client + duckdb |

### `promptcache-dashboard/backend/requirements.txt`

| Change | Before | After |
|--------|--------|-------|
| Vector store | `chromadb>=0.5.0` | `qdrant-client>=1.9.0` |
| Analytics | — | `duckdb>=0.10.0` |

---

## 2. `promptcache/src/promptcache/store.py`

### 2.1 SQLite schema — new `calls` table

```sql
CREATE TABLE IF NOT EXISTS calls (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_hash     TEXT NOT NULL,
    model           TEXT NOT NULL,
    provider        TEXT NOT NULL,
    endpoint        TEXT,
    session_id      TEXT,
    hit_type        TEXT NOT NULL,   -- 'exact' | 'semantic' | 'miss'
    similarity      REAL,
    latency_ms      REAL NOT NULL,
    tokens_input    INTEGER,         -- null on cache hit
    tokens_output   INTEGER,         -- null on cache hit
    cost_usd        REAL,            -- 0.0 on cache hit
    false_positive  INTEGER NOT NULL DEFAULT 0,
    timestamp       REAL NOT NULL
);
```

Four indexes: `idx_calls_timestamp`, `idx_calls_endpoint`, `idx_calls_session`, `idx_calls_hit_type`.

### 2.2 SQLite schema — `entries` columns added

Two new columns added to `entries` (both `TEXT`, nullable):
- `endpoint` — the function/route that made the call
- `session_id` — groups calls into logical sessions

### 2.3 Migration guard (`_migrate_sqlite_schema`)

New static method runs at init for existing `index.db` files. Uses `PRAGMA table_info` to check for existing columns before issuing `ALTER TABLE`, catching `OperationalError` silently. Migration is idempotent.

### 2.4 Vector store: ChromaDB → Qdrant

**Removed:**
- `chromadb` import
- `_chroma_client`, `_collection` instance variables
- `_get_collection()` method
- `_chroma_write()` method
- `_count_chroma_docs()` method
- L2→cosine conversion (`1.0 - distance / 2.0`)

**Added:**
- `_qdrant_client` instance variable (lazy)
- `_get_qdrant_client()` — initialises `QdrantClient(path=.../qdrant)`, creates collection if absent, validates dimension on existing collection (raises `ValueError` with clear message on mismatch)
- `_qdrant_write()` — upserts a `PointStruct`; point ID derived as `int(prompt_hash[:16], 16) % 2**63`
- `query_semantic()` — uses `client.query_points()` (qdrant-client 1.18+ API) with native cosine scores 0.0–1.0; no distance conversion

**`clear()` update:**
- Model-scoped clear: deletes Qdrant points via `FilterSelector` + `FieldCondition`
- Full clear: deletes and recreates the Qdrant collection

### 2.5 New public methods

#### `write_call_event()` → `int`
Inserts one row into the `calls` table after every lookup and every store. Returns `lastrowid` as a plain `int` (not `None`, not a cursor).

```python
def write_call_event(
    self, prompt_hash, model, provider, hit_type, latency_ms,
    endpoint=None, session_id=None, similarity=None,
    tokens_input=None, tokens_output=None, cost_usd=None,
) -> int
```

#### `flag_false_positive(call_id, flagged)`
Updates `false_positive` on the calls row. Caller is responsible for only calling this on `hit_type = 'semantic'` rows.

---

## 3. `promptcache/src/promptcache/embed.py`

### 3.1 Default model changed

```python
# Before
_DEFAULT_MODEL = "all-MiniLM-L6-v2"

# After
_DEFAULT_MODEL = "BAAI/bge-small-en-v1.5"
```

Both are 384-dimensional; bge-small scores ~8 points higher on MTEB semantic similarity at identical inference cost. `get_default_embedder()` now returns bge-small.

### 3.2 `normalize_embeddings=True` added

`SentenceTransformerEmbedder.embed()` now passes `normalize_embeddings=True` to the `encode()` call, producing unit vectors. This is required for accurate cosine similarity scores with Qdrant's `Distance.COSINE`.

### 3.3 `dimension` class attribute

`SentenceTransformerEmbedder.dimension = 384` added. `OpenAIEmbedder.dimension` property returns `self._dimensions`. Used by `CacheEngine._get_embedding_dim()` to avoid embedding a dummy string at startup.

### 3.4 New class: `Qwen3Embedder`

```python
class Qwen3Embedder:
    dimension: int = 1024
    def __init__(self, model_name="Alibaba-NLP/gte-Qwen3-0.6B-embedding"): ...
    def embed(self, text) -> list[float]: ...   # normalize_embeddings=True
    def model_id(self) -> str: return "qwen3-0.6b"
```

Lazy model loading via sentence-transformers. 1024-dimensional output — the Qdrant collection name includes `model_id()` so 384d and 1024d collections never collide.

### 3.5 New factory: `get_embedder(preset)`

```python
def get_embedder(preset: str = "balanced") -> Embedder:
    # 'fast'     → SentenceTransformerEmbedder("all-MiniLM-L6-v2"),   384d
    # 'balanced' → SentenceTransformerEmbedder("BAAI/bge-small-en-v1.5"), 384d
    # 'accurate' → Qwen3Embedder(),                                    1024d
```

Raises `ValueError` for unknown preset names.

### 3.6 `__all__` updated

Added `Qwen3Embedder`, `get_embedder`.

---

## 4. `promptcache/src/promptcache/engine.py`

### 4.1 `CacheConfig` — new fields

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `embedder_preset` | `str` | `"balanced"` | Used when `embedder` is None |
| `provider` | `str` | `"unknown"` | Recorded in call event log |
| `default_endpoint` | `str \| None` | `None` | Fallback endpoint label |

`__post_init__` now calls `get_embedder(self.embedder_preset)` when `embedder` is None, replacing the former `get_default_embedder()` call.

### 4.2 `CacheResult` — new field

```python
call_id: int | None = None
```

Set to the `lastrowid` returned by `write_call_event()` after each lookup. Enables the frontend to fire `POST /calls/{id}/flag`.

### 4.3 `lookup()` — signature extended

```python
def lookup(self, prompt: str, endpoint: str | None = None, session_id: str | None = None) -> CacheResult:
```

Calls `write_call_event()` on every branch (exact hit, semantic hit, miss) and stores the returned ID in `CacheResult.call_id`. The two-check logic itself is unchanged.

### 4.4 `store()` — signature extended

```python
def store(
    self, prompt, response,
    tokens_input=None, tokens_output=None, cost_usd=None,
    endpoint=None, session_id=None, metadata=None,
) -> None:
```

After writing the cache entry, calls `write_call_event()` with `hit_type="miss"` and the real API token counts and cost. `tokens_input`/`tokens_output` are `None` on cache hits (spec invariant enforced at call site).

### 4.5 `_build_store()` — dimension-aware

```python
embedding_dim = self._get_embedding_dim()
return CacheStore(..., embedding_dim=embedding_dim)
```

`_get_embedding_dim()` reads `embedder.dimension` if the attribute exists, otherwise embeds `"x"` to measure the vector length. Collection name still includes `embedder.model_id()`.

### 4.6 Unchanged

The two-check lookup sequence, stream reconstitution, `api.py`, `cli.py`, `mcp/` — not modified.

---

## 5. `promptcache/src/promptcache/analytics.py` (new file)

DuckDB analytics layer. Attaches `index.db` read-only:

```python
conn.execute("ATTACH 'index.db' AS cache (TYPE SQLITE, READ_ONLY);")
```

DuckDB never writes to the SQLite file.

### Registered UDF

`model_cost_per_token(model: str) -> float` — Python function registered as a DuckDB scalar UDF. Returns USD per output token from a built-in model cost table (extendable via `extra_costs` constructor arg).

### Query methods

| Method | Returns | Used by |
|--------|---------|---------|
| `hit_rate_over_time(model, window_hours, bucket_minutes)` | Time-bucketed exact/semantic/miss counts | Analytics tab stacked area chart |
| `cost_saved_cumulative(model, window_hours)` | Running sum of cost saved per hit | Analytics tab hero chart |
| `endpoint_breakdown(model, window_hours, limit)` | Per-endpoint aggregate stats | Analytics tab drilldown table |
| `similarity_distribution(model, window_hours, buckets)` | Histogram of semantic hit scores | Tuning tab histogram |
| `alert_check(model)` | `{hit_rate, quality, cost_rate}` alert state | PersistentStrip status dot + alert banners |
| `false_positive_queue(model, limit)` | Flagged semantic hits with prompts | Tuning tab review queue |

### Alert thresholds

| Alert | Trigger |
|-------|---------|
| Hit rate drop | >20% relative drop vs prior 15-minute window → `alert`; >10% → `warn` |
| Semantic quality | >30% of semantic hits in the risky similarity band (0.80–0.85) → `alert` |
| Cost rate | >$1.00 estimated hourly spend → `alert`; >$0.25 → `warn` |

---

## 6. `promptcache-dashboard/backend/main.py`

### 6.1 Engine factory updated

`get_engine(model, threshold, provider)` now keys engines by `"{model}:{provider}"` so OpenAI and Anthropic runs for the same model use separate call event providers. Uses `embedder_preset="balanced"` instead of hardcoded `SentenceTransformerEmbedder()`.

### 6.2 Helper functions added

- `get_analytics()` — lazy `CacheAnalytics` singleton
- `_query_index_db(sql, params)` — direct read-only SQLite queries for analytics
- `_write_index_db(sql, params)` — direct SQLite writes for the flag endpoint

### 6.3 `call_openai` / `call_anthropic` — split token counts

Both functions now return `tuple[str, int, int]` → `(response_text, tokens_input, tokens_output)` instead of `(response_text, total_tokens)`. This enables accurate per-direction token tracking in the calls event log.

### 6.4 `RunEvent` model — enriched fields

```python
call_id:      int | None = None
tokens_input: int | None = None
tokens_output: int | None = None
endpoint:     str = "dashboard/run-suite"
session_id:   str = ""
```

### 6.5 `_run_suite()` loop updated

- Calls `engine.lookup(prompt, endpoint="dashboard/run-suite", session_id=run_id)`
- Calls `engine.store(..., tokens_input=..., tokens_output=..., cost_usd=..., endpoint=..., session_id=run_id)`
- Emits `call_id`, `tokens_input`, `tokens_output`, `endpoint`, `session_id` in every SSE `call` event

### 6.6 New endpoints (8 total)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/analytics/hit-rate` | Time-bucketed hit rate series |
| `GET` | `/analytics/cost-saved` | Cumulative cost saved series |
| `GET` | `/analytics/endpoints` | Endpoint breakdown table |
| `GET` | `/analytics/similarity-dist` | Similarity histogram |
| `GET` | `/alerts/check` | Current alert state for all three alert types |
| `POST` | `/calls/{id}/flag` | Flag or unflag a semantic hit as false positive |
| `GET` | `/tuning/false-positives` | False positive review queue |
| `GET` | `/calls` | Paginated call log (filterable by endpoint, session, model) |

All existing endpoints unchanged.

---

## 7. Frontend — `promptcache-dashboard/frontend-next/src/`

### 7.1 `types/index.ts` — new types

```typescript
HitRateBucket    // { time_bucket, exact_hits, semantic_hits, misses, total_calls }
CostSavedPoint   // { timestamp, cost_saved, cumulative_saved }
EndpointRow      // { endpoint, total_calls, cache_hits, hit_rate, avg_latency_ms, ... }
SimilarityBucket // { bucket_floor, count }
AlertState       // { hit_rate, quality, cost_rate } each with status: 'ok'|'warn'|'alert'
FalsePositiveRow // { id, prompt_hash, similarity, timestamp, original_prompt, cached_response }
TimeWindow       // "1h" | "6h" | "24h" | "7d" | "30d"
WINDOW_HOURS     // Record<TimeWindow, number>
```

`RunEvent` extended with `call_id`, `tokens_input`, `tokens_output`, `endpoint`, `session_id`.

### 7.2 `lib/api.ts` — new functions

```typescript
fetchHitRate(model, windowHours, bucketMinutes)  → HitRateBucket[]
fetchCostSaved(model, windowHours)               → CostSavedPoint[]
fetchEndpoints(model, windowHours)               → EndpointRow[]
fetchSimilarityDist(model, windowHours, buckets) → SimilarityBucket[]
fetchAlerts(model)                               → AlertState | null
flagCallFalsePositive(callId, flagged)           → void
fetchFalsePositives(model, limit)                → FalsePositiveRow[]
```

### 7.3 New component: `PersistentStrip.tsx`

Always-visible strip above the tab nav. Shows:
- **Total saved** (large, green) — cumulative from the current live session
- Hit rate %, exact hit count, semantic hit count, tokens saved
- **Status dot** — green (all ok) / amber (warn) / red (alert) driven by `AlertState`; polls `/alerts/check` every 60 seconds

### 7.4 New component: `CallDrawer.tsx`

Side drawer (fixed right, 480px wide) opened by clicking any call row. Shows:
- Hit type badge, similarity score, latency, token counts, cost, endpoint, session, call ID
- Full prompt text (pre block, scrollable)
- Cached response preview
- **Flag as false positive** toggle button — only rendered for semantic hits that have a `call_id`; calls `POST /calls/{id}/flag`; confirms with text feedback

Closes on Escape or backdrop click.

### 7.5 New component: `AnalyticsTab.tsx`

Mounted when the Analytics tab is active. Contains:
- Time window selector (1h / 6h / 24h / 7d / 30d)
- **Hero chart**: cumulative cost saved — `recharts` AreaChart with gradient fill
- **Hit rate chart**: stacked area (exact/semantic/miss) over time
- **Endpoint breakdown table**: all columns from `endpoint_breakdown()` with colour-coded values
- **Refresh** and **Export CSV** buttons

### 7.6 New component: `TuningTab.tsx`

Mounted when the Tuning tab is active. Contains:
- **Threshold slider** (0.50–0.99, step 0.01) with live counterfactual hit-rate preview
- **Apply** button — calls `POST /set-threshold` and updates `config.threshold`
- **Similarity histogram**: `recharts` BarChart; bars left of threshold rendered red, right rendered green; yellow `ReferenceLine` at current threshold value
- **False positive review queue**: table of flagged semantic hits with Unflag action

### 7.7 `CallLog.tsx` — rewritten as tree table

**Before:** flat table of call rows.  
**After:** collapsible tree — endpoint → session → call.

- **Level 0 (endpoint row):** endpoint name, call count, hit rate %, avg latency, total cost. Click to expand/collapse.
- **Level 1 (session row):** session ID (truncated), call count, prompt index range. Click to expand/collapse.
- **Level 2 (call row):** same columns as before (badge, latency, tokens, cost, similarity, prompt preview). Click to open `CallDrawer`.

Active runs auto-expand the relevant endpoint/session as calls arrive. Flash animation on new rows preserved.

### 7.8 `DashboardClient.tsx` — 3-tab shell

**Before:** single-surface layout.  
**After:** tab-based shell with:
1. `Topbar` (unchanged)
2. `PersistentStrip` (always visible, above tab nav)
3. Tab nav: **Live** | **Analytics** | **Tuning**
4. Left sidebar (unchanged, always present)
5. Tab content area — conditionally renders one of:
   - **Live:** `HitBar` + `RunProgress` + `LazyCharts` + `CallLog` (tree)
   - **Analytics:** `AnalyticsTab`
   - **Tuning:** `TuningTab`

`MetricCards` removed from the Live tab (stats are now in `PersistentStrip`). Export button moved to Analytics tab.

Alert polling: `fetchAlerts(model)` called on mount and every 60 seconds; result passed to `PersistentStrip`.

### 7.9 `app/globals.css` — new CSS

Added classes for:
- `.persistent-strip`, `.persistent-strip-hero`, `.persistent-strip-stat`, `.persistent-strip-sep`, `.persistent-strip-value`, `.persistent-strip-label`
- `.status-dot`, `.status-dot-green`, `.status-dot-yellow`, `.status-dot-red`, `.status-dot-neutral`
- `.tab-nav`, `.tab-nav-item`, `.tab-nav-item-active`
- `.call-drawer`, `.call-drawer-backdrop`, `.call-drawer-header`, `.call-drawer-body`, `.call-drawer-row`, `.call-drawer-row-label`, `.call-drawer-row-value`, `.call-drawer-section`, `.call-drawer-pre`
- `.tree-table`, `.tree-row`, `.tree-row-endpoint`, `.tree-row-session`, `.tree-row-pending`, `.tree-chevron`, `.tree-row-label`, `.tree-row-meta`, `.tree-calls`, `.tree-session`

---

## 8. Tests

### `promptcache/tests/test_store.py` — new tests added

| Test | Verifies |
|------|----------|
| `test_sqlite_migration_adds_entries_columns` | `endpoint` and `session_id` exist on `entries` |
| `test_sqlite_migration_creates_calls_table` | `calls` table has all 14 required columns |
| `test_sqlite_migration_creates_calls_indexes` | All 4 indexes present |
| `test_write_call_event_returns_int_lastrowid` | Return type is `int`, value ≥ 1 |
| `test_write_call_event_multiple_rows` | IDs are strictly increasing |
| `test_write_call_event_stores_all_fields` | All optional fields persisted correctly |
| `test_flag_false_positive_sets_and_clears` | Flag set to 1 then cleared to 0 |
| `test_migration_is_idempotent` | Opening the same cache dir twice does not raise |

**Final results:** 69/69 tests pass (test_store, test_engine, test_mcp, test_stream).

---

## 9. Invariants enforced

Per the spec, these constraints hold after the upgrade:

| Invariant | Implementation |
|-----------|----------------|
| Every `lookup()` produces exactly one `calls` row | `write_call_event()` called unconditionally in all three branches |
| Every `store()` produces exactly one `calls` row | `write_call_event()` called after `store._store.write()` |
| DuckDB never writes to SQLite | `ATTACH ... (TYPE SQLITE, READ_ONLY)` |
| Qdrant collection name includes embedder `model_id` | `f"pc-{model_slug}-{embedder_id}"[:63]` |
| Miss `prompt_hash` = SHA-256(prompt, model) | `_hash_key()` used in both `entries` and `calls` miss row |
| `false_positive=1` only on semantic hits | Enforced at `/calls/{id}/flag` endpoint (returns 400 otherwise) |
| `tokens_input`/`tokens_output` null on cache hits | Hit branches pass no token args; only `store()` miss path passes real values |

---

## 10. What was not changed

Per spec §13:

- `promptcache/src/promptcache/api.py` — `@cache`, `cache_context()`, `CacheContext`, signatures
- `promptcache/src/promptcache/cli.py` — all CLI commands
- `promptcache/src/promptcache/mcp/tools.py` and `mcp/server.py`
- `entries` table existing rows — only two columns added via guarded `ALTER TABLE`
- The two-check lookup sequence in `engine.py` (`exact → semantic`)
- Stream reconstitution logic (`stream_cached`, `astream_cached`)
- Dashboard `runs.db` and `index.db` kept as separate databases (not merged)
- All existing API routes in `backend/main.py`
