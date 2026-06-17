"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { fmtCost, flagCallFalsePositive } from "@/lib/api";
import type { RunEvent } from "@/types";

interface Props {
  call:    RunEvent | null;
  onClose: () => void;
}

export function CallDrawer({ call, onClose }: Props) {
  const [flagged,   setFlagged]   = useState(false);
  const [flagging,  setFlagging]  = useState(false);

  useEffect(() => {
    setFlagged(false);
  }, [call?.call_id]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!call) return null;

  if (call.event_type === "error") {
    return (
      <>
        <div className="call-drawer-backdrop" onClick={onClose} aria-hidden />
        <aside className="call-drawer" role="dialog" aria-label="Error detail">
          <div className="call-drawer-header">
            <span className="card-title">API error</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="call-drawer-body">
            {call.prompt_index != null && (
              <Row label="Prompt #">
                <span className="cell-mono">{call.prompt_index + 1}</span>
              </Row>
            )}
            {call.model && (
              <Row label="Model">
                <span className="cell-mono text-xs">{call.model}</span>
              </Row>
            )}
            <div className="call-drawer-section">
              <div className="call-drawer-section-label">Error message</div>
              <pre className="call-drawer-pre run-error-pre">{call.message ?? "Unknown error"}</pre>
            </div>
            {call.prompt_preview && (
              <div className="call-drawer-section">
                <div className="call-drawer-section-label">Prompt</div>
                <pre className="call-drawer-pre">{call.prompt_preview}</pre>
              </div>
            )}
          </div>
        </aside>
      </>
    );
  }

  const hitType  = call.hit_type ?? "miss";
  const isSemantic = hitType === "semantic";

  async function toggleFlag() {
    if (!call?.call_id || !isSemantic) return;
    setFlagging(true);
    try {
      await flagCallFalsePositive(call.call_id, !flagged);
      setFlagged(f => !f);
    } finally {
      setFlagging(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="call-drawer-backdrop"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <aside className="call-drawer" role="dialog" aria-label="Call detail">
        <div className="call-drawer-header">
          <span className="card-title">Call detail</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="call-drawer-body">
          {/* Hit type */}
          <Row label="Result">
            <span className={clsx(
              "grade-badge",
              `grade-badge-${hitType}`,
            )}>
              <span>
                {hitType === "exact" ? "EXACT" : hitType === "semantic" ? "SEMANTIC" : "MISS"}
              </span>
            </span>
          </Row>

          {/* Similarity */}
          {hitType === "semantic" && (
            <Row label="Similarity">
              <span className="cell-mono data-cell-teal">
                {(call.similarity ?? 0).toFixed(4)}
              </span>
            </Row>
          )}

          {/* Matched cached prompt (semantic hits only) */}
          {isSemantic && call.matched_prompt && (
            <div className="call-drawer-section">
              <div className="call-drawer-section-label">Matched prompt</div>
              <pre className="call-drawer-pre">{call.matched_prompt}</pre>
            </div>
          )}

          {/* Latency */}
          <Row label="Latency">
            <span className="cell-mono">{(call.latency_ms ?? 0).toFixed(1)} ms</span>
          </Row>

          {/* Token counts (null on cache hits) */}
          <Row label="Tokens in">
            <span className="cell-mono">
              {call.tokens_input != null ? call.tokens_input.toLocaleString() : "— (cache hit)"}
            </span>
          </Row>
          <Row label="Tokens out">
            <span className="cell-mono">
              {call.tokens_output != null ? call.tokens_output.toLocaleString() : "— (cache hit)"}
            </span>
          </Row>

          {/* Cost */}
          <Row label="Cost">
            <span className={clsx("cell-mono", call.cost_usd ? "data-cell-orange" : "data-cell-green")}>
              {call.cost_usd ? fmtCost(call.cost_usd) : "$0 (cache hit)"}
            </span>
          </Row>

          {/* Endpoint / session */}
          <Row label="Endpoint">
            <span className="cell-mono text-xs">{call.endpoint ?? "—"}</span>
          </Row>
          <Row label="Session">
            <span className="cell-mono text-xs">{call.session_id ?? "—"}</span>
          </Row>

          {/* Call ID */}
          {call.call_id != null && (
            <Row label="Call ID">
              <span className="cell-mono text-xs">{call.call_id}</span>
            </Row>
          )}

          {/* Prompt */}
          <div className="call-drawer-section">
            <div className="call-drawer-section-label">Prompt</div>
            <pre className="call-drawer-pre">{call.prompt_preview ?? "—"}</pre>
          </div>

          {/* Response preview */}
          {call.response_preview && (
            <div className="call-drawer-section">
              <div className="call-drawer-section-label">
                {hitType === "miss" ? "Response (cached)" : "Cached response"}
              </div>
              <pre className="call-drawer-pre">{call.response_preview}</pre>
            </div>
          )}

          {/* False-positive flag */}
          {isSemantic && call.call_id != null && (
            <div className="call-drawer-section">
              <button
                type="button"
                className={clsx(
                  "btn btn-sm w-full",
                  flagged ? "btn-outline data-cell-red" : "btn-outline",
                )}
                onClick={toggleFlag}
                disabled={flagging}
              >
                {flagging
                  ? "Saving…"
                  : flagged
                  ? "✓ Flagged as false positive — click to unflag"
                  : "Flag as false positive"}
              </button>
              {flagged && (
                <p className="text-xs text-t-3 mt-1">
                  This hit will appear in the Tuning tab review queue.
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="call-drawer-row">
      <span className="call-drawer-row-label">{label}</span>
      <span className="call-drawer-row-value">{children}</span>
    </div>
  );
}
