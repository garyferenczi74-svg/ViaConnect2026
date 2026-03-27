"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileNavBar } from "@/components/layout/MobileNavBar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useRealtimeSubscriptions, useKeyboardShortcuts } from "@/lib/hooks";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useRealtimeSubscriptions(user.id);

  useKeyboardShortcuts({
    onCommandPalette: useCallback(() => setCommandPaletteOpen(true), []),
    onToggleSidebar: useCallback(() => {
      setSidebarCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
        return next;
      });
    }, []),
  });

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "true") setSidebarCollapsed(true);

    const mql = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const handleCommandPaletteOpen = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const sidebarWidth = mounted && isDesktop ? (sidebarCollapsed ? 72 : 260) : 0;

  return (
    <div className="min-h-screen bg-dark-bg" data-portal={role}>
      {/* Desktop: Fixed sidebar */}
      {mounted && isDesktop && (
        <div className="fixed inset-y-0 left-0 z-50">
          <Sidebar user={user} role={role} onCollapseChange={setSidebarCollapsed} />
        </div>
      )}

      {/* Main content area */}
      <div
        className="flex flex-col min-h-screen"
        style={{
          marginLeft: sidebarWidth,
          transition: "margin-left 200ms ease",
        }}
      >
        {/* Header — always visible (logo, breadcrumbs, search, bell) */}
        <Header
          onMobileMenuToggle={() => {}}
          mobileMenuOpen={false}
          onCommandPaletteOpen={handleCommandPaletteOpen}
        />

        {/* Mobile only: horizontal scrolling nav bar below header */}
        {mounted && !isDesktop && (
          <MobileNavBar role={role} />
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <ToastProvider />
    </div>
  );
}
