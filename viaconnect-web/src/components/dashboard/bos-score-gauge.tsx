'use client';

// BOSScoreGauge: circular SVG gauge for the Bio Optimization Score card.
//
// Geometry mirrors DailyScoreGauge.tsx and DailyMetricGauge.tsx so the
// BOS card reads as part of the same gauge family: 270 degree sweep
// open at the bottom, animated strokeDasharray on a motion.circle,
// count-up score number colored by 5 tier band, status label below.
//
// State branches:
//   data.score === null  pre compute (CAQ not yet complete). Renders the
//                        same gauge geometry with no fill and a dashed
//                        placeholder, score "--" and label "READY".
//   data.score numeric   animated gauge with band color, band label,
//                        and an inline confidence chip "Confidence X%".
//
// Animation pattern is the legacy useCountUp (ease out cubic over
// 1.5s) plus a Framer motion.circle that grows the strokeDasharray
// from 0 to the fillLength. Spring config is per #161e §6.2:
// stiffness 100, damping 30 on the score number transform; that is
// applied via Framer Motion's spring on the count up animator.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { BOSCurrentResponse } from '@/lib/scoring/types';
import {
  colorForScore,
  labelForScore,
  sentenceCase,
  geometryFor,
  START_ANGLE_DEGREES,
} from './bos-gauge-helpers';

export interface BOSScoreGaugeProps {
  data: BOSCurrentResponse;
}

// Count up hook: ease out cubic over 1.5s, matches legacy.
function useCountUp(target: number, duration = 1500): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

// SVG geometry constants, matching DailyScoreGauge.tsx exactly. Two
// sizes: 120 mobile, 160 desktop. Both keep the 270 degree sweep, the
// same stroke ratio, and the same rotation. Sized via Tailwind hidden
// switches so JS does not branch on viewport.
const MOBILE_SIZE = 120;
const MOBILE_STROKE = 9;
const DESKTOP_SIZE = 160;
const DESKTOP_STROKE = 12;

interface GaugeSvgProps {
  size: number;
  stroke: number;
  color: string;
  scoreValue: number;
  isPlaceholder: boolean;
}

function GaugeSvg({ size, stroke, color, scoreValue, isPlaceholder }: GaugeSvgProps) {
  const { radius, center, circumference, arcLength } = geometryFor(size, stroke);
  const fillLength = (scoreValue / 100) * arcLength;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: `rotate(${START_ANGLE_DEGREES}deg)` }}
      aria-hidden="true"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
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
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${fillLength} ${circumference}` }}
          transition={{ type: 'spring', stiffness: 100, damping: 30, delay: 0.2 }}
          style={{ filter: `drop-shadow(0 0 10px ${color}55)` }}
        />
      ) : null}
    </svg>
  );
}

export function BOSScoreGauge({ data }: BOSScoreGaugeProps) {
  const isPlaceholder = data.score === null;
  const target = data.score ?? 0;
  const animated = useCountUp(target);
  const color = isPlaceholder ? '#2DA5A0' : colorForScore(animated);
  const label = isPlaceholder ? 'READY' : labelForScore(animated);

  return (
    <div className="flex flex-col items-center" aria-live="polite">
      {/* Mobile gauge (sm and below) */}
      <div className="relative sm:hidden" style={{ width: MOBILE_SIZE, height: MOBILE_SIZE }}>
        <GaugeSvg
          size={MOBILE_SIZE}
          stroke={MOBILE_STROKE}
          color={color}
          scoreValue={animated}
          isPlaceholder={isPlaceholder}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isPlaceholder ? (
            <span
              className="text-3xl font-bold text-white/40"
              aria-label="No score yet"
            >
              --
            </span>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="text-3xl font-bold leading-none" style={{ color }}>
                {animated}
              </div>
              <div className="mt-0.5 text-[10px] text-white/40">/ 100</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Desktop gauge (sm and above) */}
      <div
        className="relative hidden sm:block"
        style={{ width: DESKTOP_SIZE, height: DESKTOP_SIZE }}
      >
        <GaugeSvg
          size={DESKTOP_SIZE}
          stroke={DESKTOP_STROKE}
          color={color}
          scoreValue={animated}
          isPlaceholder={isPlaceholder}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isPlaceholder ? (
            <span
              className="text-5xl font-bold text-white/40"
              aria-label="No score yet"
            >
              --
            </span>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="text-5xl font-bold leading-none" style={{ color }}>
                {animated}
              </div>
              <div className="mt-1 text-xs text-white/40">/ 100</div>
            </motion.div>
          )}
        </div>
      </div>

      <p
        className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-xs"
        style={{ color }}
      >
        {label}
      </p>

      {/* Decomposition line: confidence, optional baseline */}
      <p className="mt-2 text-xs text-white/60">
        {isPlaceholder ? (
          <>
            Confidence locks at{' '}
            <span className="font-semibold text-white">{data.confidence_display}</span>{' '}
            until your CAQ is complete
          </>
        ) : (
          <>
            <span>Your score is </span>
            <span className="font-semibold" style={{ color }}>
              {sentenceCase(label)}
            </span>
            <span className="text-white/40">{', '}</span>
            <span>Confidence </span>
            <span className="font-semibold text-white">{data.confidence_display}</span>
            {data.baseline !== null ? (
              <>
                <span className="text-white/40">{', '}</span>
                <span>Baseline </span>
                <span className="font-semibold text-white">{Math.round(data.baseline)}</span>
              </>
            ) : null}
          </>
        )}
      </p>
    </div>
  );
}

// Re-exports for back-compat. Tests import the pure helpers from
// bos-gauge-helpers.ts directly to avoid pulling JSX through Vite.
export { colorForScore, labelForScore, sentenceCase, geometryFor };
