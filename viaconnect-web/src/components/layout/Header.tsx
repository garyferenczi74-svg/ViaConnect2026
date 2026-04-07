"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Menu, X } from "lucide-react";
import { ViaConnectLogo } from "@/components/ui/ViaConnectLogo";
import { NotificationBell } from "@/components/layout/NotificationBell";

// ─── Breadcrumb helpers ──────────────────────────────────────────────────────

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  genetics: "Genetics",
  supplements: "Supplements",
  tokens: "Helix Rewards",
  helix: "Helix Rewards",
  messages: "Messages",
  profile: "Profile",
  assessment: "Assessment",
  patients: "Patients",
  protocols: "Protocols",
  analytics: "Analytics",
  genomics: "Genomics",
  interactions: "Interactions",
  ehr: "EHR Hub",
  ai: "AI Advisor",
  settings: "Settings",
  botanical: "Botanical",
  constitutional: "Constitutional",
  scheduler: "Scheduler",
  compliance: "Compliance",
  practitioner: "Practitioner",
  naturopath: "Naturopath",
  "formula-builder": "Formula Builder",
  builder: "Protocol Builder",
  onboarding: "Onboarding",
};

function formatSegment(segment: string): string {
  // Check label map first
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  // Dynamic route segments (like UUIDs or IDs) — show as-is but capitalized
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildBreadcrumbs(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  // Skip portal prefixes from breadcrumb display (they show in sidebar badge)
  const skip = new Set(["practitioner", "naturopath"]);
  return segments
    .filter((s) => !skip.has(s))
    .map(formatSegment);
}

// ─── Header Component ────────────────────────────────────────────────────────

export function Header({
  onMobileMenuToggle,
  mobileMenuOpen,
  onCommandPaletteOpen,
}: {
  onMobileMenuToggle: () => void;
  mobileMenuOpen: boolean;
  onCommandPaletteOpen: () => void;
}) {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);
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

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-gray-600 select-none">&gt;</span>}
            <span
              className={
                i === breadcrumbs.length - 1
                  ? "text-white font-medium truncate"
                  : "text-gray-500 truncate"
              }
            >
              {crumb}
            </span>
          </span>
        ))}
      </nav>

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
            {isMac ? "⌘" : "Ctrl+"}K
          </kbd>
        </button>

        {/* Notification bell */}
        <NotificationBell />
      </div>
    </header>
  );
}
