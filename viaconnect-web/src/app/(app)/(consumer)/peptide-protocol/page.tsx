"use client";

import { FlaskConical } from "lucide-react";
import { PeptideDisclaimerBanner } from "@/components/peptide-protocol/PeptideDisclaimerBanner";
import { PeptideSearchBar } from "@/components/peptide-protocol/PeptideSearchBar";
import { PersonalizedPeptideStack } from "@/components/peptide-protocol/PersonalizedPeptideStack";
import { PeptidePractitionerAccess } from "@/components/peptide-protocol/PeptidePractitionerAccess";

export default function PeptideProtocolRoute() {
  return (
    <div className="min-h-screen bg-[#1A2744]">
      <div className="max-w-3xl mx-auto px-4 py-6 md:px-6 space-y-5">

        {/* Page header */}
        <div className="flex items-center gap-3 pb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A2744] to-[#2DA5A0] border border-[rgba(255,255,255,0.12)] flex items-center justify-center">
            <FlaskConical className="w-[18px] h-[18px] text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Peptide Protocol</h1>
            <p className="text-xs text-[rgba(255,255,255,0.45)]">
              Personalized peptide stack · Powered by Ultrathink™
            </p>
          </div>
        </div>

        <PeptideDisclaimerBanner />
        <PeptideSearchBar />
        <PersonalizedPeptideStack />
        <PeptidePractitionerAccess />

      </div>
    </div>
  );
}
