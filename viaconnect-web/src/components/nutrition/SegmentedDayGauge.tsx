'use client';

// Prompt #169 followup per Gary 2026-05-15: 7 Day Average gauge variant.
// Instead of a continuous arc representing avg quality score, the ring is
// divided into 7 segments (one per day in the rolling 7-day window). A
// segment fills with the tier color when at least one meal was logged on
// that day. Center text reads "X/7" where X is the days-logged count.
//
// Tier band thresholds reuse the same color stoplight from
// NutritionScoreCircleGauge (red / yellow / purple / blue / green) computed
// from (daysLogged / totalDays) * 100.

import { useEffect, useRef, useState } from 'react';

export interface SegmentedDayGaugeProps {
  readonly daysLogged: number;
  readonly totalDays?: number;
  readonly mobilePx?: number;
  readonly desktopPx?: number;
  readonly mobileStroke?: number;
  readonly desktopStroke?: number;
}

interface TierBand {
  readonly min: number;
  readonly max: number;
  readonly color: string;
}

const TIER_BANDS: ReadonlyArray<TierBand> = [
  { min: 0, max: 19, color: '#ef4444' },
  { min: 20, max: 39, color: '#eab308' },
  { min: 40, max: 59, color: '#a855f7' },
  { min: 60, max: 79, color: '#3b82f6' },
  { min: 80, max: 100, color: '#22c55e' },
];

function tierColor(pct: number): string {
  for (const b of TIER_BANDS) {
    if (pct >= b.min && pct <= b.max) return b.color;
  }
  return TIER_BANDS[0].color;
}

interface PolarPoint {
  readonly x: number;
  readonly y: number;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number): PolarPoint {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

export function SegmentedDayGauge(props: SegmentedDayGaugeProps) {
  const {
    daysLogged,
    totalDays = 7,
    mobilePx = 140,
    desktopPx = 150,
    mobileStroke = 10,
    desktopStroke = 12,
  } = props;

  const safeTotal = Math.max(1, Math.floor(totalDays));
  const safeCount = Math.max(0, Math.min(safeTotal, Math.floor(daysLogged)));
  const pct = (safeCount / safeTotal) * 100;
  const color = tierColor(pct);

  // Pulse the gauge briefly when the days-logged count crosses a tier band.
  const lastTierColor = useRef<string>(color);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (color !== lastTierColor.current) {
      lastTierColor.current = color;
      setPulseKey((k) => k + 1);
    }
  }, [color]);

  // Prompt 175m gauge sizing (2026-06-05): gap-3 → gap-2 mobile for
  // visual rhythm parity with NutritionScoreCircleGauge.
  return (
    <div className="flex flex-col items-center gap-2 md:gap-3">
      <div className="md:hidden">
        <SegmentedRing
          sizePx={mobilePx}
          stroke={mobileStroke}
          totalSegments={safeTotal}
          filledSegments={safeCount}
          color={color}
          pulseKey={pulseKey}
        />
      </div>
      <div className="hidden md:block">
        <SegmentedRing
          sizePx={desktopPx}
          stroke={desktopStroke}
          totalSegments={safeTotal}
          filledSegments={safeCount}
          color={color}
          pulseKey={pulseKey}
        />
      </div>
    </div>
  );
}

interface SegmentedRingProps {
  readonly sizePx: number;
  readonly stroke: number;
  readonly totalSegments: number;
  readonly filledSegments: number;
  readonly color: string;
  readonly pulseKey: number;
}

function SegmentedRing(props: SegmentedRingProps) {
  const { sizePx, stroke, totalSegments, filledSegments, color, pulseKey } = props;
  const radius = (sizePx - stroke) / 2;
  const cx = sizePx / 2;
  const cy = sizePx / 2;

  // Visual gap between segments expressed in degrees of arc. Tighter gaps
  // for shorter rings so segments stay readable; wider gaps look better
  // at larger sizes.
  const gapDeg = sizePx >= 180 ? 6 : 4;
  const segmentDeg = (360 - totalSegments * gapDeg) / totalSegments;

  return (
    <div
      key={pulseKey}
      className="relative inline-flex items-center justify-center"
      style={{
        width: sizePx,
        height: sizePx,
        animation: pulseKey > 0 ? 'segmentedDayGaugePulse 200ms ease-out' : undefined,
      }}
    >
      <style jsx>{`
        @keyframes segmentedDayGaugePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
      <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`}>
        {Array.from({ length: totalSegments }).map((_, i) => {
          const startAngle = i * (segmentDeg + gapDeg);
          const endAngle = startAngle + segmentDeg;
          const isFilled = i < filledSegments;
          const path = describeArc(cx, cy, radius, startAngle, endAngle);
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke={isFilled ? color : 'rgba(255,255,255,0.08)'}
              strokeWidth={stroke}
              strokeLinecap="round"
              style={{ transition: 'stroke 300ms ease-out' }}
            />
          );
        })}
      </svg>
      {/* Prompt 175m gauge sizing v2 (2026-06-05): proportional bands so
          the days-logged count and denominator stay legible at the new
          100 px mobile ring without crowding it. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-bold tabular-nums leading-none text-white"
          style={{
            fontSize:
              sizePx >= 180 ? '40px'
              : sizePx >= 140 ? '30px'
              : sizePx >= 110 ? '24px'
              : '20px',
          }}
        >
          {filledSegments}
        </span>
        <span
          className="mt-0.5 tabular-nums leading-none text-white/55"
          style={{
            fontSize:
              sizePx >= 180 ? '14px'
              : sizePx >= 140 ? '12px'
              : sizePx >= 110 ? '11px'
              : '9px',
          }}
        >
          / {totalSegments}
        </span>
      </div>
    </div>
  );
}

export default SegmentedDayGauge;
