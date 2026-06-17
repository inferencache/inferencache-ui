"use client";

import { useEffect, useRef, useState } from "react";
import type { StoredKey } from "@/lib/useApiKeys";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { StyledSelect } from "@/components/StyledSelect";

interface Props {
  keys: StoredKey[];
  onAdd: (entry: Omit<StoredKey, "id">) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const PROVIDERS = [
  { value: "openai",    label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "other",     label: "Other" },
];

function mask(value: string): string {
  if (value.length <= 8) return "•".repeat(value.length);
  return value.slice(0, 4) + "•".repeat(Math.min(value.length - 8, 20)) + value.slice(-4);
}

export function ApiKeysModal({ keys, onAdd, onDelete, onClose }: Props) {
  const [label,    setLabel]    = useState("");
  const [provider, setProvider] = useState("openai");
  const [value,    setValue]    = useState("");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [error,    setError]    = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef  = useRef<HTMLDivElement>(null);
  const titleId    = "api-keys-modal-title";
  const errorId    = "api-keys-modal-error";

  useFocusTrap(true, dialogRef, onClose);

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmedLabel = label.trim();
    const trimmedValue = value.trim();
    if (!trimmedLabel) { setError("Enter a name for this key, e.g. \"Work OpenAI\"."); return; }
    if (!trimmedValue) { setError("Paste your API key here."); return; }
    setError("");
    onAdd({ label: trimmedLabel, provider, value: trimmedValue });
    setLabel("");
    setValue("");
    setProvider("openai");
  }

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg ge-card shadow-panel flex flex-col max-h-[90vh] min-w-0 modal-dialog"
      >
        <div className="card-header shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span id={titleId} className="card-title">API keys</span>
            <span className="badge-muted">Saved in this browser only</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-sm"
            aria-label="Close API keys dialog"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 min-h-0">
          {keys.length === 0 ? (
            <p className="py-10 text-center text-sm text-t-3">
              No keys saved yet. Add one below to run test suites.
            </p>
          ) : (
            <ul className="space-y-2" aria-label="Saved API keys">
              {keys.map((k) => {
                const providerLabel = PROVIDERS.find((p) => p.value === k.provider)?.label ?? k.provider;
                return (
                  <li key={k.id} className="key-list-item">
                    <span className="provider-badge">
                      {providerLabel}
                    </span>
                    <span className="text-sm font-medium shrink-0 max-w-[140px] truncate" title={k.label}>
                      {k.label}
                    </span>
                    <span className="flex-1 text-sm cell-mono truncate min-w-0" title={revealed.has(k.id) ? k.value : undefined}>
                      {revealed.has(k.id) ? k.value : mask(k.value)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleReveal(k.id)}
                      className="btn btn-outline btn-sm"
                      aria-pressed={revealed.has(k.id)}
                      aria-label={revealed.has(k.id) ? `Hide ${k.label} key` : `Reveal ${k.label} key`}
                    >
                      {revealed.has(k.id) ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(k.id)}
                      className="btn btn-outline btn-sm"
                      aria-label={`Delete ${k.label} key`}
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form onSubmit={handleAdd} className="px-5 py-4 space-y-3 shrink-0 border-t border-faint">
          <p className="control-section-title mb-0">Add a key</p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 min-w-0">
              <label htmlFor="api-key-label" className="field-label">Key name</label>
              <input
                id="api-key-label"
                className="ge-input text-sm w-full"
                placeholder="e.g. Work OpenAI"
                value={label}
                maxLength={100}
                onChange={(e) => { setLabel(e.target.value); setError(""); }}
                aria-invalid={!!error && !label.trim()}
                aria-describedby={error ? errorId : undefined}
              />
            </div>
            <div className="sm:w-36 shrink-0">
              <label htmlFor="api-key-provider" className="field-label">Provider</label>
              <StyledSelect
                id="api-key-provider"
                size="sm"
                value={provider}
                onChange={setProvider}
                options={PROVIDERS}
              />
            </div>
          </div>

          <div>
            <label htmlFor="api-key-value" className="field-label">Secret key</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="api-key-value"
                type="password"
                className="ge-input text-sm flex-1 min-w-0"
                placeholder="sk-… or sk-ant-…"
                value={value}
                maxLength={512}
                onChange={(e) => { setValue(e.target.value); setError(""); }}
                autoComplete="off"
                aria-invalid={!!error && !value.trim()}
                aria-describedby={error ? errorId : undefined}
              />
              <button
                type="submit"
                className="btn btn-primary shrink-0 justify-center sm:self-end disabled:opacity-40"
                disabled={!label.trim() || !value.trim()}
              >
                Save
              </button>
            </div>
          </div>

          {error && (
            <p id={errorId} className="text-xs data-cell-red" role="alert">
              {error}
            </p>
          )}

          <p className="text-2xs leading-relaxed text-t-3">
            Keys stay in this browser and are sent to the provider only when you run a test suite.
          </p>
        </form>
      </div>
    </div>
  );
}
