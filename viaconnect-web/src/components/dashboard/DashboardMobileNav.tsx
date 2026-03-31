"use client";

import {
  Gauge, BarChart3, BrainCircuit, Pill, FlaskConical, Dna, LineChart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DASHBOARD_SIDEBAR_SECTIONS } from "@/config/dashboard-sidebar";

const ICON_MAP: Record<string, LucideIcon> = {
  Gauge, BarChart3, BrainCircuit, Pill, FlaskConical, Dna, LineChart,
};

interface DashboardMobileNavProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  caqCompleted: boolean;
  hasPeptideRecs: boolean;
}

export function DashboardMobileNav({ activeSection, onSectionChange, caqCompleted, hasPeptideRecs }: DashboardMobileNavProps) {
  const visibleSections = DASHBOARD_SIDEBAR_SECTIONS.filter((s) => {
    if (s.alwaysVisible) return true;
    if (s.visibilityCondition === "caqCompleted") return caqCompleted;
    return true;
  });

  return (
    <div className="lg:hidden sticky top-16 z-30 -mx-4 px-4 py-2 bg-[#0F1520]/95 backdrop-blur-lg border-b border-white/5">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {visibleSections.map((section) => {
          const isActive = activeSection === section.id;
          const IconComponent = ICON_MAP[section.icon] || Gauge;
          const isSupplement = section.id === "supplement-protocol";
          const isPeptide = section.id === "peptide-protocol";
          const isProtocol = isSupplement || isPeptide;
          const accentHex = isSupplement ? "#2DA5A0" : isPeptide ? "#A855F7" : "#FFFFFF";

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-[11px] font-medium transition-all min-h-[36px] flex-shrink-0 border ${
                isActive
                  ? isProtocol ? "" : "bg-white/10 text-white/70 border-white/15"
                  : "bg-white/[0.03] text-white/30 border-white/5"
              }`}
              style={isActive && isProtocol ? {
                backgroundColor: `${accentHex}26`,
                color: accentHex,
                borderColor: `${accentHex}40`,
              } : undefined}
            >
              <IconComponent className="w-3 h-3" strokeWidth={1.5} />
              {section.shortLabel}
              {isPeptide && hasPeptideRecs && (
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#A855F7" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
