'use client';

// BOSCardClient: client island that owns the /api/bos/current
// react-query subscription and switches between skeleton, error,
// empty state, and the populated card.
//
// Holds zero domain logic; every state branch delegates to a
// presentational sub-component. The hook itself enforces the 60s
// refetch interval; this component just consumes the result.

import { useBOSCurrent } from '@/hooks/use-bos-current';
import { BOSCardSkeleton } from './bos-card-skeleton';
import { BOSCardError } from './bos-card-error';
import { BOSCardEmptyState } from './bos-card-empty-state';
import { BOSScoreDisplay } from './bos-score-display';
import { BOSExplanation } from './bos-explanation';
import { BOSAccuracyPills } from './bos-accuracy-pills';
import { BOSEngagementPills } from './bos-engagement-pills';

export function BOSCardClient() {
  const { data, error, isLoading, refetch } = useBOSCurrent();

  if (isLoading && !data) return <BOSCardSkeleton />;
  if (error && !data) {
    return <BOSCardError message={error.message} onRetry={() => refetch()} />;
  }
  if (!data) return <BOSCardSkeleton />;

  // Pre-compute branch: user has not completed the CAQ.
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
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#2DA5A0] opacity-10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 md:grid md:grid-cols-[auto_1fr] md:items-start md:gap-8">
        <BOSScoreDisplay data={data} />
        <BOSExplanation text={data.hannah_explanation} />
      </div>

      <div className="relative mt-6 space-y-4">
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
          <BOSEngagementPills pills={data.engagement_pills} />
        </div>
      </div>
    </section>
  );
}
