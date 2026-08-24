'use client';

// BOSSidePanel: right-column companion to BOSScoreGauge.
//
// Composition:
//   1. Eyebrow + headline ("Your score is {Status}" with the status
//      word colored by band)
//   2. Info chips:
//        a. Weekly delta (hidden when weekly_delta is missing)
//        b. Last updated (stale dates are labeled, never silent)
//        c. Accuracy from confidence_display
//   3. Five-dot data-completeness indicator
//
// Helix rewards stay off this card (Brief 1 / Brief 13). helix_challenges
// may still compute on engagement pills; this panel does not show a
// Helix tier or earn multiplier.

import { TrendingDown, TrendingUp, Minus, Clock, Target } from 'lucide-react';
import type { BOSCurrentResponse } from '@/lib/scoring/types';
import { formatBosLastUpdated, toDisplayBosScore } from '@/lib/scoring/bos-display';
import { colorForScore } from './bos-gauge-helpers';
import { BOSStaticExplanation } from './bos-static-explanation';
import { BOS_PILL_GRADIENT } from './bos-pill-helpers';
import {
  buildSidePanelHeadline,
  buildWeeklyDeltaChip,
  buildTrackedDimensionsSummary,
  TRACKED_DIMENSION_ORDER,
  type TrackedDimensions,
} from './bos-side-panel-helpers';

export interface BOSSidePanelProps {
  data: BOSCurrentResponse;
  weeklyDelta?: number | null;
  trackedDimensions?: TrackedDimensions | null;
}

export function BOSSidePanel({
  data,
  weeklyDelta,
  trackedDimensions = null,
}: BOSSidePanelProps) {
  const score = toDisplayBosScore(data.score);
  const resolvedDelta = weeklyDelta !== undefined ? weeklyDelta : data.weekly_delta;
  const delta = buildWeeklyDeltaChip(resolvedDelta ?? null);
  const completeness = buildTrackedDimensionsSummary(trackedDimensions);
  const lastUpdated = formatBosLastUpdated(data.computed_at);
  const bandColor = score === null ? '#2DA5A0' : colorForScore(score);
  const headline = score === null
    ? { prefix: 'Your score is ', status: 'not ready', color: '#A1A1AA' }
    : buildSidePanelHeadline(score);

  const chipCount = (delta ? 1 : 0) + 2;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Bio Optimization Score
        </p>
        <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">
          {headline.prefix}
          <span style={{ color: headline.color }}>{headline.status}</span>
        </h2>
      </div>

      <BOSStaticExplanation />

      <div
        className={`grid grid-cols-1 gap-2 ${
          chipCount >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        {delta && (
          <div className={`flex items-center gap-2 rounded-xl border border-white/10 ${BOS_PILL_GRADIENT} px-3 py-2.5`}>
            {delta.polarity === 'up' ? (
              <TrendingUp
                className="h-4 w-4 flex-shrink-0"
                style={{ color: delta.color }}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            ) : delta.polarity === 'down' ? (
              <TrendingDown
                className="h-4 w-4 flex-shrink-0"
                style={{ color: delta.color }}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            ) : (
              <Minus
                className="h-4 w-4 flex-shrink-0"
                style={{ color: delta.color }}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/40">
                vs last week
              </p>
              <p className="text-sm font-semibold text-white">{delta.value}</p>
            </div>
          </div>
        )}

        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
            lastUpdated.freshness === 'stale'
              ? 'border-[#F59E0B]/40 bg-[#F59E0B]/10'
              : `border-white/10 ${BOS_PILL_GRADIENT}`
          }`}
        >
          <Clock
            className="h-4 w-4 flex-shrink-0"
            strokeWidth={1.5}
            style={{ color: lastUpdated.freshness === 'stale' ? '#F59E0B' : bandColor }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              Last updated
            </p>
            <p className="truncate text-sm font-semibold text-white">{lastUpdated.label}</p>
          </div>
        </div>

        <div className={`flex items-center gap-2 rounded-xl border border-white/10 ${BOS_PILL_GRADIENT} px-3 py-2.5`}>
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `${bandColor}22`,
              border: `1px solid ${bandColor}40`,
            }}
            aria-hidden="true"
          >
            <Target
              className="h-3.5 w-3.5"
              strokeWidth={1.5}
              style={{ color: bandColor }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              Accuracy
            </p>
            <p className="text-sm font-semibold text-white">
              {data.confidence_display}
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-1.5"
        aria-label={`Daily score dimensions: ${completeness.label}`}
      >
        {TRACKED_DIMENSION_ORDER.map((dim) => (
          <div
            key={dim}
            title={dim}
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
              completeness.tracked[dim] ? 'bg-[#2DA5A0]' : 'bg-white/15'
            }`}
            aria-hidden="true"
          />
        ))}
        <span className="ml-1 text-[11px] text-white/40">{completeness.label}</span>
      </div>
    </div>
  );
}
