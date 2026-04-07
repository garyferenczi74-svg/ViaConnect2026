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
// Cart infrastructure (Prompt #52). Mounted at AppShell level so the cart icon
// in the global Header has access to useCart() from any portal page.
import { CartProvider } from "@/context/CartContext";
import { CartSlideOver } from "@/components/shop/CartSlideOver";

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
    <CartProvider>
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
          {/* Header — always visible (logo, breadcrumbs, search, bell, cart) */}
          <Header
            onMobileMenuToggle={() => {}}
            mobileMenuOpen={false}
            onCommandPaletteOpen={handleCommandPaletteOpen}
          />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>

        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
        <ToastProvider />
        {/* Global cart drawer — driven by useCart().openCart() from anywhere */}
        <CartSlideOver />
      </div>
    </CartProvider>
  );
}

