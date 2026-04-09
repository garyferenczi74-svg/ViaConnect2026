'use client';

// DailyMetricGauge — compact circular gauge that mirrors the
// BioOptimizationGauge's design language (270° SVG arc, color-by-range,
// drop-shadow glow) at a smaller size for use in the Daily Scores grid.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface DailyMetricGaugeProps {
  /** 0–100 normalized value used for the arc fill and color. */
  score: number;
  /** Label displayed in the center of the gauge (e.g. "82", "8.2k"). */
  displayValue: string;
  /** Small unit string under the displayValue (e.g. "/100", "steps"). */
  displayUnit?: string;
  /** Metric name shown below the gauge. */
  label: string;
  /** Optional Lucide icon shown above the metric label. */
  icon?: LucideIcon;
  /** Animation delay for staggered entrance. */
  delay?: number;
}

const colorForScore = (score: number): string => {
  if (score >= 91) return '#A855F7';
  if (score >= 76) return '#22C55E';
  if (score >= 51) return '#2DA5A0';
  if (score >= 26) return '#F59E0B';
  return '#EF4444';
};

function useCountUp(target: number, duration = 1200, delayMs = 0): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    let cancelled = false;
    const startTimer = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased * 100) / 100);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target, duration, delayMs]);
  return value;
}

export function DailyMetricGauge({
  score,
  displayValue,
  displayUnit,
  label,
  icon: Icon,
  delay = 0,
}: DailyMetricGaugeProps) {
  const safeScore = Math.max(0, Math.min(100, score));
  const color = colorForScore(safeScore);
  const animatedScore = useCountUp(safeScore, 1200, delay * 1000);

  // SVG geometry — 270° sweep (open at bottom), matching BioOptimizationGauge
  const size = 120;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const sweep = 270;
  const startAngle = 135;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweep / 360) * circumference;
  const fillLength = (animatedScore / 100) * arcLength;

  return (
    <div className="relative flex flex-col items-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E3054] to-[#141E33] p-3.5 transition-all hover:border-white/20">
      {/* Soft glow */}
      <div
        className="pointer-events-none absolute -top-6 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: color }}
      />

      {/* SVG gauge */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: `rotate(${startAngle}deg)` }}
        >
          {/* Track */}
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
          {/* Fill */}
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
            transition={{ duration: 1.2, ease: 'easeOut', delay }}
            style={{ filter: `drop-shadow(0 0 8px ${color}55)` }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.25 }}
            className="text-center"
          >
            <div
              className="text-xl font-bold leading-none sm:text-2xl"
              style={{ color }}
            >
              {displayValue}
            </div>
            {displayUnit && (
              <div className="mt-0.5 text-[9px] text-white/40">{displayUnit}</div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Metric label */}
      <div className="mt-2 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-white/40" strokeWidth={1.5} />}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
          {label}
        </p>
      </div>
    </div>
  );
}
