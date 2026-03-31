"use client";

import { Zap, Calendar, CalendarDays, CalendarPlus, CalendarClock, Hexagon } from "lucide-react";
import type { PeptideRecommendation } from "@/lib/ai/peptide-matching";
import { downloadICS } from "@/lib/calendar/add-to-calendar";

interface PeptideTimelineProps {
  recommendations: PeptideRecommendation[];
}

function buildTimeline(recs: PeptideRecommendation[]): Record<string, string[]> {
  const today: string[] = [];
  const thisWeek: string[] = [];
  const thisMonth: string[] = [];

  for (const rec of recs) {
    const names = rec.products.map((p) => p.name).join(" + ");
    today.push(`Begin ${names} at suggested dose`);
    thisWeek.push(`Assess tolerance for ${names} \u2014 note any changes`);
    thisMonth.push(`Complete 30-day loading cycle for ${names}`);
  }

  today.push("Review protocol with your practitioner");
  thisWeek.push("Log daily adherence in ViaConnect for Helix rewards");
  thisMonth.push("Schedule 30-day reassessment to track pattern shifts");

  return { today, thisWeek, thisMonth };
}

export function PeptideTimeline({ recommendations }: PeptideTimelineProps) {
  const timeline = buildTimeline(recommendations);

  const sections = [
    { key: "today", label: "Start Today", icon: Zap, accent: "#2DA5A0" },
    { key: "thisWeek", label: "This Week", icon: Calendar, accent: "#60A5FA" },
    { key: "thisMonth", label: "30-Day Loading", icon: CalendarDays, accent: "#A855F7" },
  ];

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-purple-400/60" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-white">Protocol Timeline</h3>
          </div>
          <span className="text-xs text-white/20">30-day loading cycle</span>
        </div>
      </div>

      <div className="p-5 space-y-3">
        {sections.map((section) => {
          const items = timeline[section.key] || [];
          return (
            <div key={section.key}>
              <div className="flex items-center gap-2 mb-2">
                <section.icon className="w-3.5 h-3.5" style={{ color: `${section.accent}99` }} strokeWidth={1.5} />
                <span className="text-xs font-semibold text-white/40">{section.label}</span>
              </div>
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 pl-6 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/15 flex-shrink-0" />
                  <span className="text-xs text-white/30 flex-1">{item}</span>
                  <button
                    onClick={() => downloadICS({ action: item, rationale: "From your ViaConnect Peptide Protocol", expectedTimeframe: section.label })}
                    className="ml-auto min-h-[36px] flex items-center gap-1 text-[10px] text-white/15 hover:text-white/30 transition-colors flex-shrink-0"
                  >
                    <CalendarPlus className="w-3 h-3" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {/* Progress tracker */}
        <div className="flex items-center gap-3 pt-3 border-t border-white/5">
          <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center flex-shrink-0">
            <Hexagon className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs text-white/40">Day 0 of 30 \u2014 Protocol not yet started</p>
            <p className="text-[10px] text-amber-400/40">0 Helix earned so far</p>
          </div>
        </div>
      </div>
    </div>
  );
}
