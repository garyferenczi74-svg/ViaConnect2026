'use client';

// BOSCardClient: client island that owns the /api/bos/current
// react-query subscription and switches between skeleton, error,
// empty state, and the populated card.
//
// Composition order per #161e §2.1 (six vertical sections):
//   1. Header (eyebrow "Bio Optimization Score")
//   2. BOSScoreGauge        circular SVG gauge with band color +
//                           status label + decomposition line
//   3. BOSStaticExplanation  evergreen Hannah voice teaching paragraph
//   4. BOSExplanation        per compute Hannah voice ("From Hannah")
//   5. BOSAccuracyRow        header + descriptive sentence + 3 pills
//   6. BOSEngagementRow      header + descriptive sentence + 6 pills
//
// The Hannah panel (BOSExplanation) keeps its "From Hannah" label
// visual treatment so the static teaching block reads as evergreen
// and the dynamic block reads as Hannah's voice for this user, today.

import { useBOSCurrent } from '@/hooks/use-bos-current';
import { BOSCardSkeleton } from './bos-card-skeleton';
import { BOSCardError } from './bos-card-error';
import { BOSCardEmptyState } from './bos-card-empty-state';
import { BOSScoreGauge } from './bos-score-gauge';
import { BOSStaticExplanation } from './bos-static-explanation';
import { BOSExplanation } from './bos-explanation';
import { BOSAccuracyRow } from './bos-accuracy-row';
import { BOSEngagementRow } from './bos-engagement-row';

export function BOSCardClient() {
  const { data, error, isLoading, refetch } = useBOSCurrent();

  if (isLoading && !data) return <BOSCardSkeleton />;
  if (error && !data) {
    return <BOSCardError message={error.message} onRetry={() => refetch()} />;
  }
  if (!data) return <BOSCardSkeleton />;

  // Pre compute branch: user has not completed the CAQ. The empty
  // state renders the gauge in placeholder mode plus the CAQ CTA and
  // a preview of the pill rows so the user sees the shape of the
  // populated card.
  if (data.score === null) {
    return <BOSCardEmptyState data={data} />;
  }

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
        {/* 1. Header */}
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Bio Optimization Score
          </p>
        </header>

        {/* 2. Score gauge */}
        <BOSScoreGauge data={data} />

        {/* 3. Static teaching paragraph */}
        <BOSStaticExplanation />

        {/* 4. Hannah's per compute explanation */}
        <BOSExplanation text={data.hannah_explanation} />

        {/* 5. Accuracy row */}
        <BOSAccuracyRow pills={data.accuracy_pills} />

        {/* 6. Engagement row */}
        <BOSEngagementRow pills={data.engagement_pills} />
      </div>
    </section>
  );
}
