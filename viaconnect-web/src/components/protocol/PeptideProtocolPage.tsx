"use client";

import { FlaskConical, ClipboardList, ArrowRight, RefreshCw } from "lucide-react";
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

interface PeptideProtocolPageProps {
  masterPatterns: MasterPattern[];
  helixBalance: number;
  caqCompleted: boolean;
}

function generatePeptideSummary(recs: PeptideRecommendation[]): string {
  if (recs.length === 0) return "No peptide protocol recommended at this time.";
  const names = recs.flatMap((r) => r.products.map((p) => p.name));
  return `Your personalized peptide protocol includes ${names.join(", ")}. These are matched to your Ultrathink master patterns for targeted wellness optimization. All products use dual liposomal-micellar delivery for enhanced bioavailability. Please consult your practitioner before starting.`;
}

function PeptideNotReadyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-purple-400/10 border border-purple-400/15 flex items-center justify-center mx-auto mb-6">
        <FlaskConical className="w-8 h-8 text-purple-400/40" strokeWidth={1} />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Your Peptide Protocol Awaits</h2>
      <p className="text-sm text-white/40 max-w-md mx-auto leading-relaxed mb-6">
        Complete your Clinical Assessment Questionnaire first. Ultrathink will analyze your symptoms, goals, and patterns to recommend personalized peptides from the FarmCeutica\u2122 portfolio.
      </p>
      <a href="/onboarding/i-caq-intro" className="inline-flex items-center gap-2 min-h-[48px] px-6 py-3 rounded-xl bg-teal-400/15 border border-teal-400/30 text-teal-400 text-sm font-semibold hover:bg-teal-400/20 transition-all">
        <ClipboardList className="w-4 h-4" strokeWidth={1.5} />
        Start Your Assessment
      </a>
    </div>
  );
}

function PeptideEmptyState() {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-8 text-center">
      <FlaskConical className="w-10 h-10 text-white/10 mx-auto mb-4" strokeWidth={1} />
      <h3 className="text-base font-semibold text-white mb-2">No Peptide Protocol Recommended Yet</h3>
      <p className="text-sm text-white/30 max-w-md mx-auto leading-relaxed">
        Based on your current master patterns, your nutraceutical supplement stack is already well-optimized. Peptide recommendations will appear here if your patterns change on re-assessment or if you upload genetic data that reveals peptide synergies.
      </p>
    </div>
  );
}

export default function PeptideProtocolPage({ masterPatterns, helixBalance, caqCompleted }: PeptideProtocolPageProps) {
  if (!caqCompleted) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <PeptideNotReadyState />
      </div>
    );
  }

  const recommendations = matchPeptidesToPatterns(masterPatterns);
  const hasPeptideRecs = recommendations.length > 0;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 md:px-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Peptide Protocol</h1>
        <p className="text-sm text-white/40 mt-1">Personalized FarmCeutica\u2122 oral peptides \, Powered by Ultrathink\u2122</p>
      </div>

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
                <h2 className="text-lg font-bold text-white">Your Personalized Peptide Stack</h2>
                <p className="text-sm text-white/40 mt-0.5">
                  {hasPeptideRecs
                    ? `Based on your CAQ patterns: ${masterPatterns.map((p) => p.name.toLowerCase()).join(", ")}`
                    : "Complete your assessment to unlock personalized recommendations"}
                </p>
              </div>
            </div>
            {hasPeptideRecs && <ListenToSummary summaryText={generatePeptideSummary(recommendations)} />}
          </div>
        </div>
      </div>

      {/* Helix balance */}
      {hasPeptideRecs && <HelixPeptideCard helixBalance={helixBalance} />}

      {/* Cards or empty state */}
      {hasPeptideRecs ? (
        <PeptideStackGrid recommendations={recommendations} />
      ) : (
        <PeptideEmptyState />
      )}

      {/* Timeline */}
      {hasPeptideRecs && <PeptideTimeline recommendations={recommendations} />}

      {/* Practitioner access */}
      <PeptidePractitionerAccess />

      {/* FAQ */}
      <PeptideFAQSection />

      {/* Retake assessment */}
      <div className="rounded-xl bg-white/[0.02] border border-white/8 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-white">Update Your Assessment</h4>
            <p className="text-xs text-white/30 mt-1 max-w-md">Retake the Clinical Assessment Questionnaire to update your peptide protocol with your current health status.</p>
          </div>
          <a href="/onboarding/i-caq-intro" className="min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-400/10 border border-orange-400/30 text-orange-400 text-sm font-medium hover:bg-orange-400/15 transition-all flex items-center gap-2 flex-shrink-0">
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            Retake Assessment
          </a>
        </div>
      </div>
    </div>
  );
}
