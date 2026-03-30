"use client";

import { DISCLAIMERS } from "@/config/regulatory/disclaimers";
import { AlertTriangle, Stethoscope, Search } from "lucide-react";

interface PeptideDisclaimerProps {
  variant?: "standard" | "wellness" | "practitioner" | "international";
  showCtaButtons?: boolean;
  className?: string;
}

export default function PeptideDisclaimer({ variant = "standard", showCtaButtons = false, className = "" }: PeptideDisclaimerProps) {
  const disclaimerMap = {
    standard: DISCLAIMERS.standardFDA,
    wellness: DISCLAIMERS.wellnessPositioning,
    practitioner: DISCLAIMERS.consultPractitioner,
    international: DISCLAIMERS.internationalResearch,
  };

  const disclaimer = disclaimerMap[variant];

  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-[#B75E18]/70 mt-0.5" strokeWidth={1.5} />
        <p className="text-xs text-white/50 leading-relaxed">{disclaimer.text}</p>
      </div>

      {variant === "practitioner" && showCtaButtons && (
        <div className="mt-3 flex flex-wrap gap-2 ml-7">
          <button className="flex items-center gap-1.5 rounded-lg border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-3 py-1.5 text-xs text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/20">
            <Stethoscope className="h-3.5 w-3.5" strokeWidth={1.5} />
            Find a Physician
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-[#B75E18]/30 bg-[#B75E18]/10 px-3 py-1.5 text-xs text-[#B75E18] transition-colors hover:bg-[#B75E18]/20">
            <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
            Find a Naturopath
          </button>
        </div>
      )}
    </div>
  );
}
