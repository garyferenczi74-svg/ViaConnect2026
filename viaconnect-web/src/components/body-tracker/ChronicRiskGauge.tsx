'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import type { RiskTrend } from '@/lib/body-tracker/chronic-risk-types';
import { gradeFromOverallScore } from '@/lib/body-tracker/chronic-risk-types';

interface ChronicRiskGaugeProps {
  score: number | null;
  grade: string | null;
  trend?: RiskTrend;
  description?: string | null;
}

// Gradient stops mirror Body Score's red to teal palette so users have a
// consistent radial-gauge visual language across both surfaces.
function colorForScore(score: number): string {
  if (score >= 80) return '#2DA5A0';
  if (score >= 60) return '#7CA982';
  if (score >= 40) return '#D4A14F';
  if (score >= 20) return '#B75E18';
  return '#8C2D2D';
}

export function ChronicRiskGauge({ score, grade, trend = 'stable', description }: ChronicRiskGaugeProps) {
  const safeScore = typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 0;
  const displayGrade = grade ?? (typeof score === 'number' ? gradeFromOverallScore(safeScore) : '?');
  const arcColor = colorForScore(safeScore);

  // Half-circle arc from -180 to 0 degrees.
  const radius = 90;
  const cx = 110;
  const cy = 110;
  const circumference = Math.PI * radius;
  const filled = (safeScore / 100) * circumference;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendLabel = trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable';

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/5 backdrop-blur-md p-5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">
          Chronic Risk Indicators
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] text-white/50">
          <Info className="h-3 w-3" strokeWidth={1.5} />
          Informational only
        </span>
      </div>

      <div className="flex flex-col items-center">
        <svg viewBox="0 0 220 130" className="w-full max-w-[260px]" aria-label="Chronic risk gauge">
          <path
            d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0 1 ${cx + radius},${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={14}
            strokeLinecap="round"
          />
          <motion.path
            d={`M ${cx - radius},${cy} A ${radius},${radius} 0 0 1 ${cx + radius},${cy}`}
            fill="none"
            stroke={arcColor}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - filled }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          <text
            x={cx}
            y={cy - 12}
            textAnchor="middle"
            className="fill-white"
            style={{ fontSize: 36, fontWeight: 700 }}
          >
            {displayGrade}
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            className="fill-white/60"
            style={{ fontSize: 12 }}
          >
            {typeof score === 'number' ? `${Math.round(safeScore)} of 100` : 'No data'}
          </text>
        </svg>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-white/70">
          <TrendIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>{trendLabel}</span>
        </div>

        {description ? (
          <p className="mt-3 text-center text-xs text-white/70 leading-relaxed">
            {description}
          </p>
        ) : null}

        <p className="mt-3 text-center text-[11px] text-white/45 leading-relaxed">
          These indicators are areas to discuss with your healthcare provider; not a diagnosis.
        </p>
      </div>
    </div>
  );
}
