"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

interface AppShellContextValue {
  controlsOpen:  boolean;
  openControls:  () => void;
  closeControls: () => void;
  toggleControls: () => void;
  closeAll:      () => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [controlsOpen, setControlsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setControlsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 1023px)");
    function sync() {
      if (!mobile.matches) {
        document.body.style.overflow = "";
        return;
      }
      document.body.style.overflow = controlsOpen ? "hidden" : "";
    }
    sync();
    mobile.addEventListener("change", sync);
    return () => {
      mobile.removeEventListener("change", sync);
      document.body.style.overflow = "";
    };
  }, [controlsOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setControlsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const closeAll = useCallback(() => {
    setControlsOpen(false);
  }, []);

  const value: AppShellContextValue = {
    controlsOpen,
    openControls:   () => setControlsOpen(true),
    closeControls:  () => setControlsOpen(false),
    toggleControls: () => setControlsOpen((v) => !v),
    closeAll,
  };

  return (
    <AppShellContext.Provider value={value}>
      {controlsOpen && (
        <button
          type="button"
          className="shell-backdrop lg:hidden"
          aria-label="Close menu"
          onClick={closeAll}
        />
      )}
      {children}
    </AppShellContext.Provider>
  );
}

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error("useAppShell must be used within AppShellProvider");
  return ctx;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    function onChange(e: MediaQueryListEvent) {
      setMatches(e.matches);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
