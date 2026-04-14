"use client";

import { FlaskConical } from "lucide-react";
import { PeptideDisclaimerBanner } from "@/components/peptide-protocol/PeptideDisclaimerBanner";
import { PeptideSearchBar } from "@/components/peptide-protocol/PeptideSearchBar";
import { PersonalizedPeptideStack } from "@/components/peptide-protocol/PersonalizedPeptideStack";
import { PeptideCatalogSection } from "@/components/peptide-protocol/PeptideCatalogSection";
import { PeptidePractitionerAccess } from "@/components/peptide-protocol/PeptidePractitionerAccess";
import { ShareProtocolButton } from "@/components/consumer/ShareProtocolButton";

const HERO_IMAGE =
  "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Peptide%202.png";

export default function PeptideProtocolRoute() {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-scroll text-white md:bg-fixed"
      style={{
        backgroundImage: `url('${HERO_IMAGE}')`,
        backgroundColor: '#0D1520',
      }}
    >
      {/* Gradient overlay: hero visible at top, fades to solid dark below */}
      <div className="min-h-screen bg-gradient-to-b from-[rgba(0,0,0,0.35)] via-[rgba(13,21,32,0.70)] to-[rgba(13,21,32,0.97)]">
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 space-y-5">

          {/* Page header */}
          <div className="flex items-center justify-between gap-3 pb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A2744] to-[#2DA5A0] border border-[rgba(255,255,255,0.12)] flex items-center justify-center shrink-0">
                <FlaskConical className="w-[18px] h-[18px] text-white" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-white truncate">Peptide Protocol</h1>
                <p className="text-xs text-[rgba(255,255,255,0.45)] truncate">
                  Personalized peptide stack · Powered by Ultrathink™
                </p>
              </div>
            </div>
            <ShareProtocolButton compact label="Share" className="shrink-0" />
          </div>

          <PeptideDisclaimerBanner />
          <PeptideSearchBar />
          <PersonalizedPeptideStack />
          <PeptideCatalogSection />
          <PeptidePractitionerAccess />

        </div>
      </div>
    </div>
  );
}
