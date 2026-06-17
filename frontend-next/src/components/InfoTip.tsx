"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type Placement = "top" | "right" | "bottom";

interface InfoTipProps {
  content:   string;
  placement?: Placement;
  className?: string;
}

interface PanelPos {
  top:  number;
  left: number;
}

function computePos(
  anchor: DOMRect,
  panel: DOMRect,
  placement: Placement,
): PanelPos {
  const gap = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;

  if (placement === "right") {
    top = anchor.top + anchor.height / 2 - panel.height / 2;
    left = anchor.right + gap;
  } else if (placement === "bottom") {
    top = anchor.bottom + gap;
    left = anchor.left + anchor.width / 2 - panel.width / 2;
  } else {
    top = anchor.top - panel.height - gap;
    left = anchor.left + anchor.width / 2 - panel.width / 2;
  }

  left = Math.max(8, Math.min(left, vw - panel.width - 8));
  top = Math.max(8, Math.min(top, vh - panel.height - 8));
  return { top, left };
}

export const InfoTip = memo(function InfoTip({
  content,
  placement = "top",
  className,
}: InfoTipProps) {
  const tipId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PanelPos>({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  const reposition = useCallback(() => {
    const btn = btnRef.current;
    const panel = panelRef.current;
    if (!btn || !panel) return;
    setPos(computePos(btn.getBoundingClientRect(), panel.getBoundingClientRect(), placement));
  }, [placement]);

  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => {
    setOpen(false);
    setReady(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    setReady(true);
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  const panel = open && typeof document !== "undefined"
    ? createPortal(
        <div
          ref={panelRef}
          id={tipId}
          role="tooltip"
          className="info-tip-panel shell-portal"
          style={{
            top:       pos.top,
            left:      pos.left,
            opacity:   ready ? 1 : 0,
          }}
        >
          {content}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <span className={clsx("info-tip", className)}>
        <button
          ref={btnRef}
          type="button"
          className="info-tip-btn"
          aria-label="More information"
          aria-describedby={open ? tipId : undefined}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
            <path d="M8 7.2V11" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            <circle cx="8" cy="5.1" r="0.85" fill="currentColor" />
          </svg>
        </button>
      </span>
      {panel}
    </>
  );
});

/** Sidebar / form field label with an attached info tip */
export function ConfigLabel({
  children,
  tip,
  placement = "right",
}: {
  children:   React.ReactNode;
  tip:        string;
  placement?: Placement;
}) {
  return (
    <div className="cl cl-with-tip">
      <span>{children}</span>
      <InfoTip content={tip} placement={placement} />
    </div>
  );
}

/** Card or section title with an attached info tip */
export function TitleWithTip({
  children,
  tip,
  placement = "top",
  className,
}: {
  children:   React.ReactNode;
  tip:        string;
  placement?: Placement;
  className?: string;
}) {
  return (
    <span className={clsx("title-with-tip", className)}>
      {children}
      <InfoTip content={tip} placement={placement} />
    </span>
  );
}
