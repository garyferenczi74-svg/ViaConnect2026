// Pure helpers for the BOS card side panel.
//
// The side panel (right column at md+, stacks below the gauge on
// mobile) carries the eyebrow + headline + 3 info chips + 5-dot
// data-completeness indicator per the canonical legacy
// BioOptimizationGauge.tsx. Helpers are extracted JSX-free so the
// node-environment Vitest suite can assert them without rendering.

import type { BOSTier } from '@/lib/scoring/types';
import { colorForScore, labelForScore, sentenceCase } from './bos-gauge-helpers';

// -- Headline builder ------------------------------------------------------

export interface SidePanelHeadline {
  prefix: 'Your score is ';
  status: string;
  color: string;
}

export function buildSidePanelHeadline(score: number): SidePanelHeadline {
  return {
    prefix: 'Your score is ',
    status: sentenceCase(labelForScore(score)),
    color: colorForScore(score),
  };
}

// -- Weekly delta chip -----------------------------------------------------
//
// weekly_delta is on BOSCurrentResponse. When null or non-finite, hide
// the chip. Never print "-- pts" as if it were a real delta.

export interface WeeklyDeltaChip {
  value: string;
  polarity: 'up' | 'down' | 'flat';
  color: string;
}

const FLAT_COLOR = '#A1A1AA';

export function buildWeeklyDeltaChip(delta: number | null): WeeklyDeltaChip | null {
  if (delta === null || !Number.isFinite(delta)) {
    return null;
  }
  if (delta > 0) {
    return { value: `+${delta} pts`, polarity: 'up', color: '#22C55E' };
  }
  if (delta < 0) {
    return { value: `${delta} pts`, polarity: 'down', color: '#EF4444' };
  }
  return { value: '0 pts', polarity: 'flat', color: FLAT_COLOR };
}

// -- Tier chip value -------------------------------------------------------
//
// Per the canonical legacy: "Tier {n} · {multiplier}" where
// multiplier maps to the Helix point multiplier. Separator is the
// U+00B7 middle dot. Multiplier display uses the lowercase 'x' suffix
// per the patch pass spec (not the multiplication sign).

const TIER_MULTIPLIER: Record<BOSTier, '1.5x' | '2x' | '5x'> = {
  1: '1.5x',
  2: '2x',
  3: '5x',
};

export function buildTierChipValue(tier: BOSTier): string {
  return `Tier ${tier} · ${TIER_MULTIPLIER[tier]}`;
}

// -- 5-dot data-completeness indicator -------------------------------------
//
// Read-API gap acknowledged: BOSCurrentResponse does not currently
// carry a tracked_dimensions field. When null is passed we render
// five dim dots with the "-- / 5 tracked" placeholder. When the read
// API adds tracked_dimensions this helper consumes it directly.

export interface TrackedDimensions {
  sleep: boolean;
  activity: boolean;
  stress: boolean;
  recovery: boolean;
  hrv: boolean;
}

export interface TrackedDimensionsSummary {
  tracked: TrackedDimensions;
  count: number;
  label: string;
  hasData: boolean;
}

const EMPTY_TRACKED: TrackedDimensions = {
  sleep: false,
  activity: false,
  stress: false,
  recovery: false,
  hrv: false,
};

export const TRACKED_DIMENSION_ORDER: (keyof TrackedDimensions)[] = [
  'sleep',
  'activity',
  'stress',
  'recovery',
  'hrv',
];

export function buildTrackedDimensionsSummary(
  dims: TrackedDimensions | null,
): TrackedDimensionsSummary {
  if (dims === null) {
    return {
      tracked: EMPTY_TRACKED,
      count: 0,
      label: '-- / 5 tracked',
      hasData: false,
    };
  }
  // Preserve order: rebuild from the canonical key list rather than
  // trust the inbound key order, so consumers can iterate Object.keys
  // and get the documented sequence.
  const tracked: TrackedDimensions = {
    sleep: dims.sleep,
    activity: dims.activity,
    stress: dims.stress,
    recovery: dims.recovery,
    hrv: dims.hrv,
  };
  const count = TRACKED_DIMENSION_ORDER.reduce(
    (n, k) => n + (tracked[k] ? 1 : 0),
    0,
  );
  return {
    tracked,
    count,
    label: `${count} / 5 tracked`,
    hasData: true,
  };
}
