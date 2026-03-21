"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ToastProvider } from "@/components/ui/Toast";

const SIDEBAR_STORAGE_KEY = "viaconnect-sidebar-collapsed";

export function AppShell({
  user,
  role,
  children,
}: {
  user: User;
  role: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    // Sync initial collapsed state from localStorage
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "true") setSidebarCollapsed(true);

    // Track desktop breakpoint (lg = 1024px)
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) setMobileOpen(false); // close mobile drawer on resize to desktop
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const handleMobileToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleCommandPaletteOpen = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const mainMarginLeft = isDesktop ? (sidebarCollapsed ? 72 : 260) : 0;

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <Sidebar user={user} role={role} onCollapseChange={setSidebarCollapsed} />
      </div>

      {/* Main content */}
      <div
        className="flex flex-col min-h-screen"
        style={{ marginLeft: mainMarginLeft, transition: "margin-left 200ms ease" }}
      >
        <Header
          onMobileMenuToggle={handleMobileToggle}
          mobileMenuOpen={mobileOpen}
          onCommandPaletteOpen={handleCommandPaletteOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Toast notifications */}
      <ToastProvider />
    </div>
  );
}
