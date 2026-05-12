'use client';

// BOSSidePanel: right-column companion to BOSScoreGauge.
//
// Composition per the canonical legacy BioOptimizationGauge.tsx:
//   1. Eyebrow + headline ("Your score is {Status}" with the status
//      word colored by band)
//   2. Three info chips in a sm:grid-cols-3 row:
//        a. Weekly delta    TrendingUp / TrendingDown / Minus icon
//        b. Tier            ShieldCheck icon
//        c. Confidence      no icon, value derived from confidence_display
//   3. Five-dot data-completeness indicator (sleep, activity, stress,
//      recovery, hrv)
//
// Read-API gaps: weekly_delta and tracked_dimensions are not on the
// current BOSCurrentResponse. Both render as placeholders via the
// helper builders; the surrounding wiring is ready for the read API
// to add those fields without touching this file.

import { TrendingDown, TrendingUp, Minus, ShieldCheck } from 'lucide-react';
import type { BOSCurrentResponse } from '@/lib/scoring/types';
import { colorForScore } from './bos-gauge-helpers';
import {
  buildSidePanelHeadline,
  buildWeeklyDeltaChip,
  buildTierChipValue,
  buildTrackedDimensionsSummary,
  TRACKED_DIMENSION_ORDER,
  type TrackedDimensions,
} from './bos-side-panel-helpers';

export interface BOSSidePanelProps {
  data: BOSCurrentResponse;
  /** Read-API gap: not yet on BOSCurrentResponse. Pass null. */
  weeklyDelta?: number | null;
  /** Read-API gap: not yet on BOSCurrentResponse. Pass null. */
  trackedDimensions?: TrackedDimensions | null;
}

export function BOSSidePanel({
  data,
  weeklyDelta = null,
  trackedDimensions = null,
}: BOSSidePanelProps) {
  const headline = buildSidePanelHeadline(data.score ?? 0);
  const delta = buildWeeklyDeltaChip(weeklyDelta);
  const tier = buildTierChipValue(data.tier);
  const completeness = buildTrackedDimensionsSummary(trackedDimensions);
  const bandColor = colorForScore(data.score ?? 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Eyebrow + headline */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
          Bio Optimization Score
        </p>
        <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">
          {headline.prefix}
          <span style={{ color: headline.color }}>{headline.status}</span>
        </h2>
      </div>

      {/* Three info chips */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {/* Weekly delta */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
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

        {/* Tier */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `${bandColor}22`,
              border: `1px solid ${bandColor}40`,
            }}
            aria-hidden="true"
          >
            <ShieldCheck
              className="h-3.5 w-3.5"
              strokeWidth={1.5}
              style={{ color: bandColor }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Tier</p>
            <p className="truncate text-sm font-semibold text-white">{tier}</p>
          </div>
        </div>

        {/* Confidence */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              Confidence
            </p>
            <p className="text-sm font-semibold text-white">
              {data.confidence_display}
            </p>
          </div>
        </div>
      </div>

      {/* 5-dot data-completeness indicator */}
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
