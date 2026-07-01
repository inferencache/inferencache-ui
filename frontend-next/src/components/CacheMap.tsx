"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CacheEntry {
  prompt_hash: string;
  prompt: string;
  model: string;
  hit_count: number;
  created_at: number;
  last_hit_at?: number | null;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  code:        "#3b82f6",
  explanation: "#a78bfa",
  qa:          "#f59e0b",
  other:       "#4b5563",
} as const;

type PromptType = keyof typeof TYPE_COLORS;

function detectPromptType(prompt: string): PromptType {
  const p = prompt.toLowerCase();
  if (/\b(function|class|import|def |const |var |git |test|debug|fix|refactor|implement)\b/.test(p)) return "code";
  if (/\b(explain|what is|how does|describe|summarize|why)\b/.test(p)) return "explanation";
  if (/\b(what|when|where|who|which|how many|how much|\?)\b/.test(p)) return "qa";
  return "other";
}

function promptToXY(prompt: string, W: number, H: number): { x: number; y: number } {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < prompt.length; i++) {
    h1 = (Math.imul(31, h1) + prompt.charCodeAt(i)) | 0;
    h2 = (Math.imul(37, h2) + prompt.charCodeAt(i + 1 || 0)) | 0;
  }
  const type = detectPromptType(prompt);
  const centers = {
    code:        { x: 0.25, y: 0.35 },
    explanation: { x: 0.55, y: 0.48 },
    qa:          { x: 0.75, y: 0.28 },
    other:       { x: 0.62, y: 0.70 },
  };
  const c = centers[type];
  const noise = 0.14;
  const nx = ((h1 >>> 0) / 0xffffffff) * noise * 2 - noise;
  const ny = ((h2 >>> 0) / 0xffffffff) * noise * 2 - noise;
  return {
    x: Math.max(8, Math.min(W - 8, (c.x + nx) * W)),
    y: Math.max(8, Math.min(H - 8, (c.y + ny) * H)),
  };
}

function renderMap(
  ctx: CanvasRenderingContext2D,
  entries: CacheEntry[],
  W: number,
  H: number,
  highlighted?: string | null,
) {
  ctx.clearRect(0, 0, W, H);
  for (const entry of entries) {
    const { x, y } = promptToXY(entry.prompt, W, H);
    const type = detectPromptType(entry.prompt);
    const radius = 3 + Math.min(entry.hit_count / 5, 4);
    const alpha = 0.5 + Math.min(entry.hit_count / 20, 0.5);
    const isHighlighted = highlighted === entry.prompt_hash;

    ctx.beginPath();
    ctx.arc(x, y, isHighlighted ? radius + 2 : radius, 0, Math.PI * 2);
    ctx.fillStyle = TYPE_COLORS[type];
    ctx.globalAlpha = isHighlighted ? 1 : alpha;
    ctx.fill();

    if (isHighlighted) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Tooltip {
  x: number;
  y: number;
  entry: CacheEntry;
}

interface Props {
  entries: CacheEntry[];
}

export function CacheMap({ entries }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [panel, setPanel] = useState<CacheEntry | null>(null);
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const filtered = search.trim()
    ? entries.filter((e) => e.prompt.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (W === 0 || H === 0) return;
    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    renderMap(ctx, filtered, W, H, highlighted);
  }, [filtered, highlighted]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [draw]);

  function findNearestEntry(mx: number, my: number): CacheEntry | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    let best: CacheEntry | null = null;
    let bestDist = 20;
    for (const entry of filtered) {
      const { x, y } = promptToXY(entry.prompt, W, H);
      const dist = Math.hypot(x - mx, y - my);
      if (dist < bestDist) { bestDist = dist; best = entry; }
    }
    return best;
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const entry = findNearestEntry(mx, my);
    if (entry) {
      setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12, entry });
      setHighlighted(entry.prompt_hash);
    } else {
      setTooltip(null);
      setHighlighted(null);
    }
  }

  function onMouseLeave() {
    setTooltip(null);
    setHighlighted(null);
  }

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const entry = findNearestEntry(mx, my);
    if (entry) setPanel(entry);
  }

  async function clearEntry(hash: string) {
    const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
    await fetch(`${BASE}/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_hash: hash }),
    }).catch(() => {});
    setPanel(null);
  }

  return (
    <div className="ds-fullmap">
      <div className="ds-fullmap-toolbar">
        <input
          type="text"
          className="ds-fullmap-search"
          placeholder="Search prompts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {filtered.length} entries
        </span>
        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          {(Object.entries(TYPE_COLORS) as [PromptType, string][]).map(([type, color]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block" }} />
              <span style={{ textTransform: "capitalize" }}>{type === "qa" ? "Q&A" : type}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="ds-fullmap-canvas-wrap"
        ref={wrapRef}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block", cursor: "crosshair" }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onClick={onClick}
        />

        {filtered.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: 13,
              pointerEvents: "none",
            }}
          >
            Click a dot to inspect · Hover for preview
          </div>
        )}

        {tooltip && (
          <div
            className="ds-map-tooltip"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <div style={{ marginBottom: 4 }}>
              {tooltip.entry.prompt.slice(0, 120)}{tooltip.entry.prompt.length > 120 ? "…" : ""}
            </div>
            <div style={{ color: "var(--muted)", fontSize: 11 }}>
              {detectPromptType(tooltip.entry.prompt)} ·{" "}
              {tooltip.entry.hit_count} hit{tooltip.entry.hit_count !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {panel && (
          <div className="ds-map-panel">
            <div className="ds-map-panel-header">
              <span className="ds-map-panel-title">Cache entry</span>
              <button
                type="button"
                className="ds-map-panel-close"
                onClick={() => setPanel(null)}
                aria-label="Close panel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="ds-map-panel-body">
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Prompt</div>
                <div className="ds-map-panel-prompt">{panel.prompt}</div>
              </div>
              <div className="ds-map-panel-meta">
                <div>Model: {panel.model}</div>
                <div>Hits: {panel.hit_count}</div>
                <div>Stored: {new Date(panel.created_at * 1000).toLocaleDateString()}</div>
                {panel.last_hit_at && (
                  <div>Last hit: {new Date(panel.last_hit_at * 1000).toLocaleString()}</div>
                )}
              </div>
              <button
                type="button"
                className="ds-map-clear-btn"
                onClick={() => clearEntry(panel.prompt_hash)}
              >
                Clear this entry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
