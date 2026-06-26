"""
promptcache testing dashboard — FastAPI backend

Endpoints:
  POST /run-suite          Start a test run (background task, streams events via SSE)
  GET  /events             SSE stream of RunEvent objects
  GET  /stats              Current cache stats
  POST /clear              Clear the cache
  POST /set-threshold      Update similarity threshold
  POST /upload-suite       Upload a custom JSON/CSV prompt suite
  GET  /suites             List available prompt suites
  GET  /health             Health check + API key status
"""

from __future__ import annotations

import asyncio
import csv
import hashlib
import io
import json
import re
import time
import uuid
from itertools import product
from pathlib import Path
from typing import Any, AsyncIterator

import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# ── inferencache imports ──────────────────────────────────────────────────────
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "inferencache" / "src"))

from inferencache.engine import CacheConfig, CacheEngine
from inferencache.analytics import CacheAnalytics

import db as _db
import analyze as _analyze

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="promptcache dashboard", version="0.1.0")

PRESETS_DIR = Path(__file__).parent / "experiment_presets"
PRESETS_DIR.mkdir(exist_ok=True)

# Batch runner state
_batch_running = False


@app.on_event("startup")
async def _startup():
    _db.ensure_schema()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CACHE_DIR = Path.home() / ".cache" / "promptcache-dashboard"
SUITES_DIR = Path(__file__).parent / "prompt_suites"
SUITES_DIR.mkdir(exist_ok=True)

# Per-client SSE queue registry — each connected /events client gets its own
# queue so events are broadcast to ALL tabs, not round-robined between them.
_client_queues: set[asyncio.Queue] = set()


async def _broadcast(msg: str) -> None:
    for q in list(_client_queues):
        await q.put(msg)

# Active cache engines keyed by (model, provider)
_engines: dict[str, CacheEngine] = {}

# Lazy analytics instance
_analytics: CacheAnalytics | None = None


def get_engine(model: str, threshold: float = 0.85, provider: str = "openai") -> CacheEngine:
    key = f"{model}:{provider}"
    if key not in _engines:
        _engines[key] = CacheEngine(CacheConfig(
            cache_dir=CACHE_DIR,
            model=model,
            provider=provider,
            threshold=threshold,
            embedder_preset="balanced",
            default_endpoint="dashboard/run-suite",
        ))
    return _engines[key]


def get_analytics() -> CacheAnalytics:
    global _analytics
    if _analytics is None:
        _analytics = CacheAnalytics(CACHE_DIR)
    return _analytics


def _query_index_db(sql: str, params: tuple = ()) -> list[dict]:
    """Direct read-only SQLite query against cache index.db."""
    import sqlite3 as _sqlite3
    db_path = CACHE_DIR / "index.db"
    if not db_path.exists():
        return []
    try:
        with _sqlite3.connect(str(db_path)) as conn:
            conn.row_factory = _sqlite3.Row
            return [dict(r) for r in conn.execute(sql, params).fetchall()]
    except Exception:
        return []


def _write_index_db(sql: str, params: tuple = ()) -> None:
    """Direct SQLite write against cache index.db."""
    import sqlite3 as _sqlite3
    db_path = CACHE_DIR / "index.db"
    if not db_path.exists():
        raise HTTPException(404, "Cache not initialised — run a test suite first")
    with _sqlite3.connect(str(db_path)) as conn:
        conn.execute(sql, params)


# ── Models ────────────────────────────────────────────────────────────────────

class RunConfig(BaseModel):
    suite_name: str = "general_qa"
    model: str = "gpt-4o-mini"
    provider: str = "openai"           # "openai" | "anthropic"
    threshold: float = 0.85
    repeat_factor: int = 2             # how many times to repeat each prompt (tests cache hits)
    delay_between_ms: int = 100        # ms between calls
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    batch_id: str = ""
    cache_mode: str = "warm"           # "cold" | "warm"
    status: str = "complete"


class BatchConfig(BaseModel):
    batch_id: str
    description: str = ""
    base: dict[str, Any] = {}
    matrix: dict[str, list[Any]] = {}
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    skip_existing: bool = True


class ApplyThresholdRequest(BaseModel):
    suite_name: str | None = None
    model: str | None = None
    cache_mode: str = "cold"

class ThresholdUpdate(BaseModel):
    threshold: float = Field(..., ge=0.0, le=1.0)
    model: str = "gpt-4o-mini"

