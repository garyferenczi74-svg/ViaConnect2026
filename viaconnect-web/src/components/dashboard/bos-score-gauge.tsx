'use client';

// BOSScoreGauge: circular SVG gauge for the Bio Optimization Score card.
//
// Patch pass (Phase A corrective): aligned to the canonical legacy
// BioOptimizationGauge.tsx. The legacy renders a SINGLE 240px gauge
// with a 14px stroke and a 270 degree sweep (open at the bottom). The
// SVG viewport itself is rotated 135 degrees so the gap sits at the
// bottom-center. The score number stays right-side-up by being
// absolutely positioned in a non-rotated div over the SVG.
//
// State branches:
//   data.score === null  pre-compute (CAQ not yet complete). Renders
//                        the same gauge geometry with no fill ring,
//                        and a placeholder "--" centered.
//   data.score numeric   animated gauge with band-color fill, glowing
//                        drop-shadow, count-up score number, and a
//                        tier label below colored to match the band.
//
// Animation is the legacy useCountUp: requestAnimationFrame plus
// ease-out-cubic over 1500ms. The pure math kernel lives in
// bos-gauge-helpers.ts so the easing curve is unit-tested in
// isolation. Framer Motion's motion.circle animates the
// strokeDasharray from 0 to fillLength over the same duration.

import type { BOSCurrentResponse } from '@/lib/scoring/types';
import {
  colorForScore,
  labelForScore,
  sentenceCase,
  geometryFor,
} from './bos-gauge-helpers';
import { PlasmaGauge } from '@/components/gauges/PlasmaGauge';

export interface BOSScoreGaugeProps {
  data: BOSCurrentResponse;
}

export function BOSScoreGauge({ data }: BOSScoreGaugeProps) {
  const isPlaceholder = data.score === null;
  const target = data.score ?? 0;
  const color = isPlaceholder ? '#2DA5A0' : colorForScore(target);
  const label = isPlaceholder ? 'READY' : labelForScore(target);

  // Prompt 182 (2026-06-09): the open arc + tier color SVG body is
  // replaced by the shared PlasmaGauge in hero variant. The wrapper
  // keeps the placeholder branch ("--" when score is null), the tier
  // pill below, and the aria-live announcement so the BOS card chrome
  // is unchanged. Sizing matches the prior 240 / mobile 200 layout via
  // a responsive wrapper.
  return (
    <div
      className="flex flex-col items-center"
      aria-live="polite"
      aria-label={
        isPlaceholder
          ? 'Bio Optimization Score not yet computed'
          : `Bio Optimization Score ${target}, ${sentenceCase(label)}`
      }
    >
      <div className="relative h-[200px] w-[200px] sm:h-[240px] sm:w-[240px]">
        {isPlaceholder ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-5xl font-bold text-white/40 sm:text-6xl"
              aria-label="No score yet"
            >
              --
            </span>
          </div>
        ) : (
          <>
            {/* Mobile size */}
            <div className="block sm:hidden">
              <PlasmaGauge metric="bioscore" variant="hero" size={200} value={target} />
            </div>
            {/* Desktop size */}
            <div className="hidden sm:block">
              <PlasmaGauge metric="bioscore" variant="hero" size={240} value={target} />
            </div>
          </>
        )}
      </div>

      <p
        className="mt-3 text-xs font-semibold uppercase tracking-[0.18em]"
        style={{ color }}
      >
        {label}
      </p>
    </div>
  );
}

// Re-exports for back-compat. Tests import the pure helpers from
// bos-gauge-helpers.ts directly to avoid pulling JSX through Vite.
export { colorForScore, labelForScore, sentenceCase, geometryFor };
