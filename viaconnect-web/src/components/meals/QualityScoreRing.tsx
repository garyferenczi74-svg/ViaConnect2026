'use client';

// Prompt #168 Apply A: Gordon quality score ring.
// Pure presentation; tier change triggers single 200ms scale pulse.
// Token map per Section 6.3 of docs/superpowers/plans/2026-05-14-prompt-168-meal-foundation.md.

import { useEffect, useId, useRef, useState } from 'react';
import type { QualityTier } from '@/lib/gordon/types';
import { TIER_BOUNDARIES } from '@/lib/gordon/constants';

export interface QualityScoreRingProps {
  readonly score: number;
  readonly tier: QualityTier;
  readonly sizePx?: number;
}

function colorForTier(tier: QualityTier): string {
  const match = TIER_BOUNDARIES.find((entry) => entry.tier === tier);
  return match ? match.colorHex : '#2DA5A0';
}

export function QualityScoreRing(props: QualityScoreRingProps) {
  const { score, tier, sizePx = 140 } = props;
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 10;
  const radius = (sizePx - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (clampedScore / 100) * circumference;
  const tierColor = colorForTier(tier);

  const previousTier = useRef<QualityTier>(tier);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (previousTier.current !== tier) {
      previousTier.current = tier;
      setPulseKey((k) => k + 1);
    }
  }, [tier]);

  const pulseStyleId = useId();
  const pulseAnimationName = `scoreRingPulse_${pulseStyleId.replace(/[^a-zA-Z0-9_]/g, '')}`;
  const scoreFontPx = sizePx <= 160 ? 32 : 48;

  return (
    <div
      role="img"
      aria-label={`Quality score ${clampedScore} out of 100, tier ${tier}`}
      className="relative inline-flex items-center justify-center font-[Instrument_Sans]"
      style={{ width: sizePx, height: sizePx }}
    >
      <style>{`
        @keyframes ${pulseAnimationName} {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
      <svg
        key={pulseKey}
        width={sizePx}
        height={sizePx}
        viewBox={`0 0 ${sizePx} ${sizePx}`}
        style={{
          animation: pulseKey > 0 ? `${pulseAnimationName} 200ms ease-out 1` : undefined,
        }}
      >
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          fill="none"
          stroke={tierColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          transform={`rotate(-90 ${sizePx / 2} ${sizePx / 2})`}
          style={{ transition: 'stroke-dasharray 200ms ease-out, stroke 200ms ease-out' }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold leading-none tabular-nums text-white"
          style={{ fontSize: `${scoreFontPx}px` }}
        >
          {clampedScore}
        </span>
        <span
          className="mt-1 text-[12px] font-medium uppercase tracking-[0.10em]"
          style={{ color: tierColor }}
        >
          {tier}
        </span>
      </div>
    </div>
  );
}

export default QualityScoreRing;
