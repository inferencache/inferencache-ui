"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// ── Tab types ─────────────────────────────────────────────────────────────────

export type DashboardTab = "overview" | "map" | "live" | "tuning" | "devtools";

export type NavbarPage = "dashboard";

export interface NavItemDef {
  id:    DashboardTab;
  label: string;
  icon?: React.ReactNode;
  href?: string;
}

export const NAV_ITEMS: NavItemDef[] = [
  { id: "overview", label: "Overview" },
  { id: "map",      label: "Cache map" },
  { id: "live",     label: "Live" },
  { id: "tuning",   label: "Tuning" },
];

export const DEV_NAV_ITEM: NavItemDef = { id: "devtools", label: "Dev tools" };

export function tabHref(tab: DashboardTab): string {
  if (tab === "overview") return "/dashboard/";
  return `/dashboard/?tab=${tab}`;
}

export function parseDashboardTab(raw: string | null): DashboardTab {
  if (raw === "map" || raw === "live" || raw === "tuning" || raw === "devtools") return raw;
  return "overview";
}

// ── Dev mode context ──────────────────────────────────────────────────────────

interface DevModeContextValue {
  devMode: boolean;
  toggleDevMode: () => void;
}

const DevModeContext = createContext<DevModeContextValue>({
  devMode: false,
  toggleDevMode: () => {},
});

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    try {
      setDevMode(localStorage.getItem("devMode") === "true");
    } catch {}
  }, []);

  function toggleDevMode() {
    setDevMode((prev) => {
      const next = !prev;
      try { localStorage.setItem("devMode", String(next)); } catch {}
      return next;
    });
  }

  return (
    <DevModeContext.Provider value={{ devMode, toggleDevMode }}>
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  return useContext(DevModeContext);
}
