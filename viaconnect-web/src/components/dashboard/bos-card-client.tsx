'use client';

// BOSCardClient: client island that owns the /api/bos/current
// react-query subscription and switches between skeleton, error,
// empty state, and the populated card.
//
// Patch pass (Phase A corrective) composition:
//   1. Two-column gauge section (md:grid-cols-[auto_1fr]):
//        a. Gauge column (auto width): BOSScoreGauge (legacy 240/14
//           geometry, 270 degree sweep, band-color fill, count-up
//           score number, tier label below)
//        b. Side panel column (flex-1): eyebrow + headline +
//           pill-less teaching paragraph + 3 info chips + 5-dot
//           data-completeness indicator
//      The redundant eyebrow inside the side panel REPLACES the
//      previous standalone card header so the user reads a single
//      headline ("Your score is Excellent") rather than two adjacent
//      "Bio Optimization Score" eyebrows. The teaching paragraph sits
//      inline under the headline so it aligns vertically with the
//      score story rather than living as a standalone pill below.
//   2. Accuracy row (header + descriptive sentence + 3 pills)
//   3. Engagement row (header + descriptive sentence + 6 gradient pills)
//
// Container glow: the absolutely-positioned blur circle in the top
// right tracks the score band color so the entire card reads in the
// tier's hue (legacy treatment).

import { useBOSCurrent } from '@/hooks/use-bos-current';
import { resolveHonestBosDisplay } from '@/lib/scoring/bos-display';
import { BOSCardSkeleton } from './bos-card-skeleton';
import { BOSCardError } from './bos-card-error';
import { BOSCardEmptyState } from './bos-card-empty-state';
import { BOSScoreGauge } from './bos-score-gauge';
import { BOSSidePanel } from './bos-side-panel';
import { BOSAccuracyRow } from './bos-accuracy-row';
import { BOSEngagementRow } from './bos-engagement-row';
import { colorForScore } from './bos-gauge-helpers';

export function BOSCardClient() {
  const { data, error, isLoading, refetch } = useBOSCurrent();

  if (isLoading && !data) return <BOSCardSkeleton />;
  if (error && !data) {
    return <BOSCardError message={error.message} onRetry={() => refetch()} />;
  }
  if (!data) return <BOSCardSkeleton />;

  const honest = resolveHonestBosDisplay(data);
  const score = honest.score;
  if (score === null) {
    return <BOSCardEmptyState data={{ ...data, score: null, contributors: [] }} />;
  }

  const honestData = {
    ...data,
    score,
    contributors: honest.contributors,
  };
  const bandColor = colorForScore(score);

  return (
    <section
      aria-label="Bio Optimization Score"
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 via-[#1A2744]/60 to-[#141E33]/60 backdrop-blur-md p-5 sm:p-6 md:p-8"
    >
      {/* Band-tracking glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: bandColor }}
      />

      <div className="relative flex flex-col gap-5 sm:gap-6">
        {/* 1. Two-column gauge + side panel */}
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
          <div className="mx-auto md:mx-0">
            <BOSScoreGauge data={honestData} />
          </div>
          <BOSSidePanel data={honestData} weeklyDelta={honestData.weekly_delta} />
        </div>

        {/* 2. Accuracy row */}
        <BOSAccuracyRow pills={data.accuracy_pills} />

        {/* 3. Engagement row */}
        <BOSEngagementRow pills={data.engagement_pills} />
      </div>
    </section>
  );
}
