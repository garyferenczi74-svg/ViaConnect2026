"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, GraduationCap, ChevronDown, Award } from "lucide-react";
import type { ExpertAuthority } from "@/config/expert-authorities";
import { DOMAIN_CONFIG } from "@/config/expert-authorities";

export function ExpertAuthorityBadge({ experts }: { experts: ExpertAuthority[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!experts?.length) return null;

  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-[10px] text-white/25 hover:text-white/40 transition-colors w-full min-h-[36px]">
        <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span className="font-medium">Supported by {experts.length} leading authorit{experts.length !== 1 ? "ies" : "y"}</span>
        <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="space-y-2.5 pt-2.5">
              {experts.map((expert) => (
                <div key={expert.id} className="rounded-lg bg-white/[0.02] border border-white/5 p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg, rgba(45,165,160,0.15), transparent)", border: "1px solid rgba(45,165,160,0.1)" }}>
                      <GraduationCap className="w-3.5 h-3.5 text-teal-400/70" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/60">{expert.name}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">{expert.specialty} · {expert.country}</p>
                      {expert.notableWork && <p className="text-[10px] text-white/20 mt-1 italic leading-relaxed">{expert.notableWork}</p>}
                    </div>
                    {(() => { const dc = DOMAIN_CONFIG[expert.domain]; const c = dc?.color || "white"; return (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wider font-semibold" style={{ backgroundColor: `color-mix(in srgb, ${c === "teal-400" ? "#2DA5A0" : c === "purple-400" ? "#A855F7" : c === "blue-400" ? "#60A5FA" : c === "red-400" ? "#F87171" : c === "amber-400" ? "#FBBF24" : c === "emerald-400" ? "#34D399" : c === "green-400" ? "#4ADE80" : "#B75E18"} 15%, transparent)`, color: `color-mix(in srgb, ${c === "teal-400" ? "#2DA5A0" : c === "purple-400" ? "#A855F7" : c === "blue-400" ? "#60A5FA" : c === "red-400" ? "#F87171" : c === "amber-400" ? "#FBBF24" : c === "emerald-400" ? "#34D399" : c === "green-400" ? "#4ADE80" : "#B75E18"} 60%, transparent)` }}>
                        {dc?.shortLabel || expert.domain}
                      </span>
                    ); })()}
                  </div>
                </div>
              ))}
              <p className="text-[9px] text-white/15 leading-relaxed pt-1">These authorities define the standards through peer-reviewed research, ISNN/IPS/APS leadership, and clinical tools. Evidence levels vary by gene-nutrient pair.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExpertCredibilityFooter({ domain = "all" }: { domain?: "all" | "genomics" | "peptide" }) {
  return (
    <div className="rounded-xl bg-white/[0.015] border border-white/5 p-4 md:p-5 mt-6">
      <div className="flex items-start gap-3">
        <Award className="w-5 h-5 text-teal-400/30 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="text-xs text-white/30 font-medium mb-1">Evidence-Based Recommendations</p>
          <p className="text-[10px] text-white/15 leading-relaxed">
            FarmCeutica Wellness recommendations are informed by research from leaders at IFM, ABC, CMCR, ISCM, NAMA, ISNN, IPS, and APS — representing the global gold standard across genomics, functional medicine, herbal science, Eastern medicine, cannabinoid research, peptide therapy, and micronutrient science. Evidence levels vary by domain. Always consult a qualified practitioner.
          </p>
        </div>
      </div>
    </div>
  );
}
