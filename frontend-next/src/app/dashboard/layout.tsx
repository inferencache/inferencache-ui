import { Suspense } from "react";
import { AppNavbar } from "@/components/AppNavbar";
import { DevModeProvider } from "@/lib/dashboardNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DevModeProvider>
      <div className="ds-shell app-shell">
        <Suspense fallback={null}>
          <AppNavbar />
        </Suspense>
        <div className="ds-body">
          {children}
        </div>
      </div>
    </DevModeProvider>
  );
}
