'use client';

// BOSCardEmptyState: pre-compute treatment for the BOS card.
//
// Rendered when /api/bos/current returns score = null (user has not
// completed the CAQ). The empty state preserves the populated card's
// container styling (gradient + glow) so the user sees the shape of
// what unlocks, with these differences:
//   - Headline reads "Start with your CAQ to unlock your score"
//     (replaces the side panel's "Your score is..." headline)
//   - Gauge renders in placeholder mode (no fill ring, "--" centered)
//   - Side panel is omitted (info chips and 5-dot indicator have
//     nothing to surface pre-CAQ)
//   - CAQ CTA sits between the gauge and the static explanation
//   - Engagement row renders preCompute (disabled but visible)

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { BOSCurrentResponse } from '@/lib/scoring/types';
import { BOSScoreGauge } from './bos-score-gauge';
import { BOSStaticExplanation } from './bos-static-explanation';
import { BOSAccuracyRow } from './bos-accuracy-row';
import { BOSEngagementRow } from './bos-engagement-row';

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
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#2DA5A0] opacity-15 blur-3xl"
      />

      <div className="relative flex flex-col gap-5 sm:gap-6">
        {/* Header */}
        <header className="text-center md:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Bio Optimization Score
          </p>
          <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
            Start with your CAQ to unlock your score
          </h2>
        </header>

        {/* Gauge (placeholder) */}
        <BOSScoreGauge data={data} />

        {/* CAQ CTA */}
        <Link
          href="/onboarding/i-caq-intro"
          className="inline-flex min-h-[44px] w-fit items-center gap-2 self-center rounded-full border border-[#2DA5A0] bg-[#2DA5A0]/15 px-5 py-2.5 text-sm font-semibold text-[#2DA5A0] transition-all duration-200 hover:translate-y-[-1px] hover:bg-[#2DA5A0]/25 hover:shadow-[0_4px_16px_-4px_rgba(45,165,160,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          Start your CAQ
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </Link>

        {/* Static teaching paragraph */}
        <BOSStaticExplanation />

        {/* Accuracy row (CAQ shows incomplete; tap to start) */}
        <BOSAccuracyRow pills={data.accuracy_pills} />

        {/* Engagement row (preCompute disabled until CAQ exists) */}
        <BOSEngagementRow pills={data.engagement_pills} preCompute />
      </div>
    </section>
  );
}
