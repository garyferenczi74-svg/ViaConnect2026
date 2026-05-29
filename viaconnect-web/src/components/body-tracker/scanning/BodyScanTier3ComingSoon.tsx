'use client';

// BodyScanTier3ComingSoon.tsx  (Prompt #169a, spec section 3.2)
//
// Honest Tier 3 placeholder. Tier 3 (GeneX360-informed, Bayesian-refined body
// scanning) is not shippable yet, so this surface is present but explicitly
// scoped: it states the real dependencies and timeline rather than implying the
// feature already exists. No overpromise.
//
// Tier metadata semantics come from scan-tier.ts (Tier 3 => Dna icon). DnaIcon
// at strokeWidth 1.5 per standing rules; copy uses commas/colons only.

import { Dna } from 'lucide-react';

interface BodyScanTier3ComingSoonProps {
  className?: string;
}

// Honest message: both gates that Tier 3 waits on (genomics data arriving, and
// the Bayesian engine shipping) are stated plainly.
const TIER3_MESSAGE =
  'Tier 3 unlocks when your GENEX360 results arrive plus the Bayesian engine ships in Q4 2026';

export function BodyScanTier3ComingSoon({ className = '' }: BodyScanTier3ComingSoonProps) {
  return (
    <div
      data-testid="body-scan-tier3-coming-soon"
      className={`rounded-2xl border border-[#A78BFA]/25 bg-[#A78BFA]/5 p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#A78BFA]/15 flex-none">
          <Dna className="h-5 w-5 text-[#A78BFA]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-white">Tier 3 body scanning</p>
            <span className="rounded-full bg-[#A78BFA]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#A78BFA]">
              Coming soon
            </span>
          </div>
          <p className="text-sm text-white/70 mt-1.5 leading-relaxed">{TIER3_MESSAGE}.</p>
        </div>
      </div>
    </div>
  );
}
