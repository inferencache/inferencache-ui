"use client";

import { usePathname } from "next/navigation";
import { memo, useCallback } from "react";
import { NavbarMenuItem } from "@/components/navbar/NavbarMenuItem";
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
  onNavigate?: () => void;
}

export const NavbarMenuNav = memo(function NavbarMenuNav({
  page, activeTab, onTabChange, running = false, onNavigate,
}: Props) {
  const pathname = usePathname();
  const onDashboard = page === "dashboard" || pathname === "/";

  const close = useCallback(() => onNavigate?.(), [onNavigate]);

  function isActive(item: NavItemDef): boolean {
    if (item.id === "saved-runs") return page === "saved-runs" || pathname.startsWith("/db");
    if (!onDashboard) return false;
    return item.id === activeTab;
  }

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);

        if (item.href) {
          return (
            <NavbarMenuItem
              key={item.id}
              item={item}
              active={active}
              href={item.href}
              onNavigate={close}
            />
          );
        }

        const tab = item.id as DashboardTab;
        const badge = tab === "live" && running
          ? <span className="nav-count">live</span>
          : undefined;

        if (onDashboard && onTabChange) {
          return (
            <NavbarMenuItem
              key={item.id}
              item={item}
              active={active}
              href={tabHref(tab)}
              onSelect={() => { onTabChange(tab); close(); }}
              badge={badge}
            />
          );
        }

        return (
          <NavbarMenuItem
            key={item.id}
            item={item}
            active={active}
            href={tabHref(tab)}
            badge={badge}
            onNavigate={close}
          />
        );
      })}
    </>
  );
});
