"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem, PortalType } from "@/lib/types";

const iconMap: Record<string, string> = {
  home: "🏠",
  dna: "🧬",
  pill: "💊",
  report: "📊",
  settings: "⚙️",
  patients: "👥",
  protocol: "📋",
  herb: "🌿",
  formula: "🧪",
};

const portalColors: Record<PortalType, { bg: string; active: string; hover: string; border: string }> = {
  wellness: {
    bg: "bg-green-900",
    active: "bg-green-700",
    hover: "hover:bg-green-800",
    border: "border-green-500",
  },
  practitioner: {
    bg: "bg-blue-900",
    active: "bg-blue-700",
    hover: "hover:bg-blue-800",
    border: "border-blue-500",
  },
  naturopath: {
    bg: "bg-amber-900",
    active: "bg-amber-700",
    hover: "hover:bg-amber-800",
    border: "border-amber-500",
  },
};

const portalLabels: Record<PortalType, string> = {
  wellness: "Personal Wellness",
  practitioner: "Practitioner",
  naturopath: "Naturopath",
};

interface SidebarProps {
  portal: PortalType;
  navItems: NavItem[];
}

export default function Sidebar({ portal, navItems }: SidebarProps) {
  const pathname = usePathname();
  const colors = portalColors[portal];

  return (
    <aside className={`w-64 min-h-screen ${colors.bg} text-white flex flex-col`}>
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="text-xs uppercase tracking-wider text-white/60 hover:text-white/80">
          ← ViaConnect
        </Link>
        <h2 className="text-lg font-bold mt-2">{portalLabels[portal]}</h2>
        <p className="text-xs text-white/60 mt-1">Genomic Health Platform</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? `${colors.active} border-l-4 ${colors.border}`
                  : `text-white/80 ${colors.hover}`
              }`}
            >
              <span className="text-lg">{iconMap[item.icon] || "•"}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 text-xs text-white/40">
        ViaConnect 2026 v1.0
      </div>
    </aside>
  );
}
