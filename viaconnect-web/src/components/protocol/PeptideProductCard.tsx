"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Battery, Zap, Flame, BrainCircuit, Shield, Activity, Clock,
  ChevronDown, Hexagon, Dna, Stethoscope, AlertTriangle, UserSearch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PeptideRecommendation } from "@/lib/ai/peptide-matching";

const ACCENT_CONFIG: Record<string, { color: string; hex: string; icon: LucideIcon }> = {
  adrenal: { color: "amber-400", hex: "#FBBF24", icon: Battery },
  mitochondrial: { color: "teal-400", hex: "#2DA5A0", icon: Zap },
  metabolic: { color: "orange-400", hex: "#F97316", icon: Flame },
  neuro: { color: "purple-400", hex: "#A855F7", icon: BrainCircuit },
  immune: { color: "blue-400", hex: "#60A5FA", icon: Shield },
  hormonal: { color: "pink-400", hex: "#EC4899", icon: Activity },
  gut: { color: "green-400", hex: "#22C55E", icon: Flame },
  longevity: { color: "cyan-400", hex: "#22D3EE", icon: Clock },
};

interface PeptideProductCardProps {
  recommendation: PeptideRecommendation;
}

export function PeptideProductCard({ recommendation }: PeptideProductCardProps) {
  const [expanded, setExpanded] = useState(false);
  const accent = ACCENT_CONFIG[recommendation.patternCategory] || ACCENT_CONFIG.adrenal;
  const AccentIcon = accent.icon;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-300 border hover:shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${accent.hex}0D, transparent)`,
        borderColor: `${accent.hex}26`,
      }}
    >
      <div className="p-5">
        {/* Pattern badge */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold border"
            style={{ backgroundColor: `${accent.hex}1A`, color: `${accent.hex}B3`, borderColor: `${accent.hex}26` }}
          >
            {recommendation.patternName}
          </span>
          <AccentIcon className="w-4 h-4" style={{ color: `${accent.hex}66` }} strokeWidth={1.5} />
        </div>

        {/* Product names */}
        <h4 className="text-base font-bold text-white mb-1">
          {recommendation.products.map((p) => p.name).join(" + ")}
        </h4>
        <p className="text-[10px] text-white/25 mb-3">
          {recommendation.products.map((p) => p.category).join(" + ")} Support
        </p>

        {/* Personalized reason */}
        <p className="text-xs text-white/40 leading-relaxed mb-4">
          {recommendation.personalizedReason}
        </p>

        {/* Analogy */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-white/[0.03]">
          <AccentIcon className="w-4 h-4 flex-shrink-0" style={{ color: `${accent.hex}80` }} strokeWidth={1.5} />
          <p className="text-[11px] text-white/30 italic">{recommendation.analogy}</p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between min-h-[36px] text-xs text-white/25 hover:text-white/40 transition-colors"
        >
          <span>{expanded ? "Hide details" : "View dosing & evidence"}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={1.5} />
        </button>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 border-t border-white/5 space-y-3">
              {/* Dosing */}
              <div>
                <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Suggested Protocol</p>
                <p className="text-xs text-white/40">{recommendation.dosingProtocol}</p>
                <p className="text-[10px] text-white/20 mt-1">{recommendation.cycleDuration}</p>
              </div>

              {/* Evidence */}
              <div>
                <p className="text-[10px] text-white/20 uppercase tracking-wider mb-1">Evidence</p>
                <p className="text-xs text-white/30">{recommendation.evidenceSummary}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                    recommendation.evidenceLevel === "strong" ? "bg-teal-400/10 text-teal-400/60" :
                    recommendation.evidenceLevel === "moderate" ? "bg-amber-400/10 text-amber-400/60" :
                    "bg-orange-400/10 text-orange-400/60"
                  }`}>{recommendation.evidenceLevel}</span>
                  {recommendation.authorities?.map((auth) => (
                    <span key={auth} className="text-[9px] px-2 py-0.5 rounded bg-white/[0.04] text-white/20">{auth}</span>
                  ))}
                </div>
              </div>

              {/* Helix synergy */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <Hexagon className="w-3 h-3 text-amber-400/40" strokeWidth={1.5} />
                <p className="text-[10px] text-amber-400/40">
                  Log adherence \u2192 earn +{recommendation.helixPerDay} Helix/day
                </p>
              </div>

              {/* GENEX360 synergy */}
              {recommendation.genexSynergy && (
                <div className="flex items-center gap-2">
                  <Dna className="w-3 h-3 text-teal-400/40" strokeWidth={1.5} />
                  <p className="text-[10px] text-teal-400/40">{recommendation.genexSynergy}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retatrutide reference (metabolic only) */}
      {recommendation.includesRetatrutideRef && (
        <div className="mx-5 mb-4 rounded-lg bg-orange-400/5 border border-orange-400/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400/60 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-xs text-orange-400/70 font-medium mb-1">Advanced Metabolic Support Discussion</p>
              <p className="text-[11px] text-white/30 leading-relaxed">
                For advanced metabolic support, discuss Retatrutide (triple agonist) with
                your practitioner \, it is currently investigational and only available via
                clinical trials. Your Ultrathink profile shows strong alignment with its
                researched pathways.
              </p>
              <a href="/supplements#practitioner" className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-orange-400/60 font-medium hover:text-orange-400/80 transition-colors min-h-[36px]">
                <UserSearch className="w-3 h-3" strokeWidth={1.5} />
                Find a Practitioner for Retatrutide Discussion
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <div className="px-5 pb-5">
        <a
          href="/supplements#practitioner"
          className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-xs font-medium transition-all"
          style={{
            backgroundColor: `${accent.hex}1A`,
            borderWidth: 1,
            borderColor: `${accent.hex}40`,
            color: accent.hex,
          }}
        >
          <Stethoscope className="w-3.5 h-3.5" strokeWidth={1.5} />
          Get Prescribed \u2192 Connect with a Practitioner
        </a>
      </div>
    </div>
  );
}