class RunEvent(BaseModel):
    event_type: str   # "start" | "call_start" | "call" | "complete" | "error" | "summary"
    run_id: str
    prompt_index: int = 0
    total_prompts: int = 0
    prompt_preview: str = ""
    hit: bool = False
    hit_type: str = "miss"             # "exact" | "semantic" | "miss"
    similarity: float = 0.0
    latency_ms: float = 0.0
    tokens_used: int = 0
    cost_usd: float = 0.0
    model: str = ""
    response_preview: str = ""
    # enriched call fields (spec §8.1)
    call_id: int | None = None         # row ID from the calls event log
    tokens_input: int | None = None    # null on cache hit
    tokens_output: int | None = None   # null on cache hit
    endpoint: str = "dashboard/run-suite"
    session_id: str = ""
    matched_prompt: str | None = None  # original cached prompt for semantic hits
    # summary fields
    total_calls: int = 0
    cache_hits: int = 0
    exact_hits: int = 0
    semantic_hits: int = 0
    total_tokens: int = 0
    total_cost_usd: float = 0.0
    total_time_ms: float = 0.0
    hit_rate: float = 0.0
    api_errors: int = 0
    message: str = ""


# ── LLM client helpers ────────────────────────────────────────────────────────

MODEL_COSTS: dict[str, float] = {
    # GPT-5.5
    "gpt-5.5":                    0.00003,
    "gpt-5.5-2026-04-23":         0.00003,
    "gpt-5.5-pro":                0.00018,
    "gpt-5.5-pro-2026-04-23":     0.00018,
    # GPT-5.4
    "gpt-5.4":                    0.000015,
    "gpt-5.4-2026-03-05":         0.000015,
    "gpt-5.4-mini":               0.0000045,
    "gpt-5.4-mini-2026-03-17":    0.0000045,
    "gpt-5.4-nano":               0.00000125,
    "gpt-5.4-nano-2026-03-17":    0.00000125,
    "gpt-5.4-pro":                0.00018,
    "gpt-5.4-pro-2026-03-05":     0.00018,
    # GPT-5.x
    "gpt-5.3-chat-latest":        0.000015,
    "gpt-5.2":                    0.000014,
    "gpt-5.2-pro":                0.00012,
    "gpt-5.1":                    0.000012,
    "gpt-5.1-mini":               0.000003,
    "gpt-5":                      0.00001,
    "gpt-5-mini":                 0.000003,
    "gpt-5-nano":                 0.000001,
    # GPT-4.1
    "gpt-4.1":                    0.000008,
    "gpt-4.1-mini":               0.0000016,
    "gpt-4.1-nano":               0.0000004,
    # Reasoning
    "o4-mini":                    0.0000044,
    "o3":                         0.00004,
    "o3-mini":                    0.0000044,
    "o1":                         0.00006,
    "o1-mini":                    0.000012,
    # GPT-4o / legacy
    "gpt-4o":                     0.000005,
    "gpt-4o-mini":                0.0000006,
    "gpt-4-turbo":                0.00001,
    "gpt-4":                      0.00003,
    "gpt-3.5-turbo":              0.0000005,
    # Anthropic
    "claude-opus-4-8":            0.000025,
    "claude-opus-4-7":            0.000025,
    "claude-opus-4-6":            0.000025,
    "claude-sonnet-4-6":          0.000015,
    "claude-sonnet-4-5-20250929": 0.000015,
    "claude-haiku-4-5-20251001": 0.000004,
    "claude-opus-4-5-20251101":  0.000025,
    "claude-3-5-sonnet-20241022": 0.000003,
    "claude-3-5-haiku-20241022":  0.0000008,
    "claude-3-opus-20240229":     0.000015,
    "claude-3-haiku-20240307":    0.00000025,
    "claude-sonnet-4-20250514":   0.000015,
    "claude-opus-4-20250514":     0.000015,
}

def estimate_cost(model: str, tokens: int) -> float:
    cpt = MODEL_COSTS.get(model, 0.000003)
    return round(tokens * cpt, 8)

