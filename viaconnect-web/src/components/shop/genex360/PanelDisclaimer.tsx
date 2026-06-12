// Prompt 193 Task T2 (2026-06-12): the standing wellness and education
// disclaimer rendered near the bottom of every GENEX360 panel description card
// on /shop/genex360.
//
// Presentational and server safe (no hooks, no 'use client'). The base copy is
// transcribed verbatim from the prompt. Two panels append a verbatim extra
// sentence: peptide-iq (educational, practitioner guided, no peptides for sale)
// and cannabis-iq (informational only, legal status varies by region).
//
// Standing rules honored: tokens only (Card surface #1E3054, white opacity
// neutrals), Lucide strokeWidth 1.5, Instrument Sans inherited, no emojis, no
// em or en dashes, TypeScript strict (no any).

import { ShieldCheck } from "lucide-react";
import type { PanelSlug } from "@/data/genex360/types";

interface PanelDisclaimerProps {
  slug: PanelSlug;
}

// Base copy shown for every panel. Verbatim, no em or en dashes.
const BASE_DISCLAIMER =
  "GENEX360 panels, including this one, are intended for wellness, education, and personal insight. They are not a diagnosis, treatment, or cure for any condition, and they do not replace advice from a qualified healthcare professional. Genetic and biomarker results describe tendencies and probabilities, not certainties. Always consult a licensed practitioner before making changes to your health, medication, or supplement routine.";

// Appended only for PeptideIQ. Verbatim.
const PEPTIDE_IQ_DISCLAIMER =
  "PeptideIQ is educational and intended for practitioner guided interpretation. Via Cura does not sell peptides as commercial products.";

// Appended only for CannabisIQ. Verbatim.
const CANNABIS_IQ_DISCLAIMER =
  "CannabisIQ is informational only and is not medical advice or a recommendation to use any substance. Legal status varies by region, and choices are your own.";

function disclaimerCopy(slug: PanelSlug): string {
  if (slug === "peptide-iq") {
    return `${BASE_DISCLAIMER} ${PEPTIDE_IQ_DISCLAIMER}`;
  }
  if (slug === "cannabis-iq") {
    return `${BASE_DISCLAIMER} ${CANNABIS_IQ_DISCLAIMER}`;
  }
  return BASE_DISCLAIMER;
}

export function PanelDisclaimer({ slug }: PanelDisclaimerProps) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-[#1E3054]/60 p-4 text-[12px] leading-relaxed text-white/55">
      <ShieldCheck
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-white/40"
        strokeWidth={1.5}
      />
      <p>{disclaimerCopy(slug)}</p>
    </div>
  );
}

export default PanelDisclaimer;
