"use client";

import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { PeptideDisclaimerBanner } from "@/components/peptide-protocol/PeptideDisclaimerBanner";
import { PeptideSearchBar } from "@/components/peptide-protocol/PeptideSearchBar";
import { PersonalizedPeptideStack } from "@/components/peptide-protocol/PersonalizedPeptideStack";
import { PeptideCatalogSection } from "@/components/peptide-protocol/PeptideCatalogSection";
import { PeptidePractitionerAccess } from "@/components/peptide-protocol/PeptidePractitionerAccess";
import { ShareProtocolButton } from "@/components/consumer/ShareProtocolButton";

const PEPTIDE_HERO_DESKTOP =
  "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Fit%20couple%202.png";
const PEPTIDE_HERO_MOBILE =
  "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Mobile%20Hero/Athlete%2011%20mobile.png";

export default function PeptideProtocolRoute() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const heroSrc = isMobile ? PEPTIDE_HERO_MOBILE : PEPTIDE_HERO_DESKTOP;

  return (
    <>
      {/* HERO — fixed behind everything, inline styles to guarantee rendering */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden"
        style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
      >
        <img
          src={heroSrc}
          alt="Peptide Protocol background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            filter: 'blur(2px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.40)',
          }}
        />
      </div>

      {/* CONTENT — scrolls over hero */}
      <div className="relative z-10 text-white">
        {/* Mobile only: 80px hero peek above the content panel.
            Desktop: content flush below the nav bar (Prompt #81). */}
        <div className="h-[80px] md:hidden" />

        {/* Deep Navy content starts below the hero visible area */}
        <div className="min-h-screen rounded-t-3xl bg-[#0D1520] px-4 py-8 md:px-8">
          <div className="mx-auto max-w-3xl space-y-5">

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
    </>
  );
}
