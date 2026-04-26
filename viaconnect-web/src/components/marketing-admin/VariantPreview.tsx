'use client';

// Prompt #138a Phase 5a: live preview of how a variant renders.
// We deliberately do NOT mount the full HeroSection here because that
// would re-render the navigation, video background, and stats slider on
// every keystroke — heavy and visually wrong inside an admin form. The
// preview reproduces the headline + subheadline + CTA shape using the
// same Tailwind classes so admins see typography and word-fit accurately.
// Visual non-disruption guarantee in spec section 3 still applies; this
// component is admin-only and never renders to visitors.

import { ChevronRight } from 'lucide-react';

export interface VariantPreviewProps {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaDestination: string;
}

export function VariantPreview({ headline, subheadline, ctaLabel, ctaDestination }: VariantPreviewProps) {
  return (
    <div className="rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#0d1225] to-[#141c35] p-6 sm:p-8">
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-4">Live preview</p>
      <h2 className="max-w-2xl text-balance text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-[1.1] min-h-[3rem]">
        {headline || (
          <span className="text-white/30 italic">Headline appears here</span>
        )}
      </h2>
      <p className="mt-4 max-w-2xl text-balance text-sm sm:text-base text-slate-300 leading-relaxed min-h-[2.5rem]">
        {subheadline || (
          <span className="text-white/30 italic">Subheadline appears here</span>
        )}
      </p>
      <div className="mt-6">
        <span className="inline-flex h-12 items-center justify-center rounded-full bg-[#b75e18] pl-5 pr-3 text-sm font-semibold text-white">
          <span>{ctaLabel || 'CTA label'}</span>
          <ChevronRight className="ml-1 h-4 w-4" strokeWidth={2} />
        </span>
        {ctaDestination && (
          <span className="ml-3 text-[11px] text-white/40 font-mono">
            {ctaDestination}
          </span>
        )}
      </div>
    </div>
  );
}
