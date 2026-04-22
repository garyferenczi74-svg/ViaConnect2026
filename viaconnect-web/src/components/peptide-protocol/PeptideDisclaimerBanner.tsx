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
    <div className={`rounded-2xl border border-[rgba(183,94,24,0.35)] bg-white/10 backdrop-blur-md transition-all duration-300`}>
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
            <ShieldAlert className="w-5 h-5 text-[#CE2029] shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-[#CE2029]">
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
                className="group/cta relative mt-1 inline-flex items-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(183,94,24,0.35)] active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #B75E18 0%, #1E3054 100%)' }}
              >
                <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover/cta:opacity-100" />
                <ChevronUp className="relative w-3.5 h-3.5" strokeWidth={2} />
                <span className="relative">I understand. Collapse disclaimer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
