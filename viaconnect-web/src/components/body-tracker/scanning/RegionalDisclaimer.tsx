'use client';

// RegionalDisclaimer  the required honesty disclaimer for the Phase 1 regional
// composition overlay (ViaConnect Prompt #169e(a), Section 4.3). Renders the
// LOCKED primary disclaimer copy verbatim, plus a "Learn more" expander with the
// expanded explanation. Secondary text style, placed below / adjacent to the
// avatar. No dashes, no emojis, ASCII only.

import { useState } from 'react';
import { Info, ChevronDown } from 'lucide-react';

// The LOCKED primary disclaimer copy (Section 4.3). Verbatim; do not edit.
export const REGIONAL_DISCLAIMER_PRIMARY =
  'Regional distribution shown is an estimate from peer-reviewed sex-banded patterns, not a direct measurement. Direct per-segment composition comes with FormaVision Pro in a future release.';

// The "Learn more" expanded explanation: the LOCKED verbatim Section 4.3
// expanded copy. Verbatim; do not edit. ASCII hyphens inside compound words
// (whole-body, sex-typical, peer-reviewed, per-segment, depth-enhanced) are
// allowed; no em-dash / en-dash.
export const REGIONAL_DISCLAIMER_EXPANDED =
  'FormaVision uses your whole-body composition along with sex-typical regional fat distribution patterns published in peer-reviewed research (Karastergiou et al. 2012, Borga et al. 2018, Schorr et al. 2018) to visualize how your body fat is likely distributed across regions. This is an estimate based on patterns observed in research populations, not a direct measurement of your body. Direct per-segment measurement requires depth-enhanced scanning combined with clinical validation, which is the focus of FormaVision Pro in a future release.';

interface RegionalDisclaimerProps {
  className?: string;
}

export function RegionalDisclaimer({ className = '' }: RegionalDisclaimerProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`text-[11px] leading-relaxed text-white/50 ${className}`}>
      <div className="flex items-start gap-1.5">
        <Info className="mt-[1px] h-3.5 w-3.5 flex-none text-white/40" strokeWidth={1.5} />
        <p>{REGIONAL_DISCLAIMER_PRIMARY}</p>
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="mt-1 ml-5 inline-flex items-center gap-1 text-[11px] font-medium text-[#2DA5A0]/80 hover:text-[#2DA5A0] min-h-[28px]"
      >
        Learn more
        <ChevronDown
          className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
        />
      </button>
      {expanded && (
        <p className="mt-1 ml-5 text-white/45">{REGIONAL_DISCLAIMER_EXPANDED}</p>
      )}
    </div>
  );
}
