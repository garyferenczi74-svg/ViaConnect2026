'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export interface BadgeColors {
  light: string;
  mid: string;
  dark: string;
  text: string;
}

interface AchievementBadgeProps {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  colors?: BadgeColors;
}

const SIZES = { sm: 40, md: 80, lg: 120 };

const DEFAULT_COLORS: BadgeColors = {
  light: '#FBBF24',
  mid: '#F59E0B',
  dark: '#D97706',
  text: '#78350F',
};

function ConfettiParticle({ delay, angle }: { delay: number; angle: number }) {
  const colors = ['#2DA5A0', '#B75E18', '#FFD700', '#FFFFFF'];
  return (
    <motion.div
      className="absolute h-2 w-2 rounded-full"
      style={{ backgroundColor: colors[Math.floor(Math.random() * 4)], top: '50%', left: '50%' }}
      initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      animate={{ opacity: 0, scale: 0.5, x: Math.cos(angle) * 120, y: Math.sin(angle) * 120 - 40 }}
      transition={{ duration: 1.2, delay, ease: 'easeOut' }}
    />
  );
}

export function AchievementBadge({ grade, size = 'lg', animated = true, colors = DEFAULT_COLORS }: AchievementBadgeProps) {
  const px = SIZES[size];
  const fontSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-sm';
  const starSize = size === 'lg' ? 16 : size === 'md' ? 12 : 8;
  const showConfetti = animated && grade.startsWith('A');

  return (
    <div className="relative flex items-center justify-center" style={{ width: px, height: px }}>
      {showConfetti && (
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <ConfettiParticle key={i} delay={i * 0.05} angle={(Math.PI * 2 * i) / 20} />
          ))}
        </div>
      )}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="flex flex-col items-center justify-center rounded-full shadow-lg"
        style={{
          width: px,
          height: px,
          background: `radial-gradient(circle at 40% 35%, ${colors.light}, ${colors.mid}, ${colors.dark})`,
          boxShadow: `0 10px 15px -3px ${colors.mid}4D, 0 4px 6px -4px ${colors.mid}4D`,
        }}
      >
        <Star style={{ width: starSize, height: starSize, color: `${colors.text}99` }} strokeWidth={1.5} />
        <span className={`font-bold ${fontSize}`} style={{ color: colors.text }}>{grade}</span>
      </motion.div>
    </div>
  );
}
