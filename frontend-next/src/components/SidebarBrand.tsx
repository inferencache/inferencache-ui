"use client";

import clsx from "clsx";

interface Props {
  live?: boolean;
}

export function SidebarBrand({ live = true }: Props) {
  return (
    <div className="sidebar-logo">
      <div className="sidebar-logo-icon" aria-hidden>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2,10 5,6 8,12 11,4 14,8" />
        </svg>
      </div>
      <span className="sidebar-logo-name">
        inferencache
      </span>
      {live && (
        <div className="sidebar-live-chip">
          <span className={clsx("sidebar-live-dot", live && "is-live")} />
          live
        </div>
      )}
    </div>
  );
}
