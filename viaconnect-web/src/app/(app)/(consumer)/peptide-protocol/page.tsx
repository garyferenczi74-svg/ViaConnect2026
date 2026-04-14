"use client";

import { motion } from "framer-motion";
import { FlaskConical } from "lucide-react";
import { PeptideDisclaimerBanner } from "@/components/peptide-protocol/PeptideDisclaimerBanner";
import { PeptideSearchBar } from "@/components/peptide-protocol/PeptideSearchBar";
import { PersonalizedPeptideStack } from "@/components/peptide-protocol/PersonalizedPeptideStack";
import { PeptideCatalogSection } from "@/components/peptide-protocol/PeptideCatalogSection";
import { PeptidePractitionerAccess } from "@/components/peptide-protocol/PeptidePractitionerAccess";
import { ShareProtocolButton } from "@/components/consumer/ShareProtocolButton";

const PEPTIDE_HERO_IMAGE =
  "https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Hero%20Images/Peptides%201.png";

export default function PeptideProtocolRoute() {
  return (
    <motion.div
      className="min-h-screen bg-no-repeat text-white"
      style={{
        backgroundImage: `url('${PEPTIDE_HERO_IMAGE}')`,
        backgroundSize: 'contain',
        backgroundPosition: 'top center',
        backgroundColor: '#1A2744',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
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
    </motion.div>
  );
}
