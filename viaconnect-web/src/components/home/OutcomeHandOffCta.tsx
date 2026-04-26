// Prompt #138e §4.7: hand-off CTA. Lead sentence + primary CTA. Reuses
// the same primary-CTA visual treatment as the hero (#138a HeroSection).

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface OutcomeHandOffCtaProps {
  leadText: string;
  ctaLabel: string;
  ctaDestination: string;
}

export function OutcomeHandOffCta({ leadText, ctaLabel, ctaDestination }: OutcomeHandOffCtaProps) {
  return (
    <div className="text-center max-w-3xl mx-auto space-y-5">
      <p className="text-sm sm:text-base text-slate-300 leading-relaxed">{leadText}</p>
      <Link
        href={ctaDestination}
        className="inline-flex h-12 items-center justify-center rounded-full bg-[#b75e18] pl-6 pr-4 text-base font-semibold text-white shadow-[0_0_20px_rgba(183,94,24,0.4)] transition-all duration-300 hover:bg-[#d4741f] hover:shadow-[0_0_30px_rgba(183,94,24,0.6)] min-h-[44px]"
      >
        <span>{ctaLabel}</span>
        <ChevronRight className="ml-1" strokeWidth={2} />
      </Link>
    </div>
  );
}
