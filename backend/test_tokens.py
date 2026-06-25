"""Tests for tier token extraction helpers in main.py."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from main import (  # noqa: E402
    _compute_tier_savings,
    _extract_cached_input_tokens,
)


def test_openai_cached_tokens_from_details():
    usage = {
        "prompt_tokens": 1000,
        "prompt_tokens_details": {"cached_tokens": 512},
    }
    assert _extract_cached_input_tokens("openai", usage) == 512


def test_openai_cached_tokens_top_level_fallback():
    usage = {"prompt_tokens": 1000, "cached_tokens": 256}
    assert _extract_cached_input_tokens("openai", usage) == 256


def test_openai_cached_tokens_zero_when_absent():
    usage = {"prompt_tokens": 1000}
    assert _extract_cached_input_tokens("openai", usage) == 0


def test_anthropic_cache_read_tokens():
    usage = {"input_tokens": 800, "cache_read_input_tokens": 600}
    assert _extract_cached_input_tokens("anthropic", usage) == 600


def test_unknown_provider_returns_zero():
    assert _extract_cached_input_tokens("cohere", {"cached_tokens": 99}) == 0


def test_compute_tier_savings_openai():
    savings = _compute_tier_savings(
        "openai", "gpt-4o-mini",
        cached_input_tokens=200,
        tokens_input=500,
        tokens_output=100,
        cost_usd=0.001,
    )
    assert savings["tier2_cached_input_tokens"] == 200
    assert savings["tier2_cost_saved"] > 0
    assert savings["tier3_hit"] == 0


def test_compute_tier_savings_tier3_full_cache():
    savings = _compute_tier_savings(
        "openai", "gpt-4o-mini",
        cached_input_tokens=500,
        tokens_input=500,
        tokens_output=100,
        cost_usd=0.001,
    )
    assert savings["tier3_hit"] == 1
    assert savings["tier3_cost_saved"] > 0
