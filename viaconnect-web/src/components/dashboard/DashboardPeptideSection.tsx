"use client";

import { FlaskConical, ShieldAlert, ArrowRight, Hexagon, Stethoscope, Leaf } from "lucide-react";
import { DashboardPeptideCard } from "./DashboardPeptideCard";
import { matchPeptidesToPatterns } from "@/lib/ai/peptide-matching";
import type { PeptideRecommendation } from "@/lib/ai/peptide-matching";

interface MasterPattern {
  name: string;
  symptomsInvolved?: string[];
}

interface DashboardPeptideSectionProps {
  masterPatterns: MasterPattern[];
  helixBalance: number;
  caqCompleted: boolean;
}

export function DashboardPeptideSection({ masterPatterns, helixBalance, caqCompleted }: DashboardPeptideSectionProps) {
  if (!caqCompleted) return null;

  const recommendations = matchPeptidesToPatterns(masterPatterns);
  const hasPeptideRecs = recommendations.length > 0;

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#A855F71A", border: "1px solid #A855F726" }}>
            <FlaskConical className="w-4 h-4 text-purple-400/70" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Peptide Protocol</h2>
            <p className="text-[11px] text-white/30 mt-0.5">Powered by Ultrathink\u2122</p>
          </div>
        </div>
        {hasPeptideRecs && (
          <a href="/supplements#peptides" className="min-h-[36px] flex items-center gap-1 text-xs text-purple-400/60 font-medium hover:text-purple-400/80 transition-colors">
            Full Protocol
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          </a>
        )}
      </div>

      {/* Main content card */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/8 overflow-hidden">
        {/* Compact disclaimer */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-orange-400/[0.04] border border-orange-400/10">
            <ShieldAlert className="w-3.5 h-3.5 text-orange-400/50 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-[10px] text-orange-400/40 leading-relaxed">
              Peptides are for wellness support only. Must be prescribed by a licensed practitioner or naturopath. Not a prescription. Retatrutide is investigational and available only via clinical trials.
            </p>
          </div>
        </div>

        {/* CAQ pattern note */}
        {hasPeptideRecs && (
          <div className="px-5 pt-2">
            <p className="text-xs text-white/25 leading-relaxed">
              Based on your CAQ patterns: {masterPatterns.map((p) => p.name.toLowerCase()).join(", ")}.
            </p>
          </div>
        )}

        {/* Cards or empty state */}
        {hasPeptideRecs ? (
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recommendations.slice(0, 4).map((rec) => (
                <DashboardPeptideCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <FlaskConical className="w-8 h-8 text-white/10 mx-auto mb-3" strokeWidth={1} />
            <p className="text-sm text-white/30 font-medium mb-1">No peptide protocol recommended yet</p>
            <p className="text-xs text-white/20 max-w-sm mx-auto leading-relaxed">
              Based on your current master patterns, your nutraceutical stack is already optimized. Peptide recommendations will appear here if your patterns change on re-assessment.
            </p>
            <a href="/onboarding/i-caq-intro" className="mt-4 inline-flex items-center gap-1.5 text-xs text-teal-400/50 font-medium hover:text-teal-400/70 transition-colors min-h-[36px]">
              Retake Assessment
              <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
            </a>
          </div>
        )}

        {/* Helix tie-in */}
        {hasPeptideRecs && (
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400/5 border border-amber-400/10">
              <Hexagon className="w-3.5 h-3.5 text-amber-400/50" strokeWidth={1.5} />
              <p className="text-[10px] text-amber-400/50">
                Log prescribed doses \u2192 earn +25 Helix/day \u00B7 Balance: {helixBalance.toLocaleString()} Helix
              </p>
            </div>
          </div>
        )}

        {/* Practitioner footer */}
        <div className="px-5 py-4 border-t border-white/5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <a href="/supplements#practitioner" className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-orange-400/10 border border-orange-400/25 text-orange-400 text-xs font-semibold hover:bg-orange-400/15 transition-all">
              <Stethoscope className="w-3.5 h-3.5" strokeWidth={1.5} />
              Connect to Practitioner
            </a>
            <a href="/supplements#practitioner" className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-teal-400/10 border border-teal-400/25 text-teal-400 text-xs font-semibold hover:bg-teal-400/15 transition-all">
              <Leaf className="w-3.5 h-3.5" strokeWidth={1.5} />
              Connect to Naturopath
            </a>
          </div>
          <p className="text-[9px] text-white/12 text-center mt-2.5">
            Your Ultrathink summary + CAQ highlights will be pre-filled for your provider.
          </p>
        </div>
      </div>
    </section>
  );
}
