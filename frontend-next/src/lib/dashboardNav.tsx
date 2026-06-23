import type { ReactNode } from "react";

export type DashboardTab = "live" | "analytics" | "tuning";

export type NavbarPage = "dashboard" | "saved-runs";

export interface NavItemDef {
  id:    DashboardTab | "saved-runs";
  label: string;
  href?: string;
  icon:  ReactNode;
}

export const NAV_ITEMS: NavItemDef[] = [
  {
    id: "live",
    label: "Cache testing",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="2" y="2" width="20" height="8" rx="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" />
      </svg>
    ),
  },
  {
    id: "tuning",
    label: "Tuning",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M3 12h3m12 0h3M12 3v3m0 12v3" />
      </svg>
    ),
  },
  {
    id: "saved-runs",
    label: "Saved runs",
    href: "/dashboard/db",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export function tabHref(tab: DashboardTab): string {
  return tab === "live" ? "/dashboard/" : `/dashboard/?tab=${tab}`;
}

export function parseDashboardTab(raw: string | null): DashboardTab {
  if (raw === "analytics" || raw === "tuning" || raw === "live") return raw;
  return "live";
}
