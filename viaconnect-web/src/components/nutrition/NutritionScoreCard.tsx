'use client';

import { Apple } from 'lucide-react';
import { motion } from 'framer-motion';

interface NutritionScoreCardProps {
  score: number;
  mealsLoggedToday: number;
}

const colorForScore = (score: number): string => {
  if (score >= 76) return '#22C55E';
  if (score >= 51) return '#2DA5A0';
  if (score >= 26) return '#F59E0B';
  return '#EF4444';
};

export function NutritionScoreCard({ score, mealsLoggedToday }: NutritionScoreCardProps) {
  const color = colorForScore(score);
  const pct = Math.min(100, Math.max(0, score));

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/35 backdrop-blur-md p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Apple className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          <h2 className="text-base font-bold text-white">Nutrition Score</h2>
        </div>
        <span className="text-2xl font-bold" style={{ color }}>{score}<span className="text-sm text-white/40">/100</span></span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <p className="mt-2 text-xs text-white/40">
        Based on {mealsLoggedToday} meal{mealsLoggedToday !== 1 ? 's' : ''} logged today
      </p>
    </div>
  );
}
