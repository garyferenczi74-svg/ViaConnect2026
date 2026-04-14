"use client";

import { FlaskConical } from "lucide-react";
import { PeptideDisclaimerBanner } from "@/components/peptide-protocol/PeptideDisclaimerBanner";
import { PeptideSearchBar } from "@/components/peptide-protocol/PeptideSearchBar";
import { PersonalizedPeptideStack } from "@/components/peptide-protocol/PersonalizedPeptideStack";
import { PeptideCatalogSection } from "@/components/peptide-protocol/PeptideCatalogSection";
import { PeptidePractitionerAccess } from "@/components/peptide-protocol/PeptidePractitionerAccess";
import { ShareProtocolButton } from "@/components/consumer/ShareProtocolButton";

export default function PeptideProtocolRoute() {
  return (
    <>
      {/* ===== PEPTIDE PROTOCOL HERO BACKGROUND — START ===== */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden"
        style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
      >
        <img
          src="https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Athlete%201.png"
          alt="Peptide Protocol background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            filter: 'blur(2px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.40)',
          }}
        />
      </div>
      {/* ===== PEPTIDE PROTOCOL HERO BACKGROUND — END ===== */}

      {/* Page content scrolls over the fixed hero */}
      <div className="relative z-10 min-h-screen text-white">
        <div className="max-w-3xl mx-auto px-4 py-6 md:px-6 space-y-5">

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
    </>
  );
}
