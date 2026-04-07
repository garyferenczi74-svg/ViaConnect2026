"use client";

// PeptideDisclaimer — three variants used across the Peptide Catalog.
//
// Hard rule: every page and every card in the catalog MUST surface a
// disclaimer making clear that FarmCeutica does not sell peptides at
// retail and that the data is educational only. The disclaimer cannot
// be dismissed or hidden anywhere in the catalog.

import { AlertTriangle, Info } from "lucide-react";

interface PeptideDisclaimerProps {
  variant: "full" | "compact" | "banner";
}

const FULL_DISCLAIMER_TITLE = "IMPORTANT NOTICE";

const FULL_DISCLAIMER_BODY = `FarmCeutica Wellness LLC provides peptide information, educational resources, and personalized recommendations based on your Clinical Assessment Questionnaire (CAQ) responses and GeneX360™ genetic test results. We do not sell, dispense, or distribute peptide products at retail.

The peptide data presented here is intended for educational purposes and to support informed conversations with your licensed healthcare practitioner, naturopath, or prescribing physician. Your personalized peptide profile and delivery form recommendations can be shared directly with your provider through the ViaConnect™ Practitioner Portal.

Always consult a qualified healthcare professional before beginning any peptide protocol.`;

const BANNER_TEXT =
  "Peptide information for educational purposes only — consult your licensed practitioner before use.";

const COMPACT_TEXT =
  "Informational only — not available for direct purchase. Share with your licensed practitioner.";

export function PeptideDisclaimer({ variant }: PeptideDisclaimerProps) {
  if (variant === "full") {
    return (
      <div className="bg-[#B75E18]/10 border border-[#B75E18]/30 rounded-2xl p-6 my-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle
              className="w-6 h-6 text-[#B75E18]"
              strokeWidth={1.5}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[#B75E18] font-bold text-sm uppercase tracking-wider mb-3">
              {FULL_DISCLAIMER_TITLE}
            </h3>
            <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
              {FULL_DISCLAIMER_BODY.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 mt-3 flex items-start gap-2">
        <Info
          className="w-3.5 h-3.5 text-[#B75E18] flex-shrink-0 mt-0.5"
          strokeWidth={1.5}
        />
        <p className="text-gray-400 text-xs leading-snug">{COMPACT_TEXT}</p>
      </div>
    );
  }

  // variant === "banner"
  return (
    <div className="sticky top-0 z-30 bg-[#B75E18]/15 border-b border-[#B75E18]/20 px-4 py-3 backdrop-blur-md">
      <p className="text-[#B75E18] text-sm font-medium text-center flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
        {BANNER_TEXT}
      </p>
    </div>
  );
}
