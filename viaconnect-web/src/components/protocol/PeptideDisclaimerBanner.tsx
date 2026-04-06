"use client";

import { useState, useEffect } from "react";
import { ShieldAlert } from "lucide-react";

export function PeptideDisclaimerBanner() {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    const acked = sessionStorage.getItem("peptide_disclaimer_acked");
    if (acked) setAcknowledged(true);
  }, []);

  const handleAcknowledge = () => {
    sessionStorage.setItem("peptide_disclaimer_acked", "true");
    setAcknowledged(true);
  };

  return (
    <div className={`rounded-xl border p-4 md:p-5 ${
      acknowledged
        ? "bg-orange-400/[0.03] border-orange-400/10"
        : "bg-orange-400/10 border-orange-400/30"
    }`}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <div className="flex-1">
          <p className={`text-sm leading-relaxed ${
            acknowledged ? "text-white/40" : "text-orange-400"
          }`}>
            Peptides are for wellness optimization only and must be discussed with a
            licensed practitioner or naturopath. This is NOT a prescription. Consult your
            provider before use. These statements have not been evaluated by the FDA.
            All ViaConnect peptides are oral, high-bioavailability formulations designed
            for wellness support only.
          </p>
          {!acknowledged && (
            <button
              onClick={handleAcknowledge}
              className="mt-3 min-h-[44px] px-5 py-2.5 rounded-xl bg-orange-400/15 border border-orange-400/30 text-orange-400 text-sm font-medium hover:bg-orange-400/20 transition-all"
            >
              I Understand
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
