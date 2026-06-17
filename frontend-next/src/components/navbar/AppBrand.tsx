"use client";

import Link from "next/link";
import { memo } from "react";
import clsx from "clsx";

interface Props {
  backendOk?: boolean;
  showLive?:  boolean;
}

export const AppBrand = memo(function AppBrand({ backendOk = true, showLive = false }: Props) {
  return (
    <>
      <Link href="/" className="app-navbar-brand">
        <span className="app-navbar-brand-icon" aria-hidden>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2,10 5,6 8,12 11,4 14,8" />
          </svg>
        </span>
        <span className="app-navbar-brand-text">
          promptcache <span className="hidden sm:inline">/ dashboard</span>
        </span>
      </Link>

      {showLive && (
        <div className="app-navbar-live hidden sm:flex">
          <span className={clsx("sidebar-live-dot", backendOk ? "is-live" : "is-offline")} />
          live
        </div>
      )}
    </>
  );
});
