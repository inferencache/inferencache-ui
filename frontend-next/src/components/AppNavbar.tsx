"use client";

import { usePathname } from "next/navigation";
import { memo } from "react";
import { AppBrand } from "@/components/navbar/AppBrand";
import { NavbarMenu } from "@/components/navbar/NavbarMenu";
import { RunTestButton } from "@/components/navbar/RunTestButton";
import type { DashboardTab, NavbarPage } from "@/lib/dashboardNav";
import { useBackendPing } from "@/lib/useBackendPing";
import type { RunPhase } from "@/types";

interface Props {
  page?:        NavbarPage;
  activeTab?:   DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
  running?:     boolean;
  phase?:       RunPhase;
  progress?:    number;
  total?:       number;
  keyCount?:    number;
  keysReady?:   boolean;
  onOpenKeys?:  () => void;
  onRun?:       () => void;
  onClear?:     () => void;
  hasChart?:    boolean;
  onExportCsv?: () => void;
  rightExtra?:  React.ReactNode;
}

export const AppNavbar = memo(function AppNavbar({
  page = "dashboard",
  activeTab = "live",
  onTabChange,
  running = false,
  phase = "idle",
  progress = 0,
  total = 0,
  keyCount = 0,
  keysReady = false,
  onOpenKeys,
  onRun,
  onClear,
  hasChart = false,
  onExportCsv,
  rightExtra,
}: Props) {
  const pathname = usePathname();
  const { ms, ok, host } = useBackendPing();
  const onDashboard = page === "dashboard" || pathname === "/";
  const showRunActions = onDashboard && activeTab === "live";

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        <div className="app-navbar-left">
          <AppBrand backendOk={ok} />
        </div>

        <div className="app-navbar-right">
          {showRunActions && onRun && (
            <RunTestButton
              onClick={onRun}
              running={running}
              disabled={running || !keysReady}
            />
          )}

          <NavbarMenu
            page={page}
            activeTab={activeTab}
            onTabChange={onTabChange}
            running={running}
            phase={phase}
            progress={progress}
            total={total}
            host={host}
            pingMs={ms}
            pingOk={ok}
            keyCount={keyCount}
            keysReady={keysReady}
            onOpenKeys={onOpenKeys}
            onClear={onClear}
            hasChart={hasChart}
            onExportCsv={onExportCsv}
            onDashboard={onDashboard}
            showRunTools={showRunActions}
            rightExtra={rightExtra}
          />
        </div>
      </div>
    </header>
  );
});

export type { DashboardTab };
