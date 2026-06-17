"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";
import { memo } from "react";
import { AppNavLink } from "@/components/navbar/AppNavLink";
import {
  NAV_ITEMS,
  tabHref,
  type DashboardTab,
  type NavbarPage,
  type NavItemDef,
} from "@/lib/dashboardNav";

interface Props {
  page:        NavbarPage;
  activeTab:   DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
  running?:    boolean;
  className?:  string;
}

export const AppNavLinks = memo(function AppNavLinks({
  page, activeTab, onTabChange, running = false, className,
}: Props) {
  const pathname = usePathname();
  const onDashboard = page === "dashboard" || pathname === "/";

  function isActive(item: NavItemDef): boolean {
    if (item.id === "saved-runs") return page === "saved-runs" || pathname.startsWith("/db");
    if (!onDashboard) return false;
    return item.id === activeTab;
  }

  return (
    <nav className={clsx("app-navbar-nav", className)} aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);

        if (item.href) {
          return (
            <AppNavLink key={item.id} item={item} active={active} href={item.href} />
          );
        }

        const tab = item.id as DashboardTab;
        const badge = tab === "live" && running
          ? <span className="nav-count">live</span>
          : undefined;

        if (onDashboard && onTabChange) {
          return (
            <AppNavLink
              key={item.id}
              item={item}
              active={active}
              href={tabHref(tab)}
              onSelect={() => onTabChange(tab)}
              badge={badge}
            />
          );
        }

        return (
          <AppNavLink key={item.id} item={item} active={active} href={tabHref(tab)} badge={badge} />
        );
      })}
    </nav>
  );
});
