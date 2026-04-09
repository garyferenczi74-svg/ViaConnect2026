'use client';

// BioOptimizationGauge — Hero radial SVG gauge for the consumer dashboard.
// Uses a 270° sweep (open at the bottom). Score color matches the project's
// 5-tier ranges. Animates the arc fill and counts up the score number.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus, ShieldCheck } from 'lucide-react';

interface BioOptimizationGaugeProps {
  score: number;
  previousScore?: number;
  tier: string;
  tierMultiplier?: number;
  hasCAQ?: boolean;
  hasLabs?: boolean;
  hasGenetics?: boolean;
  weeklyDelta?: number;
}

const colorForScore = (score: number): string => {
  if (score >= 91) return '#A855F7'; // Optimal
  if (score >= 76) return '#22C55E'; // Excellent
  if (score >= 51) return '#2DA5A0'; // Good
  if (score >= 26) return '#F59E0B'; // Building
  return '#EF4444'; // Needs Attention
};

const labelForScore = (score: number): string => {
  if (score >= 91) return 'OPTIMAL';
  if (score >= 76) return 'EXCELLENT';
  if (score >= 51) return 'GOOD';
  if (score >= 26) return 'BUILDING';
  return 'NEEDS ATTENTION';
};

const tierMultiplierLabel = (multiplier: number): string => {
  if (multiplier === 1.5) return '1.5×';
  if (multiplier === 2) return '2×';
  if (multiplier === 5) return '5×';
  return `${multiplier}×`;
};

// Count-up hook
function useCountUp(target: number, duration = 1500): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

export function BioOptimizationGauge({
  score,
  tier,
  tierMultiplier = 1,
  hasCAQ = true,
  hasLabs = false,
  hasGenetics = false,
  weeklyDelta = 0,
}: BioOptimizationGaugeProps) {
  const animated = useCountUp(score);
  const color = colorForScore(score);
  const label = labelForScore(score);

  // SVG geometry — 270° sweep (open at bottom)
  const size = 240;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const sweep = 270; // degrees
  const startAngle = 135; // bottom-left start
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweep / 360) * circumference;
  const fillLength = (score / 100) * arcLength;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1E3054] via-[#1A2744] to-[#141E33] p-5 sm:p-6 md:p-8">
      {/* Soft glow background */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: color }}
      />

      <div className="relative grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
        {/* ── Gauge SVG ─────────────────────────────────────── */}
        <div className="mx-auto flex flex-col items-center md:mx-0">
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
                transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                style={{ filter: `drop-shadow(0 0 12px ${color}66)` }}
              />
            </svg>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <div className="text-5xl font-bold text-white sm:text-6xl" style={{ color }}>
                  {animated}
                </div>
                <div className="mt-1 text-sm text-white/40">/ 100</div>
              </motion.div>
            </div>
          </div>

          <p
            className="mt-3 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color }}
          >
            {label}
          </p>
        </div>

        {/* ── Side panel ────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Bio Optimization Score
            </p>
            <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">
              Your score is{' '}
              <span style={{ color }}>{label.charAt(0) + label.slice(1).toLowerCase()}</span>
            </h2>
          </div>

          {/* Info chips */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {/* Weekly delta */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              {weeklyDelta > 0 ? (
                <TrendingUp className="h-4 w-4 flex-shrink-0 text-[#22C55E]" strokeWidth={1.5} />
              ) : weeklyDelta < 0 ? (
                <TrendingDown className="h-4 w-4 flex-shrink-0 text-[#EF4444]" strokeWidth={1.5} />
              ) : (
                <Minus className="h-4 w-4 flex-shrink-0 text-white/40" strokeWidth={1.5} />
              )}
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40">vs last week</p>
                <p className="text-sm font-semibold text-white">
                  {weeklyDelta > 0 ? '+' : ''}
                  {weeklyDelta} pts
                </p>
              </div>
            </div>

            {/* Tier */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${color}22`, border: `1px solid ${color}40` }}
              >
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Tier</p>
                <p className="truncate text-sm font-semibold text-white">
                  {tier} · {tierMultiplierLabel(tierMultiplier)}
                </p>
              </div>
            </div>

            {/* Confidence (highest achieved) */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/40">Confidence</p>
                <p className="text-sm font-semibold text-white">
                  {hasGenetics ? '96%' : hasLabs ? '86%' : hasCAQ ? '72%' : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Confidence pills */}
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-1 text-xs font-medium text-[#2DA5A0]">
              CAQ: 72%
            </span>
            {hasLabs ? (
              <span className="rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-1 text-xs font-medium text-[#2DA5A0]">
                Labs: 86%
              </span>
            ) : (
              <Link
                href="/shop"
                title="Add lab work to unlock 86% confidence"
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/40 transition-colors hover:border-white/20 hover:text-white/60"
              >
                Labs: 86% · unlock
              </Link>
            )}
            {hasGenetics ? (
              <span className="rounded-full border border-[#2DA5A0]/30 bg-[#2DA5A0]/15 px-3 py-1 text-xs font-medium text-[#2DA5A0]">
                Genetics: 96%
              </span>
            ) : (
              <Link
                href="/shop"
                title="Complete your genetic testing to unlock 96% confidence"
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/40 transition-colors hover:border-white/20 hover:text-white/60"
              >
                Genetics: 96% · unlock
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
