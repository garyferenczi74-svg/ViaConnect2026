"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Battery, Zap, Flame, BrainCircuit, Shield, Activity, Clock, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PeptideRecommendation } from "@/lib/ai/peptide-matching";

const ACCENT_MAP: Record<string, { hex: string; icon: LucideIcon }> = {
  adrenal: { hex: "#FBBF24", icon: Battery },
  mitochondrial: { hex: "#2DA5A0", icon: Zap },
  metabolic: { hex: "#F97316", icon: Flame },
  neuro: { hex: "#A855F7", icon: BrainCircuit },
  immune: { hex: "#60A5FA", icon: Shield },
  hormonal: { hex: "#EC4899", icon: Activity },
  gut: { hex: "#22C55E", icon: Flame },
  longevity: { hex: "#22D3EE", icon: Clock },
};

interface DashboardPeptideCardProps {
  recommendation: PeptideRecommendation;
}

export function DashboardPeptideCard({ recommendation }: DashboardPeptideCardProps) {
  const [expanded, setExpanded] = useState(false);
  const accent = ACCENT_MAP[recommendation.patternCategory] || ACCENT_MAP.adrenal;
  const AccentIcon = accent.icon;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200 border"
      style={{
        background: `linear-gradient(135deg, ${accent.hex}0D, transparent)`,
        borderColor: `${accent.hex}1F`,
      }}
    >
      <div className="p-4">
        {/* Pattern badge + icon */}
        <div className="flex items-center justify-between mb-2.5">
          <span
            className="text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border"
            style={{ backgroundColor: `${accent.hex}1A`, color: `${accent.hex}99`, borderColor: `${accent.hex}1F` }}
          >
            {recommendation.patternName}
          </span>
          <AccentIcon className="w-3.5 h-3.5" style={{ color: `${accent.hex}66` }} strokeWidth={1.5} />
        </div>

        {/* Product names */}
        <h4 className="text-sm font-bold text-white leading-snug">
          {recommendation.products.map((p) => p.name).join(" + ")}
        </h4>

        {/* Why for you */}
        <p className="text-[11px] text-white/35 leading-relaxed mt-1.5 line-clamp-2">
          {recommendation.personalizedReason}
        </p>

        {/* Analogy */}
        <div className="flex items-center gap-2 mt-2.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
          <AccentIcon className="w-3 h-3 flex-shrink-0" style={{ color: `${accent.hex}66` }} strokeWidth={1.5} />
          <p className="text-[10px] text-white/25 italic line-clamp-1">{recommendation.analogy}</p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 mt-3 min-h-[32px] text-[10px] text-white/20 hover:text-white/35 transition-colors"
        >
          <span>{expanded ? "Less" : "Details"}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={1.5} />
        </button>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-2.5">
              {/* Dosing */}
              <div>
                <p className="text-[9px] text-white/15 uppercase tracking-wider mb-1">Suggested Protocol</p>
                <p className="text-[10px] text-white/25">{recommendation.dosingProtocol}</p>
                <p className="text-[9px] text-white/15 mt-0.5">{recommendation.cycleDuration}</p>
              </div>

              {/* Evidence badge */}
              <div className="flex items-center gap-2">
                <span className={`text-[8px] px-2 py-0.5 rounded-full ${
                  recommendation.evidenceLevel === "strong" ? "bg-teal-400/10 text-teal-400/50" :
                  recommendation.evidenceLevel === "moderate" ? "bg-amber-400/10 text-amber-400/50" :
                  "bg-orange-400/10 text-orange-400/50"
                }`}>
                  {recommendation.evidenceLevel} evidence
                </span>
                {recommendation.authorities?.map((a) => (
                  <span key={a} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/15">{a}</span>
                ))}
              </div>

              {/* GENEX360 synergy */}
              {recommendation.genexSynergy && (
                <p className="text-[9px] text-teal-400/30">GENEX360\u2122: {recommendation.genexSynergy}</p>
              )}

              {/* Retatrutide ref */}
              {recommendation.includesRetatrutideRef && (
                <div className="px-2.5 py-2 rounded-lg bg-orange-400/5 border border-orange-400/10">
                  <p className="text-[9px] text-orange-400/50 leading-relaxed">
                    For advanced metabolic support, discuss Retatrutide (triple agonist) with your practitioner \, investigational, clinical trials only.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
