'use client';

// BOSCardEmptyState: pre-compute treatment for the BOS card.
//
// Rendered when /api/bos/current returns score = null (user has not
// completed the CAQ). The three accuracy pills remain visible and
// active so the consumer can start the CAQ; the six engagement pills
// render below as visible-but-disabled.
//
// The CAQ CTA is the only primary action; the spec calls for a "CAQ
// first" framing per #162 §6.8.

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { BOSCurrentResponse } from '@/lib/scoring/types';
import { BOSAccuracyPills } from './bos-accuracy-pills';
import { BOSEngagementPills } from './bos-engagement-pills';

export interface BOSCardEmptyStateProps {
  data: BOSCurrentResponse;
}

export function BOSCardEmptyState({ data }: BOSCardEmptyStateProps) {
  return (
    <section
      aria-label="Bio Optimization Score"
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 via-[#1A2744]/60 to-[#141E33]/60 backdrop-blur-md p-5 sm:p-6 md:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#2DA5A0] opacity-10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Bio Optimization Score
          </p>
          <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
            Start with your CAQ to unlock your score
          </h2>
          <p className="mt-2 text-sm text-white/70">
            {data.hannah_explanation}
          </p>
        </header>

        <Link
          href="/onboarding/i-caq-intro"
          className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border border-[#2DA5A0] bg-[#2DA5A0]/15 px-5 py-2.5 text-sm font-semibold text-[#2DA5A0] transition-all duration-200 hover:bg-[#2DA5A0]/25 hover:translate-y-[-1px] hover:shadow-[0_4px_16px_-4px_rgba(45,165,160,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          Start your CAQ
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </Link>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Accuracy
            </p>
            <BOSAccuracyPills pills={data.accuracy_pills} />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Engagement
            </p>
            <BOSEngagementPills pills={data.engagement_pills} preCompute />
          </div>
        </div>
      </div>
    </section>
  );
}
