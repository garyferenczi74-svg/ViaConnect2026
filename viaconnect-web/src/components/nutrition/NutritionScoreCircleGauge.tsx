'use client';

// Prompt #168c section 2.7: Nutrition Score circle gauge. Replaces the
// horizontal progress bar that used to sit in NutritionScoreCard with an
// SVG circle gauge matching the visual language of other gauges in the
// app (Bio Optimization Score, Daily Schedule).

import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';

export interface NutritionScoreCircleGaugeProps {
  readonly score: number;
  readonly mealCount: number;
  // Empty state copy when no meals scored yet.
  readonly emptyStateLabel?: string;
  // Sizing override for compact 3-up layouts. Default 160px mobile / 200px desktop.
  readonly mobilePx?: number;
  readonly desktopPx?: number;
  readonly mobileStroke?: number;
  readonly desktopStroke?: number;
  // Prompt 177f (2026-06-07): scales the tier label and empty-state
  // caption down on mobile only so they fit cleanly under the smaller
  // secondary gauges (Total Daily Macros + 7 Day Average) on the
  // restructured Nutrition Score card. Desktop typography unchanged.
  // Default false preserves the existing hero rendering.
  readonly compactMobileCaption?: boolean;
}

interface TierBand {
  readonly min: number;
  readonly max: number;
  readonly label: string;
  readonly color: string;
}

// Tier color bands per Gary 2026-05-15: red / yellow / purple / blue / green
// stoplight progression. Supersedes the prior spec section 2.4 Path C wash
// (orange / orange / amber / teal / teal). Hex values are Tailwind 500 shades
// for vibrancy; tier names (Poor/Fair/Good/Excellent/Perfection) unchanged
// because Gordon scoring + audit trails reference them.
const TIER_BANDS: ReadonlyArray<TierBand> = [
  { min: 0, max: 19, label: 'Poor', color: '#ef4444' },
  { min: 20, max: 39, label: 'Fair', color: '#eab308' },
  { min: 40, max: 59, label: 'Good', color: '#a855f7' },
  { min: 60, max: 79, label: 'Excellent', color: '#3b82f6' },
  { min: 80, max: 100, label: 'Perfection', color: '#22c55e' },
];

function tierForScore(score: number): TierBand {
  for (const band of TIER_BANDS) {
    if (score >= band.min && score <= band.max) return band;
  }
  return TIER_BANDS[0];
}

export function NutritionScoreCircleGauge(props: NutritionScoreCircleGaugeProps) {
  const {
    score,
    mealCount,
    emptyStateLabel,
    mobilePx = 160,
    desktopPx = 200,
    compactMobileCaption = false,
  } = props;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const hasData = mealCount > 0 && score > 0;
  const tier = tierForScore(clamped);

  // Prompt 182 (2026-06-09): replaced the flat circle gauge with the
  // shared PlasmaGauge in standard variant, metric=nutrition (green).
  // The empty state (no data yet) shows a track only and a caption,
  // preserving the existing pre-data UX.
  return (
    <div className="flex flex-col items-center gap-2 md:gap-3">
      {hasData ? (
        <>
          <div className="md:hidden">
            <PlasmaGauge value={clamped} metric="nutrition" variant="standard" size={mobilePx} />
          </div>
          <div className="hidden md:block">
            <PlasmaGauge value={clamped} metric="nutrition" variant="standard" size={desktopPx} />
          </div>
          <span
            className={`font-medium uppercase tracking-[0.10em] ${
              compactMobileCaption ? 'text-[12px] md:text-[14px]' : 'text-[14px]'
            }`}
            style={{ color: tier.color }}
          >
            {tier.label}
          </span>
        </>
      ) : (
        <>
          <div className="md:hidden">
            <PlasmaGauge value={0} metric="nutrition" variant="standard" size={mobilePx} animated={false} />
          </div>
          <div className="hidden md:block">
            <PlasmaGauge value={0} metric="nutrition" variant="standard" size={desktopPx} animated={false} />
          </div>
          <span
            className={`text-white/55 ${
              compactMobileCaption ? 'text-[10px] md:text-[12px]' : 'text-[12px]'
            }`}
          >
            {emptyStateLabel ?? `Based on ${mealCount} meals logged today`}
          </span>
        </>
      )}
    </div>
  );
}

export default NutritionScoreCircleGauge;
