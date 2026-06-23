"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";
import clsx from "clsx";
import { Logo } from "@/components/Logo";
import {
  NAV_ITEMS,
  tabHref,
  type DashboardTab,
  type NavbarPage,
} from "@/lib/dashboardNav";
import { useBackendPing } from "@/lib/useBackendPing";

interface Props {
  page?:        NavbarPage;
  activeTab?:   DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
}

export const AppNavbar = memo(function AppNavbar({
  page = "dashboard",
  activeTab = "live",
  onTabChange,
}: Props) {
  const pathname = usePathname();
  const { ms, ok, host } = useBackendPing();
  const onDashboard = page === "dashboard" || pathname.startsWith("/dashboard");

  function isActive(id: string): boolean {
    if (id === "saved-runs") return page === "saved-runs" || pathname.startsWith("/dashboard/db");
    if (!onDashboard) return false;
    return id === activeTab;
  }

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        <Link href="/dashboard/" className="app-navbar-brand">
          <Logo variant="app" size={22} />
          <span className="app-navbar-brand-text pc-mono">inferencache</span>
        </Link>

        <nav className="app-navbar-tabs" aria-label="Dashboard">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.id);

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={clsx("app-nav-tab", active && "is-active")}
                >
                  <span className="app-nav-tab-icon">{item.icon}</span>
                  {item.label}
                </Link>
              );
            }

            const tab = item.id as DashboardTab;
            const href = tabHref(tab);

            if (onDashboard && onTabChange) {
              return (
                <Link
                  key={item.id}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    onTabChange(tab);
                  }}
                  className={clsx("app-nav-tab", active && "is-active")}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="app-nav-tab-icon">{item.icon}</span>
                  {item.label}
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={href}
                className={clsx("app-nav-tab", active && "is-active")}
              >
                <span className="app-nav-tab-icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="app-navbar-status">
          <span className={clsx("app-navbar-ping-dot", ok && "is-live")} />
          <span className="app-navbar-ping-text pc-mono">
            {host || "localhost"}{ms != null ? ` · ${ms}ms` : ""}
          </span>
        </div>
      </div>
    </header>
  );
});

export type { DashboardTab };
