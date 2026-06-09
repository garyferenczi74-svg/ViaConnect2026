'use client';

// Prompt #168 Apply A: Gordon quality score ring.
//
// Prompt 182 (2026-06-09): the flat open arc is replaced by the
// shared PlasmaGauge in compact variant with the mealscore (green)
// token. The wrapper keeps the tier label below the ring so the
// Dashboard quick log preview (sizePx 140) and the Today's Meals
// per meal rings (sizePx ~60) read the same as before, just with
// the new 3D treatment.

import type { QualityTier } from '@/lib/gordon/types';
import { TIER_BOUNDARIES } from '@/lib/gordon/constants';
import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';

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
  const tierColor = colorForTier(tier);
  const tierFontPx = Math.max(10, Math.round(sizePx * 0.085));

  return (
    <div
      role="img"
      aria-label={`Quality score ${clampedScore} out of 100, tier ${tier}`}
      className="inline-flex flex-col items-center font-[Instrument_Sans]"
    >
      <PlasmaGauge
        value={clampedScore}
        metric="mealscore"
        variant="compact"
        size={sizePx}
      />
      <span
        className="mt-1 font-medium uppercase tracking-[0.10em] whitespace-nowrap"
        style={{ color: tierColor, fontSize: `${tierFontPx}px` }}
      >
        {tier}
      </span>
    </div>
  );
}

export default QualityScoreRing;
