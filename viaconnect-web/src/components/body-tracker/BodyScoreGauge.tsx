'use client';

// BodyScoreGauge — radial arc gauge (180 semicircle) for the Body Score (0-1000).

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BodyScoreTier } from '@/lib/body-tracker/types';
import { TIER_COLORS } from '@/lib/body-tracker/constants';

interface BodyScoreGaugeProps {
  score: number;
  previousScore?: number;
  confidencePct: number;
  tier: BodyScoreTier;
}

function useCountUp(target: number, duration = 1500): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function BodyScoreGauge({ score, previousScore, confidencePct, tier }: BodyScoreGaugeProps) {
  const animated = useCountUp(score);
  const color = TIER_COLORS[tier];
  const delta = previousScore != null ? score - previousScore : 0;

  // SVG: 180 semicircle
  const size = 240;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (180 / 360) * circumference;
  const fillLength = (Math.min(score, 1000) / 1000) * arcLength;

  return (
    <div className="mx-auto flex w-fit flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#1E3054]/40 p-5 backdrop-blur-lg md:p-6">
      {/* Gauge */}
      <div className="relative" style={{ width: size, height: size / 2 + 30 }}>
        <svg
          width={size}
          height={size / 2 + 20}
          viewBox={`0 0 ${size} ${size / 2 + 20}`}
        >
          {/* Track */}
          <path
            d={`M ${stroke / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${center}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Fill */}
          <motion.path
            d={`M ${stroke / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${center}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${arcLength}` }}
            animate={{ strokeDasharray: `${fillLength} ${arcLength}` }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
            style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <div className="text-5xl font-bold" style={{ color }}>
              {animated}
            </div>
            <div className="mt-1 text-sm text-white/40">/ 1000</div>
          </motion.div>
        </div>
      </div>

      {/* Tier badge */}
      <span
        className="rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-wider"
        style={{ backgroundColor: `${color}22`, borderColor: `${color}44`, color }}
      >
        {tier}
      </span>

      {/* Info row */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        {/* Delta */}
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5">
          {delta > 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          ) : delta < 0 ? (
            <TrendingDown className="h-3.5 w-3.5 text-[#EF4444]" strokeWidth={1.5} />
          ) : (
            <Minus className="h-3.5 w-3.5 text-white/40" strokeWidth={1.5} />
          )}
          <span className="text-white/70">
            {delta > 0 ? '+' : ''}{delta} since last week
          </span>
        </div>

        {/* Confidence */}
        <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5">
          <span className="text-white/40">Confidence:</span>
          <span className="font-semibold text-white">{confidencePct}%</span>
        </div>
      </div>
    </div>
  );
}
