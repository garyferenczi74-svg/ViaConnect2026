'use client';

// Prompt #168c section 2.7: Nutrition Score circle gauge. Replaces the
// horizontal progress bar that used to sit in NutritionScoreCard with an
// SVG circle gauge matching the visual language of other gauges in the
// app (Bio Optimization Score, Daily Schedule).

import { useEffect, useRef, useState } from 'react';

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
    mobileStroke = 12,
    desktopStroke = 16,
  } = props;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const hasData = mealCount > 0 && score > 0;
  const tier = tierForScore(clamped);

  // Spec section 2.7: subtle pulse animation on tier crossover (scale 1.05 over 200ms).
  const lastTierLabel = useRef<string>(tier.label);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (tier.label !== lastTierLabel.current) {
      lastTierLabel.current = tier.label;
      setPulseKey((k) => k + 1);
    }
  }, [tier.label]);

  // Responsive: 160px mobile / 200px desktop diameter; 12 / 16 stroke.
  // Render two SVGs and toggle visibility via Tailwind responsive classes.
  // Single SVG with CSS would also work but the geometry math depends on
  // sizePx so two renders keeps the math correct at each breakpoint.
  //
  // Prompt 175m gauge sizing (2026-06-05): gap-3 between the ring and
  // the tier / helper line dropped to gap-2 on mobile so each gauge
  // group sits more compactly inside NutritionScoreCard. Desktop keeps
  // gap-3 because the larger ring carries the extra breathing room
  // visually.
  return (
    <div className="flex flex-col items-center gap-2 md:gap-3">
      <div className="md:hidden">
        <CircleGauge sizePx={mobilePx} stroke={mobileStroke} score={clamped} hasData={hasData} color={tier.color} pulseKey={pulseKey} />
      </div>
      <div className="hidden md:block">
        <CircleGauge sizePx={desktopPx} stroke={desktopStroke} score={clamped} hasData={hasData} color={tier.color} pulseKey={pulseKey} />
      </div>
      {hasData ? (
        <span
          className="text-[14px] font-medium uppercase tracking-[0.10em]"
          style={{ color: tier.color }}
        >
          {tier.label}
        </span>
      ) : (
        <span className="text-[12px] text-white/55">
          {emptyStateLabel ?? `Based on ${mealCount} meals logged today`}
        </span>
      )}
    </div>
  );
}

interface CircleGaugeProps {
  readonly sizePx: number;
  readonly stroke: number;
  readonly score: number;
  readonly hasData: boolean;
  readonly color: string;
  readonly pulseKey: number;
}

function CircleGauge({ sizePx, stroke, score, hasData, color, pulseKey }: CircleGaugeProps) {
  const radius = (sizePx - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (score / 100) * circumference;
  const ringColor = hasData ? color : 'rgba(255,255,255,0.10)';

  return (
    <div
      key={pulseKey}
      className="relative inline-flex animate-pulse-once items-center justify-center"
      style={{
        width: sizePx,
        height: sizePx,
        animation: pulseKey > 0 ? 'nutritionScoreGaugePulse 200ms ease-out' : undefined,
      }}
    >
      <style jsx>{`
        @keyframes nutritionScoreGaugePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
      <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`}>
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {hasData ? (
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
            transform={`rotate(-90 ${sizePx / 2} ${sizePx / 2})`}
            style={{ transition: 'stroke-dasharray 400ms ease-out, stroke 400ms ease-out' }}
          />
        ) : null}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tabular-nums leading-none text-white"
          style={{ fontSize: sizePx >= 200 ? '48px' : '32px' }}
        >
          {score}
        </span>
        <span
          className="mt-1 tabular-nums leading-none text-white/55"
          style={{ fontSize: sizePx >= 200 ? '14px' : '12px' }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}

export default NutritionScoreCircleGauge;
