'use client';

// MilestoneGauge — circular gauge for a milestone, visually matching
// DailyScoreGauge (270° arc, glass card, glow, center text, label).
// Shows the milestone's grade in the center and its title below.

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { BadgeColors } from './AchievementBadge';

interface MilestoneGaugeProps {
  grade: string;
  title: string;
  colors: BadgeColors;
  size?: 'sm' | 'md';
  animate?: boolean;
  icon?: LucideIcon;
}

// Visual fill percentage per letter grade (fills the 270° arc).
// Does not replace the underlying grade data — only controls how much
// of the ring is drawn so the gauge feels alive.
const GRADE_PCT: Record<string, number> = {
  'A+': 100, 'A': 95,  'A-': 91,
  'B+': 88,  'B': 85,  'B-': 81,
  'C+': 78,  'C': 75,  'C-': 71,
  'D+': 68,  'D': 65,  'D-': 61,
  'F': 50,
};

function gradePct(grade: string): number {
  return GRADE_PCT[grade] ?? 75;
}

export function MilestoneGauge({
  grade,
  title,
  colors,
  size = 'md',
  animate = true,
  icon: GaugeIcon,
}: MilestoneGaugeProps) {
  const sz = size === 'sm' ? 100 : 120;
  const stroke = size === 'sm' ? 7 : 9;
  const radius = (sz - stroke) / 2;
  const center = sz / 2;
  const sweep = 270;
  const startAngle = 135;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweep / 360) * circumference;
  const fillLength = (gradePct(grade) / 100) * arcLength;

  return (
    <div className="relative flex flex-col items-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E3054]/60 to-[#141E33]/60 backdrop-blur-md p-3.5 transition-all hover:border-white/20">
      <div
        className="pointer-events-none absolute -top-6 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: colors.mid }}
      />

      <div className="relative" style={{ width: sz, height: sz }}>
        <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ transform: `rotate(${startAngle}deg)` }}>
          {/* Track */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Fill */}
          <motion.circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke={colors.mid}
            strokeWidth={stroke}
            strokeLinecap="round"
            initial={{ strokeDasharray: animate ? `0 ${circumference}` : `${fillLength} ${circumference}` }}
            animate={{ strokeDasharray: `${fillLength} ${circumference}` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${colors.mid}55)` }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-center"
          >
            <div
              className="text-2xl font-bold leading-none sm:text-3xl"
              style={{ color: colors.mid }}
            >
              {grade}
            </div>
            <div className="mt-0.5 text-[9px] text-white/40">grade</div>
          </motion.div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {GaugeIcon && (
          <GaugeIcon className="h-3 w-3" strokeWidth={1.5} style={{ color: colors.mid }} />
        )}
        <p
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: colors.mid }}
        >
          {title}
        </p>
      </div>
    </div>
  );
}
