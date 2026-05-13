"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { ViaConnectLogo } from "@/components/ui/ViaConnectLogo";
import { NotificationBell } from "@/components/layout/NotificationBell";

/**
 * Header per Prompt #147 2026-05-02: the top static breadcrumb (which derived
 * dead text from pathname.split via buildBreadcrumbs + LABEL_MAP and rendered
 * raw lowercase slug fragments like "Methylation Snp") was removed. The new
 * <BreadcrumbPills> component replaces it inside the hero card on each
 * catalog page with clickable Next.js Link pills + ChevronRight separators
 * + Framer Motion entrance/hover animations.
 *
 * What stays here: the mobile-only ViaConnect logo, the global Cmd+K search
 * trigger, and the NotificationBell. A flex spacer keeps the right section
 * right-aligned now that the breadcrumb nav is gone.
 */

export function Header({
  onCommandPaletteOpen,
}: {
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
  onCommandPaletteOpen: () => void;
}) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onCommandPaletteOpen();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCommandPaletteOpen]);

  return (
    <header
      className="sticky top-0 z-30 flex items-center h-16 px-4 lg:px-6 border-b"
      style={{
        background: "rgba(11,17,32,0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottomColor: "rgba(255,255,255,0.06)",
      }}
    >
      {/* ViaConnect logo on mobile */}
      <span className="lg:hidden mr-3">
        <ViaConnectLogo size="sm" />
      </span>

      {/* Spacer to keep right section right-aligned now that the breadcrumb nav is removed */}
      <div aria-hidden="true" className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-2 ml-4 shrink-0">
        {/* Search trigger */}
        <button
          onClick={onCommandPaletteOpen}
          className="flex items-center gap-2 h-8 px-3 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[10px] text-gray-600 bg-dark-surface px-1.5 py-0.5 rounded font-mono ml-1">
            {isMac ? "Cmd+" : "Ctrl+"}K
          </kbd>
        </button>

        {/* Notification bell */}
        <NotificationBell />
      </div>
    </header>
  );
}