def count_tokens(text: str) -> int:
    """Very rough token estimate: ~4 chars per token."""
    return max(1, len(text) // 4)


def _uses_max_completion_tokens(model: str) -> bool:
    """Newer OpenAI models reject max_tokens in favour of max_completion_tokens."""
    m = model.lower()
    if re.match(r"^o\d", m):
        return True
    if m.startswith("gpt-4o") or m.startswith("chatgpt-4o"):
        return True
    if re.match(r"^gpt-[4-9]\.", m):
        return True
    if re.match(r"^gpt-[5-9]", m):
        return True
    if m.startswith("codex-"):
        return True
    return False


def _is_reasoning_model(model: str) -> bool:
    return bool(re.match(r"^o\d", model.lower()))


def _is_gpt5_family(model: str) -> bool:
    return bool(re.match(r"^gpt-[5-9]", model.lower()))


def _uses_internal_reasoning(model: str) -> bool:
    """Models that may spend completion budget on hidden reasoning tokens."""
    return _is_reasoning_model(model) or _is_gpt5_family(model)


def _openai_output_token_limits(model: str) -> list[int]:
    """Return token limits to try, highest last (for retry on empty output)."""
    if _uses_internal_reasoning(model):
        return [8192, 16384]
    return [1024]


def _openai_chat_body(model: str, prompt: str, limit: int) -> dict[str, Any]:
    body: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        **_openai_token_limit_kwargs(model, limit),
    }
    # GPT-5 / o-series can burn the whole budget on hidden reasoning unless capped.
    if _uses_internal_reasoning(model):
        body["reasoning_effort"] = "low"
    return body


def _openai_token_limit_kwargs(model: str, limit: int) -> dict[str, int]:
    if _uses_max_completion_tokens(model):
        return {"max_completion_tokens": limit}
    return {"max_tokens": limit}


def _reasoning_tokens_used(data: dict) -> int:
    usage = data.get("usage") or {}
    details = usage.get("completion_tokens_details") or {}
    return int(details.get("reasoning_tokens") or 0)


def _extract_openai_text(data: dict) -> str:
    choice = data["choices"][0]
    message = choice["message"]
    content = message.get("content")
    if isinstance(content, str) and content.strip():
        return content
    if message.get("refusal"):
        raise ValueError(f"OpenAI refused: {message['refusal']}")
    if choice.get("finish_reason") == "length":
        reasoning = _reasoning_tokens_used(data)
        detail = f" ({reasoning} hidden reasoning tokens)" if reasoning else ""
        raise ValueError(
            f"OpenAI hit the output token cap before producing text{detail}. "
            "Retrying with a larger budget."
        )
    raise ValueError("OpenAI returned empty content")


async def _openai_completion_once(
    client: httpx.AsyncClient,
    prompt: str,
    model: str,
    api_key: str,
    limit: int,
) -> tuple[str, int, int]:
    resp = await client.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=_openai_chat_body(model, prompt, limit),
    )
    if not resp.is_success:
        try:
            body = resp.json()
            msg = body.get("error", {}).get("message", resp.text)
        except Exception:
            msg = resp.text
        raise ValueError(f"OpenAI {resp.status_code} — {msg}")
    data = resp.json()
    text = _extract_openai_text(data)
    usage = data.get("usage", {})
    tokens_input  = usage.get("prompt_tokens", count_tokens(prompt))
    tokens_output = usage.get("completion_tokens", count_tokens(text))
    return text, tokens_input, tokens_output


async def call_openai(prompt: str, model: str, api_key: str) -> tuple[str, int, int]:
    """Returns (response_text, tokens_input, tokens_output)."""
    limits = _openai_output_token_limits(model)
    timeout = 180.0 if _uses_internal_reasoning(model) else 60.0
    last_exc: Exception | None = None

    async with httpx.AsyncClient(timeout=timeout) as client:
        for limit in limits:
            try:
                return await _openai_completion_once(client, prompt, model, api_key, limit)
            except ValueError as exc:
                msg = str(exc)
                if "Retrying with a larger budget" in msg or "empty content" in msg:
                    last_exc = exc
                    continue
                raise

    raise last_exc or ValueError("OpenAI request failed")


