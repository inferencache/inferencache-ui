"use client";

export type { DashboardTab } from "@/lib/dashboardNav";
export { NAV_ITEMS } from "@/lib/dashboardNav";

import type { DashboardTab } from "@/lib/dashboardNav";
import { AppNavLinks } from "@/components/navbar/AppNavLinks";

interface Props {
  activeTab:   DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  running?:    boolean;
}

/** @deprecated Use AppNavLinks in AppNavbar instead */
export function SidebarNav({ activeTab, onTabChange, running }: Props) {
  return (
    <AppNavLinks
      page="dashboard"
      activeTab={activeTab}
      onTabChange={onTabChange}
      running={running}
    />
  );
}
