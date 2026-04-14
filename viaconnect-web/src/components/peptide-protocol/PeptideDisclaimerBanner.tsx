'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

export function PeptideDisclaimerBanner() {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const acked = sessionStorage.getItem('peptide_disclaimer_acked');
    if (acked) setExpanded(false);
  }, []);

  const handleAcknowledge = () => {
    sessionStorage.setItem('peptide_disclaimer_acked', 'true');
    setExpanded(false);
  };

  return (
    <div className={`rounded-2xl border backdrop-blur-md transition-all duration-300 ${
      expanded
        ? 'bg-[rgba(20,30,45,0.80)] border-[rgba(183,94,24,0.35)]'
        : 'bg-[rgba(20,30,45,0.70)] border-[rgba(183,94,24,0.25)]'
    }`}>
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#FB923C] shrink-0" strokeWidth={1.5} />
            <span className="text-xs text-[rgba(251,146,60,0.70)] font-medium">
              Peptide Wellness Disclaimer. For educational purposes only. Not a prescription.
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-[rgba(251,146,60,0.50)] shrink-0" strokeWidth={1.5} />
        </button>
      )}

      {expanded && (
        <div className="p-4 md:p-5 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#FB923C] shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-[#FB923C]">
                Important: Peptide Wellness Disclaimer
              </p>
              <p className="text-sm text-[rgba(251,146,60,0.85)] leading-relaxed">
                The peptide protocols on this page are generated for <strong>wellness optimization purposes only</strong> and are <strong>not a prescription, diagnosis, or medical treatment</strong>. All peptide recommendations must be reviewed and approved by a licensed healthcare practitioner or naturopath before use.
              </p>
              <ul className="text-sm text-[rgba(251,146,60,0.85)] leading-relaxed space-y-1 list-none">
                <li>· These statements have not been evaluated by the FDA.</li>
                <li>· Tier 2 and Tier 3 peptides require practitioner supervision. Look for the supervision badge.</li>
                <li>· Retatrutide is an investigational compound available through clinical pathways only.</li>
                <li>· Do not use peptides if pregnant, nursing, or if you have an active medical condition without physician approval.</li>
              </ul>
              <button
                onClick={handleAcknowledge}
                className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl
                  bg-[#B75E18] text-white text-xs font-semibold
                  hover:bg-[#9A4F14] transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                I understand. Collapse disclaimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
