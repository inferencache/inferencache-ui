"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { openEventStream } from "@/lib/api";
import type { RunEvent } from "@/types";

type LiveFilter = "all" | "exact" | "semantic" | "miss";

interface FeedEntry {
  id: string;
  hitType: "exact" | "semantic" | "miss";
  similarity?: number;
  prompt: string;
  latencyMs: number;
}

const MAX_BUFFER = 200;
const DISPLAY_COUNT = 6;

function toBadgeVariant(hitType: FeedEntry["hitType"]): "exact" | "sem" | "miss" {
  if (hitType === "exact") return "exact";
  if (hitType === "semantic") return "sem";
  return "miss";
}

function badgeCls(v: "exact" | "sem" | "miss") {
  if (v === "exact") return "ds-feed-badge ds-feed-badge-exact";
  if (v === "sem") return "ds-feed-badge ds-feed-badge-sem";
  return "ds-feed-badge ds-feed-badge-miss";
}

function badgeText(entry: FeedEntry): string {
  if (entry.hitType === "exact") return "EXACT";
  if (entry.hitType === "semantic") return `SEM ${(entry.similarity ?? 0).toFixed(2)}`;
  return "MISS";
}

export function LiveFeed() {
  const [filter, setFilter] = useState<LiveFilter>("all");
  const [buffer, setBuffer] = useState<FeedEntry[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    const cleanup = openEventStream((ev: RunEvent & Record<string, unknown>) => {
      if (ev.event_type !== "call") return;
      const hitType = ev.hit_type === "exact" ? "exact"
        : ev.hit_type === "semantic" || ev.hit_type === "generative" ? "semantic"
        : "miss";

      const entry: FeedEntry = {
        id: `${Date.now()}-${counterRef.current++}`,
        hitType,
        similarity: ev.similarity,
        prompt: ev.prompt_preview ?? "",
        latencyMs: ev.latency_ms ?? 0,
      };

      setBuffer((prev) => {
        const next = [entry, ...prev];
        return next.length > MAX_BUFFER ? next.slice(0, MAX_BUFFER) : next;
      });
    });
    return cleanup;
  }, []);

  const filtered = buffer.filter((e) => {
    if (filter === "all") return true;
    if (filter === "exact") return e.hitType === "exact";
    if (filter === "semantic") return e.hitType === "semantic";
    return e.hitType === "miss";
  });

  const displayed = filtered.slice(0, DISPLAY_COUNT);

  return (
    <div className="ds-card" style={{ marginTop: 0 }}>
      <div className="ds-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className="ds-live-dot is-live"
            style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }}
          />
          <span className="ds-card-title">Live feed</span>
        </div>
        <div className="ds-filter-pills" role="group" aria-label="Filter live feed">
          {(["all", "exact", "semantic", "miss"] as LiveFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={clsx("ds-filter-pill", filter === f && "is-active")}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "exact" ? "Exact" : f === "semantic" ? "Semantic" : "Miss"}
            </button>
          ))}
        </div>
      </div>

      {displayed.length === 0 ? (
        <div style={{ padding: "16px 0", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
          Waiting for cache calls…
        </div>
      ) : (
        <div>
          {displayed.map((entry) => {
            const variant = toBadgeVariant(entry.hitType);
            const isFast = entry.latencyMs < 20;
            return (
              <div key={entry.id} className="ds-feed-row">
                <span className={badgeCls(variant)}>{badgeText(entry)}</span>
                <span className="ds-feed-prompt">{entry.prompt || "—"}</span>
                <span className={clsx("ds-feed-latency", isFast && "is-fast")}>
                  {entry.latencyMs}ms
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
