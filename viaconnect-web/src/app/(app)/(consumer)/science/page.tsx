"use client";

import { useState } from "react";
import { ALL_EXPERTS, DOMAIN_CONFIG } from "@/config/expert-authorities";
import { ShieldCheck, BookOpen, ExternalLink } from "lucide-react";
import type { ExpertAuthority } from "@/config/expert-authorities";

const DOMAINS = Object.entries(DOMAIN_CONFIG);

const DOMAIN_COLORS: Record<string, string> = {
  "teal-400": "#2DA5A0",
  "purple-400": "#A855F7",
  "blue-400": "#60A5FA",
  "red-400": "#EF4444",
  "amber-400": "#FBBF24",
  "emerald-400": "#34D399",
  "green-400": "#22C55E",
  "orange-400": "#F97316",
};

function ExpertCard({ expert, color }: { expert: ExpertAuthority; color: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 min-h-[44px]"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: `${color}1A`, border: `1px solid ${color}26` }}
          >
            <BookOpen className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white">{expert.name}</h4>
            <p className="text-xs text-white/30 mt-0.5">{expert.specialty}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-white/20">{expert.country}</span>
              {expert.publicationCount && (
                <span className="text-[10px] text-white/15">{expert.publicationCount} publications</span>
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3">
          {expert.notableWork && (
            <div>
              <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-1">Notable Work</p>
              <p className="text-xs text-white/40 leading-relaxed">{expert.notableWork}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-1">Key Contributions</p>
            <div className="space-y-1">
              {expert.keyContributions.map((c, i) => (
                <p key={i} className="text-xs text-white/35 flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: `${color}66` }} />
                  {c}
                </p>
              ))}
            </div>
          </div>
          {expert.affiliations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {expert.affiliations.map((a, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/25">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SciencePage() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredExperts = activeFilter
    ? ALL_EXPERTS.filter(e => e.domain === activeFilter)
    : ALL_EXPERTS;

  return (
    <div className="p-5 md:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="relative flex-shrink-0">
            <div className="absolute blur-lg -inset-1 rounded-2xl opacity-60" style={{ backgroundColor: "#2DA5A033" }} />
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2DA5A033, #2DA5A01A, transparent)", border: "1px solid #2DA5A026" }}>
              <ShieldCheck className="w-5 h-5 text-teal-400" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Science & Authorities</h1>
            <p className="text-xs text-white/30 mt-0.5">
              {ALL_EXPERTS.length} experts across {DOMAINS.length} disciplines power your Ultrathink analysis
            </p>
          </div>
        </div>
      </div>

      {/* Trust badge */}
      <div className="rounded-xl bg-teal-400/[0.03] border border-teal-400/10 p-4">
        <p className="text-xs text-white/40 leading-relaxed">
          Every recommendation in your ViaConnect wellness profile is informed by the research and clinical frameworks of these recognized authorities. Ultrathink synthesizes their work across 14 specialty lenses to create your personalized blueprint.
        </p>
      </div>

      {/* Domain filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter(null)}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors min-h-[36px] ${
            !activeFilter ? "bg-teal-400/15 border border-teal-400/30 text-teal-400" : "bg-white/5 border border-white/10 text-white/30 hover:text-white/50"
          }`}
        >
          All ({ALL_EXPERTS.length})
        </button>
        {DOMAINS.map(([key, cfg]) => {
          const count = ALL_EXPERTS.filter(e => e.domain === key).length;
          const hex = DOMAIN_COLORS[cfg.color] || "#2DA5A0";
          const isActive = activeFilter === key;

          return (
            <button
              key={key}
              onClick={() => setActiveFilter(isActive ? null : key)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors min-h-[36px] ${
                isActive
                  ? "border"
                  : "bg-white/5 border border-white/10 text-white/30 hover:text-white/50"
              }`}
              style={isActive ? { backgroundColor: `${hex}1A`, borderColor: `${hex}4D`, color: hex } : undefined}
            >
              {cfg.shortLabel} ({count})
            </button>
          );
        })}
      </div>

      {/* Expert grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredExperts.map(expert => {
          const cfg = DOMAIN_CONFIG[expert.domain];
          const hex = DOMAIN_COLORS[cfg?.color || "teal-400"] || "#2DA5A0";
          return <ExpertCard key={expert.id} expert={expert} color={hex} />;
        })}
      </div>

      {/* Footer */}
      <div className="rounded-xl bg-white/[0.02] border border-white/8 p-5">
        <p className="text-xs text-white/25 leading-relaxed">
          This list represents the primary expert authorities whose research and clinical frameworks inform ViaConnect&apos;s Ultrathink AI engine. Their inclusion does not imply endorsement of ViaConnect or ViaConnect products. All recommendations are generated by AI synthesis of published research and should be reviewed with your healthcare practitioner.
        </p>
      </div>
    </div>
  );
}
