"use client";

import { useEffect, useRef } from "react";

interface Entry {
  prompt: string;
  hit_count: number;
}

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

function renderMiniMap(ctx: CanvasRenderingContext2D, entries: Entry[], W: number, H: number) {
  ctx.clearRect(0, 0, W, H);
  for (const entry of entries) {
    const { x, y } = promptToXY(entry.prompt, W, H);
    const type = detectPromptType(entry.prompt);
    const radius = 2.5 + Math.min(entry.hit_count / 5, 3.5);
    const alpha = 0.45 + Math.min(entry.hit_count / 20, 0.55);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = TYPE_COLORS[type];
    ctx.globalAlpha = alpha;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

interface Props {
  entries: Entry[];
  count: number;
}

export function CacheMapMini({ entries, count }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cappedEntries = entries.slice(0, 200);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    renderMiniMap(ctx, cappedEntries, W, H);
  }, [cappedEntries]);

  return (
    <div className="ds-card">
      <div className="ds-card-header">
        <span className="ds-card-title">Cache map</span>
        <span className="ds-card-meta">{count} prompts · hover to preview</span>
      </div>
      <div className="ds-map-canvas-wrap">
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
      <div className="ds-map-legend">
        {(Object.entries(TYPE_COLORS) as [PromptType, string][]).map(([type, color]) => (
          <div key={type} className="ds-map-legend-item">
            <span className="ds-map-legend-dot" style={{ background: color }} />
            <span style={{ textTransform: "capitalize" }}>{type === "qa" ? "Q&A" : type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
