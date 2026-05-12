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

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { BOSCurrentResponse } from '@/lib/scoring/types';
import {
  colorForScore,
  labelForScore,
  sentenceCase,
  geometryFor,
  countUpValueAtProgress,
  GAUGE_SIZE,
  GAUGE_STROKE,
  START_ANGLE_DEGREES,
} from './bos-gauge-helpers';

export interface BOSScoreGaugeProps {
  data: BOSCurrentResponse;
}

// useCountUp: legacy ease-out-cubic over 1.5s via requestAnimationFrame.
// The pure curve math lives in countUpValueAtProgress (unit-tested).
function useCountUp(target: number, duration = 1500): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(countUpValueAtProgress(target, progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function BOSScoreGauge({ data }: BOSScoreGaugeProps) {
  const isPlaceholder = data.score === null;
  const target = data.score ?? 0;
  const animated = useCountUp(target);
  const color = isPlaceholder ? '#2DA5A0' : colorForScore(animated);
  const label = isPlaceholder ? 'READY' : labelForScore(animated);

  const { radius, center, circumference, arcLength } = geometryFor(
    GAUGE_SIZE,
    GAUGE_STROKE,
  );
  const fillLength = (animated / 100) * arcLength;

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
      <div className="relative" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
        <svg
          width={GAUGE_SIZE}
          height={GAUGE_SIZE}
          viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
          style={{ transform: `rotate(${START_ANGLE_DEGREES}deg)` }}
          aria-hidden="true"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={GAUGE_STROKE}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {!isPlaceholder ? (
            <motion.circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={GAUGE_STROKE}
              strokeLinecap="round"
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${fillLength} ${circumference}` }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
              style={{ filter: `drop-shadow(0 0 12px ${color}66)` }}
            />
          ) : null}
        </svg>

        {/* Center label sits in a non-rotated div over the rotated SVG */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isPlaceholder ? (
            <span
              className="text-5xl font-bold text-white/40 sm:text-6xl"
              aria-label="No score yet"
            >
              --
            </span>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div
                className="text-5xl font-bold leading-none sm:text-6xl"
                style={{ color }}
              >
                {animated}
              </div>
              <div className="mt-1 text-sm text-white/40">/ 100</div>
            </motion.div>
          )}
        </div>
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
