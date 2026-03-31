"use client";

import { FlaskConical, ArrowRight, RefreshCw } from "lucide-react";
import { ListenToSummary } from "@/components/analytics/ListenToSummary";
import { PeptideDisclaimerBanner } from "./PeptideDisclaimerBanner";
import { HelixPeptideCard } from "./HelixPeptideCard";
import { PeptideStackGrid } from "./PeptideStackGrid";
import { PeptideTimeline } from "./PeptideTimeline";
import { PeptidePractitionerAccess } from "./PeptidePractitionerAccess";
import { PeptideFAQSection } from "./PeptideFAQSection";
import { matchPeptidesToPatterns } from "@/lib/ai/peptide-matching";
import type { PeptideRecommendation } from "@/lib/ai/peptide-matching";

interface MasterPattern {
  name: string;
  symptomsInvolved?: string[];
}

interface PeptideProtocolTabProps {
  masterPatterns: MasterPattern[];
  helixBalance: number;
  caqCompleted: boolean;
}

function generatePeptideSummary(recs: PeptideRecommendation[]): string {
  if (recs.length === 0) return "No peptide protocol recommended at this time.";
  const names = recs.flatMap((r) => r.products.map((p) => p.name));
  return `Your personalized peptide protocol includes ${names.join(", ")}. These are matched to your Ultrathink master patterns for targeted wellness optimization. All products use dual liposomal-micellar delivery for enhanced bioavailability. Please consult your practitioner before starting.`;
}

function NoPeptideRecommendation() {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/8 p-6 md:p-8 text-center">
      <FlaskConical className="w-10 h-10 text-white/15 mx-auto mb-4" strokeWidth={1.5} />
      <p className="text-base text-white/40 mb-2">No Peptide Protocol Recommended</p>
      <p className="text-xs text-white/25 mb-6 max-w-md mx-auto">
        Your nutraceutical stack is already optimized for your current patterns.
        Retake the assessment if your symptoms have changed.
      </p>
      <a href="/onboarding/i-caq-intro" className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-400/10 border border-orange-400/30 text-orange-400 text-sm font-medium hover:bg-orange-400/15 transition-all">
        <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
        Retake Assessment
        <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
      </a>
    </div>
  );
}

export function PeptideProtocolTab({ masterPatterns, helixBalance, caqCompleted }: PeptideProtocolTabProps) {
  const recommendations = caqCompleted ? matchPeptidesToPatterns(masterPatterns) : [];
  const hasPeptideRecs = recommendations.length > 0;

  return (
    <div className="space-y-6">
      {/* Mandatory disclaimer */}
      <PeptideDisclaimerBanner />

      {/* Hero header */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-[#1A2744] to-teal-400/5" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute blur-xl -inset-1.5 rounded-2xl opacity-60" style={{ backgroundColor: "#A855F733" }} />
                <div className="relative w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #A855F733, #A855F71A, transparent)", border: "1px solid #A855F726" }}>
                  <FlaskConical className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white">Your Personalized Peptide Protocol</h2>
                <p className="text-sm text-white/40 mt-0.5">Powered by Ultrathink\u2122 \u2014 Based on your CAQ answers</p>
              </div>
            </div>
            {hasPeptideRecs && <ListenToSummary summaryText={generatePeptideSummary(recommendations)} />}
          </div>
        </div>
      </div>

      {/* Helix balance */}
      <HelixPeptideCard helixBalance={helixBalance} />

      {/* Peptide stack or empty state */}
      {hasPeptideRecs ? (
        <PeptideStackGrid recommendations={recommendations} />
      ) : (
        <NoPeptideRecommendation />
      )}

      {/* Protocol timeline */}
      {hasPeptideRecs && <PeptideTimeline recommendations={recommendations} />}

      {/* Safety & practitioner access */}
      <PeptidePractitionerAccess />

      {/* FAQ */}
      <PeptideFAQSection />
    </div>
  );
}
