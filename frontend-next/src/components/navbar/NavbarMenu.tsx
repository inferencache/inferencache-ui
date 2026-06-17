"use client";

import clsx from "clsx";
import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { NavbarMenuNav } from "@/components/navbar/NavbarMenuNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAppShell } from "@/lib/appShell";
import type { DashboardTab, NavbarPage } from "@/lib/dashboardNav";
import type { RunPhase } from "@/types";

interface Props {
  page:         NavbarPage;
  activeTab:    DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
  running?:     boolean;
  phase?:       RunPhase;
  progress?:    number;
  total?:       number;
  host?:        string;
  pingMs?:      number | null;
  pingOk?:      boolean;
  keyCount?:    number;
  keysReady?:   boolean;
  onOpenKeys?:  () => void;
  onClear?:     () => void;
  chartUrl?:    string;
  hasChart?:    boolean;
  onDashboard?: boolean;
  showRunTools?: boolean;
  rightExtra?:  React.ReactNode;
}

function phaseLabel(phase: RunPhase, progress: number, total: number): string {
  if (phase === "starting")    return "Starting…";
  if (phase === "running")     return total > 0 ? `${progress} / ${total}` : "Running";
  if (phase === "summarizing") return "Summarizing…";
  if (phase === "done")        return "Done";
  if (phase === "error")       return "Error";
  return "";
}

export const NavbarMenu = memo(function NavbarMenu({
  page,
  activeTab,
  onTabChange,
  running = false,
  phase = "idle",
  progress = 0,
  total = 0,
  host = "",
  pingMs = null,
  pingOk = true,
  keyCount = 0,
  keysReady = false,
  onOpenKeys,
  onClear,
  chartUrl,
  hasChart = false,
  onDashboard = false,
  showRunTools = false,
  rightExtra,
}: Props) {
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { toggleControls } = useAppShell();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, close]);

  const isRunning = phase === "running" || phase === "starting";
  const showPhase = showRunTools && phase !== "idle";

  return (
    <div className="navbar-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className={clsx("navbar-menu-btn", open && "is-open")}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          {open ? (
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" strokeLinecap="round" />
              <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
              <line x1="4" y1="17" x2="20" y2="17" strokeLinecap="round" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div id={menuId} className="navbar-menu-panel" role="menu">
          <div className="navbar-menu-section">
            <div className="navbar-menu-heading">Pages</div>
            <NavbarMenuNav
              page={page}
              activeTab={activeTab}
              onTabChange={onTabChange}
              running={running}
              onNavigate={close}
            />
          </div>

          {showRunTools && (
            <div className="navbar-menu-section">
              <div className="navbar-menu-heading">Run</div>
              {showPhase && (
                <div className={clsx(
                  "navbar-menu-status",
                  isRunning && "is-running",
                  phase === "done" && "is-done",
                  phase === "error" && "is-error",
                )}>
                  {isRunning && <span className="sidebar-live-dot is-live" />}
                  {phaseLabel(phase, progress, total)}
                </div>
              )}
              {!keysReady && onOpenKeys && (
                <button type="button" className="navbar-menu-item" onClick={() => { onOpenKeys(); close(); }}>
                  <span className="navbar-menu-item-label warn">Add API key</span>
                </button>
              )}
              {onClear && (
                <button
                  type="button"
                  className="navbar-menu-item"
                  disabled={running}
                  onClick={() => { onClear(); close(); }}
                >
                  <span className="navbar-menu-item-label">Clear cache</span>
                </button>
              )}
            </div>
          )}

          <div className="navbar-menu-section">
            <div className="navbar-menu-heading">Tools</div>
            <button
              type="button"
              className="navbar-menu-item lg:hidden"
              onClick={() => { toggleControls(); close(); }}
            >
              <span className="navbar-menu-item-label">Configuration</span>
            </button>
            {rightExtra && (
              <div className="navbar-menu-extra" onClick={close} role="presentation">
                {rightExtra}
              </div>
            )}
            {onOpenKeys && (
              <button type="button" className="navbar-menu-item" onClick={() => { onOpenKeys(); close(); }}>
                <span className="navbar-menu-item-label">API keys</span>
                {keyCount > 0 && <span className="badge-count">{keyCount}</span>}
              </button>
            )}
            {chartUrl && hasChart && onDashboard && (
              <a
                href={chartUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="navbar-menu-item"
                onClick={close}
              >
                <span className="navbar-menu-item-label">Open chart</span>
              </a>
            )}
            <div className="navbar-menu-item navbar-menu-item-static">
              <span className="navbar-menu-item-label">Theme</span>
              <ThemeToggle compact />
            </div>
            {host && (
              <div className="navbar-menu-item navbar-menu-item-static">
                <span className={clsx("sidebar-live-dot", pingOk ? "is-live" : "is-offline")} />
                <span className="navbar-menu-item-label subtle">{host}{pingMs != null ? ` · ${pingMs}ms` : ""}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
