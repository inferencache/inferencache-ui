"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useAppShell, useMediaQuery } from "@/lib/appShell";

const STORAGE_KEY = "promptcache-sidebar-width";
const DEFAULT_W   = 252;
const MIN_W       = 220;
const MAX_W       = 520;

interface Props {
  children: React.ReactNode;
}

export function ResizableSidebar({ children }: Props) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { controlsOpen, closeControls } = useAppShell();
  const [width, setWidth] = useState(DEFAULT_W);
  const widthRef = useRef(DEFAULT_W);
  const dragging = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const n = parseInt(saved, 10);
    if (n >= MIN_W && n <= MAX_W) {
      setWidth(n);
      widthRef.current = n;
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDesktop) return;
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const startX = e.clientX;
    const startW = widthRef.current;

    function onMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const next = Math.min(MAX_W, Math.max(MIN_W, startW + ev.clientX - startX));
      widthRef.current = next;
      setWidth(next);
    }

    function onUp() {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      localStorage.setItem(STORAGE_KEY, String(widthRef.current));
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [isDesktop]);

  return (
    <aside
      className={clsx(
        "controls-panel relative flex flex-col min-h-0",
        !isDesktop && controlsOpen && "is-open",
      )}
      style={isDesktop ? { width } : undefined}
    >
      <div className="controls-drawer-header">
        <span className="card-title">Run controls</span>
        <button type="button" className="btn btn-outline btn-sm" onClick={closeControls}>
          Close
        </button>
      </div>

      {children}

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        onMouseDown={onMouseDown}
        className="controls-resize-handle absolute top-0 -right-px bottom-0 w-2 cursor-col-resize z-20 hidden lg:block"
      />
    </aside>
  );
}
