"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Real-time Supabase subscriptions (tokens, notifications, supplement logs)
  useRealtimeSubscriptions(user.id);

  // Keyboard shortcuts
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
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
      if (e.matches) setMobileOpen(false);
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

  // Only apply sidebar margin on desktop — mobile uses overlay
  const mainMarginLeft = mounted && isDesktop ? (sidebarCollapsed ? 72 : 260) : 0;

  // Sidebar visibility: hidden on mobile unless menu open, always visible on desktop
  const sidebarVisible = isDesktop || mobileOpen;

  return (
    <div className="min-h-screen bg-dark-bg" data-portal={role}>
      {/* Mobile overlay — only when sidebar is open on mobile */}
      {mobileOpen && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden off-screen on mobile, fixed on desktop */}
      <div
        className="fixed inset-y-0 left-0 z-50"
        style={{
          transform: sidebarVisible ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 200ms ease",
        }}
      >
        <Sidebar user={user} role={role} onCollapseChange={setSidebarCollapsed} />
      </div>

      {/* Main content — full width on mobile, offset on desktop */}
      <div
        className="flex flex-col min-h-screen w-full"
        style={{
          marginLeft: mainMarginLeft,
          transition: "margin-left 200ms ease",
        }}
      >
        <Header
          onMobileMenuToggle={handleMobileToggle}
          mobileMenuOpen={mobileOpen}
          onCommandPaletteOpen={handleCommandPaletteOpen}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Toast notifications */}
      <ToastProvider />
    </div>
  );
}
