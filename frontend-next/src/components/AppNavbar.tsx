"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { memo } from "react";
import clsx from "clsx";
import {
  NAV_ITEMS,
  DEV_NAV_ITEM,
  tabHref,
  parseDashboardTab,
  useDevMode,
} from "@/lib/dashboardNav";
import { useBackendPing } from "@/lib/useBackendPing";
import { ThemeToggle } from "@/components/ThemeToggle";

export const AppNavbar = memo(function AppNavbar() {
  const searchParams = useSearchParams();
  const activeTab = parseDashboardTab(searchParams.get("tab"));
  const { ms, ok, host } = useBackendPing();
  const { devMode, toggleDevMode } = useDevMode();

  const tabs = devMode ? [...NAV_ITEMS, DEV_NAV_ITEM] : NAV_ITEMS;

  return (
    <nav className="ds-nav">
      <Link href="/dashboard/" className="ds-nav-brand">
        <span className="ds-nav-brand-name">inferencache</span>
        <span className="ds-nav-version">v0.1</span>
      </Link>

      <div className="ds-nav-tabs" role="navigation" aria-label="Dashboard">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={tabHref(item.id)}
            className={clsx("ds-nav-tab", activeTab === item.id && "is-active")}
            aria-current={activeTab === item.id ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="ds-nav-right">
        <span className={clsx("ds-live-dot", ok && "is-live")} aria-hidden />
        <span className="ds-nav-host">
          {host || "localhost:8080"}{ms != null ? ` · ${ms}ms` : ""}
        </span>
        <ThemeToggle />
        <button
          type="button"
          className={clsx("ds-dev-btn", devMode && "is-active")}
          onClick={toggleDevMode}
          title={devMode ? "Hide Dev tools tab" : "Show Dev tools tab"}
        >
          {devMode ? "Dev mode: on" : "Dev mode"}
        </button>
      </div>
    </nav>
  );
});