async def call_anthropic(prompt: str, model: str, api_key: str) -> tuple[str, int, int]:
    """Returns (response_text, tokens_input, tokens_output)."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 512,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        if not resp.is_success:
            try:
                body = resp.json()
                msg = body.get("error", {}).get("message", resp.text)
            except Exception:
                msg = resp.text
            raise ValueError(f"Anthropic {resp.status_code} — {msg}")
        data = resp.json()
        text = data["content"][0].get("text", "")
        if not text.strip():
            raise ValueError("Anthropic returned empty content")
        usage = data.get("usage", {})
        tokens_input  = usage.get("input_tokens", count_tokens(prompt))
        tokens_output = usage.get("output_tokens", count_tokens(text))
        return text, tokens_input, tokens_output


# ── Suite loading ─────────────────────────────────────────────────────────────

def load_suite(suite_name: str) -> list[str]:
    """Load prompts from a built-in or uploaded suite file."""
    # Try JSON first
    json_path = SUITES_DIR / f"{suite_name}.json"
    if json_path.exists():
        data = json.loads(json_path.read_text())
        if isinstance(data, list):
            return [str(p) for p in data]
        if isinstance(data, dict) and "prompts" in data:
            return [str(p) for p in data["prompts"]]

    # Try CSV
    csv_path = SUITES_DIR / f"{suite_name}.csv"
    if csv_path.exists():
        reader = csv.DictReader(io.StringIO(csv_path.read_text()))
        rows = list(reader)
        # Accept column named "prompt" or first column
        col = "prompt" if "prompt" in (rows[0] if rows else {}) else (list(rows[0].keys())[0] if rows else "prompt")
        return [r[col] for r in rows if r.get(col)]

    raise ValueError(f"Suite '{suite_name}' not found. Available: {list_suite_names()}")


def list_suite_names() -> list[str]:
    names = []
    for p in SUITES_DIR.iterdir():
        if p.suffix in (".json", ".csv"):
            names.append(p.stem)
    return sorted(names)


def load_suite_groups(suite_name: str) -> dict[str, str]:
    """Return a mapping of prompt text -> group_id for ground-truth tagging."""
    json_path = SUITES_DIR / f"{suite_name}.json"
    if not json_path.exists():
        return {}
    data = json.loads(json_path.read_text())
    mapping: dict[str, str] = {}
    for group in data.get("groups", []):
        gid = group.get("id", "")
        for prompt in group.get("prompts", []):
            mapping[str(prompt)] = gid
    return mapping


def prompt_hash(prompt: str, model: str) -> str:
    return hashlib.sha256(f"{model}:{prompt}".encode()).hexdigest()


def expand_matrix(base: dict, matrix: dict) -> list[dict]:
    """Cartesian product of matrix dimensions merged with base config."""
    keys = list(matrix.keys())
    values = [matrix[k] if isinstance(matrix[k], list) else [matrix[k]] for k in keys]
    cells = []
    for combo in product(*values):
        cell = {**base}
        for k, v in zip(keys, combo):
            cell[k] = v
        cells.append(cell)
    return cells


def list_presets() -> list[dict]:
    presets = []
    for p in sorted(PRESETS_DIR.glob("*.json")):
        data = json.loads(p.read_text())
        matrix = data.get("matrix", {})
        cell_count = 1
        for v in matrix.values():
            cell_count *= len(v) if isinstance(v, list) else 1
        presets.append({
            "id": p.stem,
            "batch_id": data.get("batch_id", p.stem),
            "description": data.get("description", ""),
            "cell_count": cell_count,
        })
    return presets


def load_preset(preset_id: str) -> dict:
    path = PRESETS_DIR / f"{preset_id}.json"
    if not path.exists():
        raise ValueError(f"Preset '{preset_id}' not found")
    return json.loads(path.read_text())


# ── Core test runner ──────────────────────────────────────────────────────────

async def run_suite(config: RunConfig, run_id: str) -> None:
    """Execute the test suite, emitting SSE events for each call."""

    async def emit(event: dict) -> None:
        await _broadcast(json.dumps({"run_id": run_id, **event}))

    try:
        await _run_suite(config, run_id, emit)
    except Exception as exc:
        await emit({"event_type": "error", "message": str(exc)})


async def run_batch(batch: BatchConfig) -> None:
    """Execute a matrix of runs sequentially, emitting batch progress via SSE."""
    global _batch_running
    _batch_running = True

    async def emit(event: dict) -> None:
        await _broadcast(json.dumps(event))

    try:
        cells = expand_matrix(batch.base, batch.matrix)
        total_cells = len(cells)

        await emit({
            "event_type": "batch_start",
            "batch_id": batch.batch_id,
            "total_cells": total_cells,
            "description": batch.description,
        })

        completed = 0
        skipped = 0

        for cell_idx, cell in enumerate(cells):
            suite = cell.get("suite_name", "general_qa")
            model = cell.get("model", batch.base.get("model", "gpt-4o-mini"))
            threshold = float(cell.get("threshold", batch.base.get("threshold", 0.85)))
            cache_mode = cell.get("cache_mode", batch.base.get("cache_mode", "warm"))

            # Idempotent skip
            if batch.skip_existing:
                loop = asyncio.get_event_loop()
                existing = await loop.run_in_executor(
                    None, _db.find_batch_cell,
                    batch.batch_id, suite, model, threshold, cache_mode,
                )
                if existing:
                    skipped += 1
                    await emit({
                        "event_type": "batch_cell_skip",
                        "batch_id": batch.batch_id,
                        "cell_index": cell_idx,
                        "total_cells": total_cells,
                        "run_id": existing,
                        "suite_name": suite,
                        "model": model,
                        "threshold": threshold,
                        "cache_mode": cache_mode,
                    })
                    continue

            run_id = str(uuid.uuid4())[:8]
            config = RunConfig(
                suite_name=suite,
                model=model,
                provider=cell.get("provider", batch.base.get("provider", "openai")),
                threshold=threshold,
                repeat_factor=int(cell.get("repeat_factor", batch.base.get("repeat_factor", 2))),
                delay_between_ms=int(cell.get("delay_between_ms", batch.base.get("delay_between_ms", 200))),
                openai_api_key=batch.openai_api_key,
                anthropic_api_key=batch.anthropic_api_key,
                batch_id=batch.batch_id,
                cache_mode=cache_mode,
            )

            await emit({
                "event_type": "batch_cell_start",
                "batch_id": batch.batch_id,
                "cell_index": cell_idx,
                "total_cells": total_cells,
                "run_id": run_id,
                "suite_name": suite,
                "model": model,
                "threshold": threshold,
                "cache_mode": cache_mode,
            })

            async def cell_emit(event: dict) -> None:
                await _broadcast(json.dumps({"run_id": run_id, **event}))

            try:
                await _run_suite(config, run_id, cell_emit)
                completed += 1
            except Exception as exc:
                await emit({
                    "event_type": "batch_cell_error",
                    "batch_id": batch.batch_id,
                    "cell_index": cell_idx,
                    "run_id": run_id,
                    "message": str(exc),
                })

            await emit({
                "event_type": "batch_cell_complete",
                "batch_id": batch.batch_id,
                "cell_index": cell_idx,
                "total_cells": total_cells,
                "run_id": run_id,
                "completed": completed,
                "skipped": skipped,
            })

        await emit({
            "event_type": "batch_complete",
            "batch_id": batch.batch_id,
            "total_cells": total_cells,
            "completed": completed,
            "skipped": skipped,
        })

    finally:
        _batch_running = False


async def _run_suite(config: RunConfig, run_id: str, emit) -> None:
    try:
        prompts = load_suite(config.suite_name)
    except ValueError as e:
        await emit({"event_type": "error", "message": str(e)})
        return

    group_map = load_suite_groups(config.suite_name)

    # Build the full call sequence (original order × repeat_factor, interleaved)
    call_sequence: list[str] = []
    for _ in range(config.repeat_factor):
        call_sequence.extend(prompts)

    total = len(call_sequence)
    engine = get_engine(config.model, config.threshold, config.provider)
    engine.set_threshold(config.threshold)

    # Cold cache: clear before this run for fair isolated comparison
    if config.cache_mode == "cold":
        engine.cache_store.clear(model=config.model)

    await emit({
        "event_type": "start",
        "total_prompts": total,
        "suite": config.suite_name,
        "model": config.model,
        "threshold": config.threshold,
        "repeat_factor": config.repeat_factor,
        "batch_id": config.batch_id,
        "cache_mode": config.cache_mode,
    })

    summary = {
        "total_calls": 0,
        "cache_hits": 0,
        "exact_hits": 0,
        "semantic_hits": 0,
        "total_tokens": 0,
        "total_cost_usd": 0.0,
        "total_time_ms": 0.0,
        "api_errors": 0,
    }

    call_records: list[dict] = []
    error_records: list[dict] = []

    for idx, prompt in enumerate(call_sequence):
        await emit({
            "event_type": "call_start",
            "prompt_index": idx,
            "total_prompts": total,
            "prompt_preview": prompt[:80],
            "model": config.model,
        })

        t0 = time.perf_counter()

        # ── Cache lookup ───────────────────────────────────────────────
        result = engine.lookup(prompt, endpoint="dashboard/run-suite", session_id=run_id)
        lookup_ms = result.latency_ms

        tokens = 0
        tokens_input: int | None = None
        tokens_output: int | None = None
        cost = 0.0
        response_text = ""

        if result.hit:
            response_text = result.response or ""
            tokens = count_tokens(response_text)
            cost = 0.0
            # tokens_input/tokens_output stay None on cache hit (spec invariant)
            summary["cache_hits"] += 1
            if result.hit_type == "exact":
                summary["exact_hits"] += 1
            else:
                summary["semantic_hits"] += 1
        else:
            try:
                if config.provider == "openai":
                    response_text, tokens_input, tokens_output = await call_openai(
                        prompt, config.model, config.openai_api_key
                    )
                elif config.provider == "anthropic":
                    response_text, tokens_input, tokens_output = await call_anthropic(
                        prompt, config.model, config.anthropic_api_key
                    )
                else:
                    raise ValueError(f"Unknown provider: {config.provider}")

                tokens = (tokens_input or 0) + (tokens_output or 0)
                cost = estimate_cost(config.model, tokens)
                engine.store(
                    prompt, response_text,
                    tokens_input=tokens_input,
                    tokens_output=tokens_output,
                    cost_usd=cost,
                    endpoint="dashboard/run-suite",
                    session_id=run_id,
                )

            except Exception as exc:
                summary["api_errors"] += 1
                err_event = {
                    "event_type": "error",
                    "prompt_index": idx,
                    "total_prompts": total,
                    "prompt_preview": prompt[:80],
                    "model": config.model,
                    "message": str(exc),
                }
                error_records.append(err_event)
                await emit(err_event)
                continue

        elapsed_ms = (time.perf_counter() - t0) * 1000
        summary["total_calls"] += 1
        summary["total_tokens"] += tokens
        summary["total_cost_usd"] += cost
        summary["total_time_ms"] += elapsed_ms

        # Determine round (0-indexed) for expected-hit scoring
        prompts_per_round = len(prompts)
        round_idx = idx // prompts_per_round if prompts_per_round else 0

        call_event = {
            "event_type": "call",
            "prompt_index": idx,
            "total_prompts": total,
            "prompt_preview": prompt[:80],
            "hit": result.hit,
            "hit_type": result.hit_type,
            "similarity": result.similarity,
            "best_similarity": result.best_similarity,
            "latency_ms": round(elapsed_ms, 1),
            "lookup_ms": round(lookup_ms, 1),
            "tokens_used": tokens,
            "cost_usd": cost,
            "model": config.model,
            "response_preview": response_text[:120],
            "prompt_hash": prompt_hash(prompt, config.model),
            "group_id": group_map.get(prompt, ""),
            "round_idx": round_idx,
            # enriched fields (spec §8.1)
            "call_id": result.call_id,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "endpoint": "dashboard/run-suite",
            "session_id": run_id,
            "matched_prompt": result.entry.prompt if result.hit_type == "semantic" and result.entry else None,
        }
        call_records.append(call_event)
        await emit(call_event)

        if config.delay_between_ms > 0:
            await asyncio.sleep(config.delay_between_ms / 1000)

    hit_rate = summary["cache_hits"] / summary["total_calls"] if summary["total_calls"] else 0.0
    cpt = MODEL_COSTS.get(config.model, 0.000003)
    tokens_saved = 0
    cost_saved = 0.0
    for rec in call_records:
        if rec.get("hit") and rec.get("hit_type") != "miss":
            tok = rec.get("tokens_used") or 200
            tokens_saved += tok
            cost_saved += tok * cpt

    final_summary = {
        **summary,
        "hit_rate": round(hit_rate, 4),
        "tokens_saved": tokens_saved,
        "cost_saved": round(cost_saved, 8),
        "prompt_index": total,
        "total_prompts": total,
        "error_messages": [e["message"] for e in error_records[:8]],
    }
    await emit({"event_type": "summary", **final_summary})

    config_dict = config.model_dump()
    config_dict.pop("openai_api_key", None)
    config_dict.pop("anthropic_api_key", None)
    if summary["api_errors"] > 0 and summary["total_calls"] == 0:
        config_dict["status"] = "error"
    elif summary["api_errors"] > 0:
        config_dict["status"] = "partial"
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        _db.save_run,
        run_id,
        config_dict,
        final_summary,
        call_records,
        error_records,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "cache_dir": str(CACHE_DIR)}


@app.get("/suites")
async def get_suites():
    return {"suites": list_suite_names()}


@app.post("/upload-suite")
async def upload_suite(file: UploadFile = File(...)):
    content = await file.read()
    name = Path(file.filename or "custom").stem
    suffix = Path(file.filename or "custom.json").suffix.lower()
    if suffix not in (".json", ".csv"):
        raise HTTPException(400, "Only .json and .csv files are accepted")
    dest = SUITES_DIR / f"{name}{suffix}"
    dest.write_bytes(content)
    return {"saved": name, "path": str(dest)}


@app.post("/run-suite")
async def start_run(config: RunConfig, background_tasks: BackgroundTasks):
    run_id = str(uuid.uuid4())[:8]
    background_tasks.add_task(run_suite, config, run_id)
    return {"run_id": run_id}


@app.get("/events")
async def sse_events():
    """Server-Sent Events stream. Each event is a JSON-serialised RunEvent.

    Each connected client gets its own queue so all tabs receive every event
    rather than events being split across consumers.
    """
    client_q: asyncio.Queue = asyncio.Queue()
    _client_queues.add(client_q)

    async def generator() -> AsyncIterator[str]:
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(client_q.get(), timeout=30)
                    yield f"data: {msg}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"  # prevent proxy timeout
        finally:
            _client_queues.discard(client_q)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/stats")
async def get_stats(model: str = "gpt-4o-mini"):
    engine = get_engine(model)
    stats = engine.cache_store.stats(top_n=10)
    return {
        "total_entries": stats.total_entries,
        "total_hits": stats.total_hits,
        "exact_hits": stats.exact_hits,
        "semantic_hits": stats.semantic_hits,
        "hit_rate": stats.hit_rate,
        "top_entries": stats.top_entries,
    }


@app.post("/clear")
async def clear_cache(model: str | None = None):
    for key, engine in list(_engines.items()):
        engine_model = key.split(":")[0]
        if model is None or engine_model == model:
            deleted = engine.cache_store.clear(model=model)
            return {"deleted": deleted, "model": model or "all"}
    return {"deleted": 0}


@app.post("/set-threshold")
async def set_threshold(update: ThresholdUpdate):
    engine = get_engine(update.model)
    engine.set_threshold(update.threshold)
    return {"threshold": update.threshold, "model": update.model}


# ── Analytics routes (spec §8) ────────────────────────────────────────────────

@app.get("/analytics/hit-rate")
async def analytics_hit_rate(
    model: str = "gpt-4o-mini",
    window_hours: int = 24,
    bucket_minutes: int = 30,
):
    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(
        None, get_analytics().hit_rate_over_time, model, window_hours, bucket_minutes
    )
    return {"data": rows, "model": model, "window_hours": window_hours}


@app.get("/analytics/cost-saved")
async def analytics_cost_saved(
    model: str = "gpt-4o-mini",
    window_hours: int = 24,
):
    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(
        None, get_analytics().cost_saved_cumulative, model, window_hours
    )
    return {"data": rows, "model": model, "window_hours": window_hours}


@app.get("/analytics/endpoints")
async def analytics_endpoints(
    model: str = "gpt-4o-mini",
    window_hours: int = 24,
    limit: int = 20,
):
    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(
        None, get_analytics().endpoint_breakdown, model, window_hours, limit
    )
    return {"data": rows, "model": model, "window_hours": window_hours}


@app.get("/analytics/similarity-dist")
async def analytics_similarity_dist(
    model: str = "gpt-4o-mini",
    window_hours: int = 24,
    buckets: int = 20,
):
    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(
        None, get_analytics().similarity_distribution, model, window_hours, buckets
    )
    return {"data": rows, "model": model, "window_hours": window_hours}


@app.get("/analytics/stale-miss-rate")
async def analytics_stale_miss_rate(
    model: str = "gpt-4o-mini",
    window_hours: int = 24,
):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, get_analytics().stale_miss_rate, model, window_hours
    )
    return {"data": result, "model": model, "window_hours": window_hours}


@app.get("/alerts/check")
async def alerts_check(model: str = "gpt-4o-mini", budget_usd_per_hour: float = 1.0):
    loop = asyncio.get_event_loop()
    state = await loop.run_in_executor(
        None, lambda: get_analytics().alert_check(model, budget_usd_per_hour)
    )
    return state


class FlagRequest(BaseModel):
    flagged: bool = True


@app.post("/calls/{call_id}/flag")
async def flag_call(call_id: int, body: FlagRequest):
    rows = _query_index_db(
        "SELECT hit_type FROM calls WHERE id = ?", (call_id,)
    )
    if not rows:
        raise HTTPException(404, f"Call {call_id} not found")
    if rows[0]["hit_type"] != "semantic":
        raise HTTPException(400, "Only semantic hits can be flagged as false positives")
    _write_index_db(
        "UPDATE calls SET false_positive = ? WHERE id = ?",
        (1 if body.flagged else 0, call_id),
    )
    return {"call_id": call_id, "flagged": body.flagged}


@app.get("/tuning/false-positives")
async def tuning_false_positives(
    model: str = "gpt-4o-mini",
    limit: int = 50,
):
    loop = asyncio.get_event_loop()
    rows = await loop.run_in_executor(
        None, get_analytics().false_positive_queue, model, limit
    )
    return {"data": rows, "model": model}


@app.get("/calls")
async def list_calls(
    endpoint: str | None = None,
    session_id: str | None = None,
    model: str | None = None,
    limit: int = 100,
    offset: int = 0,
):
    """Paginated call log filterable by endpoint, session, and model."""
    conditions = []
    params: list = []
    if endpoint is not None:
        conditions.append("endpoint = ?")
        params.append(endpoint)
    if session_id is not None:
        conditions.append("session_id = ?")
        params.append(session_id)
    if model is not None:
        conditions.append("model = ?")
        params.append(model)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    params += [limit, offset]

    rows = _query_index_db(
        f"SELECT * FROM calls {where} ORDER BY timestamp DESC LIMIT ? OFFSET ?",
        tuple(params),
    )
    return {"data": rows, "limit": limit, "offset": offset}


# ── Run history routes ────────────────────────────────────────────────────────

@app.get("/runs")
async def list_runs(limit: int = 50, offset: int = 0, batch_id: str | None = None):
    """Return a paginated list of saved run summaries, newest first."""
    loop = asyncio.get_event_loop()
    runs = await loop.run_in_executor(None, _db.list_runs, limit, offset, batch_id)
    total = await loop.run_in_executor(None, _db.count_runs)
    return {"runs": runs, "total": total}


@app.get("/runs/{run_id}")
async def get_run(run_id: str):
    """Return a single run's summary plus all its per-call records."""
    loop = asyncio.get_event_loop()
    run = await loop.run_in_executor(None, _db.get_run, run_id)
    if run is None:
        raise HTTPException(404, f"Run '{run_id}' not found")
    return run


