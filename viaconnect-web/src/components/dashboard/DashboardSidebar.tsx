"use client";

import {
  Gauge, BarChart3, BrainCircuit, Pill, FlaskConical, Dna, LineChart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DASHBOARD_SIDEBAR_SECTIONS } from "@/config/dashboard-sidebar";

const ICON_MAP: Record<string, LucideIcon> = {
  Gauge, BarChart3, BrainCircuit, Pill, FlaskConical, Dna, LineChart,
};

function SidebarGroupDivider({ label }: { label: string }) {
  return (
    <div className="px-3 pt-4 pb-1">
      <p className="text-[8px] text-white/10 uppercase tracking-[0.2em] font-bold">{label}</p>
    </div>
  );
}

interface DashboardSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  caqCompleted: boolean;
  hasPeptideRecs: boolean;
}

export function DashboardSidebar({ activeSection, onSectionChange, caqCompleted, hasPeptideRecs }: DashboardSidebarProps) {
  const visibleSections = DASHBOARD_SIDEBAR_SECTIONS.filter((s) => {
    if (s.alwaysVisible) return true;
    if (s.visibilityCondition === "caqCompleted") return caqCompleted;
    return true;
  });

  let lastGroup = "";

  return (
    <nav className="hidden lg:block sticky top-24 w-56 flex-shrink-0 self-start">
      <div className="space-y-0.5">
        {visibleSections.map((section) => {
          const isActive = activeSection === section.id;
          const IconComponent = ICON_MAP[section.icon] || Gauge;
          const isProtocol = section.group === "protocols";
          const isSupplement = section.id === "supplement-protocol";
          const isPeptide = section.id === "peptide-protocol";
          const accentHex = isSupplement ? "#2DA5A0" : isPeptide ? "#A855F7" : "#FFFFFF";

          const showDivider = section.group !== lastGroup;
          lastGroup = section.group;

          const groupLabel = section.group === "protocols" ? "Protocols" : section.group === "insights" ? "Insights" : "";

          return (
            <div key={section.id}>
              {showDivider && groupLabel && <SidebarGroupDivider label={groupLabel} />}
              <button
                type="button"
                onClick={() => onSectionChange(section.id)}
                className={`w-full text-left group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 min-h-[40px] border-l-2 ${
                  isActive
                    ? isProtocol
                      ? ""
                      : "bg-white/8 border-white/30"
                    : "border-transparent hover:bg-white/[0.04]"
                }`}
                style={isActive && isProtocol ? {
                  backgroundColor: `${accentHex}1A`,
                  borderLeftColor: `${accentHex}66`,
                } : undefined}
              >
                <IconComponent
                  className="w-4 h-4 flex-shrink-0 transition-colors"
                  style={{ color: isActive ? (isProtocol ? accentHex : "rgba(255,255,255,0.7)") : "rgba(255,255,255,0.25)" }}
                  strokeWidth={1.5}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className="text-xs font-medium block truncate transition-colors"
                    style={{ color: isActive ? (isProtocol ? accentHex : "rgba(255,255,255,0.8)") : "rgba(255,255,255,0.35)" }}
                  >
                    {section.label}
                  </span>
                  {isProtocol && section.description && (
                    <span className={`text-[9px] block truncate ${isActive ? "text-white/25" : "text-white/12"}`}>
                      {section.description}
                    </span>
                  )}
                </div>
                {isPeptide && hasPeptideRecs && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#A855F799" }} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