@app.delete("/runs/{run_id}")
async def delete_run(run_id: str):
    """Delete a saved run and its call records."""
    loop = asyncio.get_event_loop()
    deleted = await loop.run_in_executor(None, _db.delete_run, run_id)
    if not deleted:
        raise HTTPException(404, f"Run '{run_id}' not found")
    return {"deleted": run_id}


# ── Experiment / batch routes ─────────────────────────────────────────────────

@app.get("/experiment-presets")
async def get_presets():
    return {"presets": list_presets()}


@app.get("/experiment-presets/{preset_id}")
async def get_preset(preset_id: str):
    try:
        return load_preset(preset_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@app.post("/run-batch")
async def start_batch(batch: BatchConfig, background_tasks: BackgroundTasks):
    global _batch_running
    if _batch_running:
        raise HTTPException(409, "A batch is already running")
    if not batch.batch_id:
        batch.batch_id = str(uuid.uuid4())[:8]
    background_tasks.add_task(run_batch, batch)
    cells = expand_matrix(batch.base, batch.matrix)
    return {"batch_id": batch.batch_id, "total_cells": len(cells)}


@app.get("/batch-status")
async def batch_status():
    return {"running": _batch_running}


# ── Analysis / tuning routes ──────────────────────────────────────────────────

@app.get("/analyze")
async def analyze_runs(batch_id: str | None = None):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _analyze.analyze, batch_id)


@app.get("/recommendations")
async def get_recommendations():
    return _db.load_tuning()


@app.post("/apply-threshold")
async def apply_threshold(req: ApplyThresholdRequest):
    """Apply the recommended threshold for a suite/model to the live engine."""
    tuning = _db.load_tuning()
    recs = tuning.get("recommendations", [])
    if not recs:
        raise HTTPException(404, "No recommendations available — run /analyze first")

    applied = None
    for rec in recs:
        if req.suite_name and rec.get("suite") != req.suite_name:
            continue
        if req.model and rec.get("model") != req.model:
            continue
        if rec.get("cache_mode", "cold") != req.cache_mode:
            continue
        model = rec["model"]
        threshold = rec["optimal_threshold"]
        engine = get_engine(model)
        engine.set_threshold(threshold)
        applied = {"model": model, "suite": rec["suite"], "threshold": threshold}
        break

    if not applied:
        # Fall back to first recommendation
        rec = recs[0]
        engine = get_engine(rec["model"])
        engine.set_threshold(rec["optimal_threshold"])
        applied = {"model": rec["model"], "suite": rec["suite"], "threshold": rec["optimal_threshold"]}

    return {"applied": applied}
