'use client';

import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';
import type { MealAnalysisResult } from '@/lib/nutrition/analyzeMeal';

const QUALITY_LABELS: Record<string, { label: string; color: string }> = {
  poor:      { label: 'Poor',      color: '#EF4444' },
  fair:      { label: 'Fair',      color: '#F59E0B' },
  good:      { label: 'Good',      color: '#2DA5A0' },
  excellent: { label: 'Excellent', color: '#22C55E' },
};

function qualityTier(score: number) {
  if (score >= 76) return QUALITY_LABELS.excellent;
  if (score >= 51) return QUALITY_LABELS.good;
  if (score >= 26) return QUALITY_LABELS.fair;
  return QUALITY_LABELS.poor;
}

function MacroBar({ label, grams, color, max }: {
  label: string; grams: number; color: string; max: number;
}) {
  const pct = Math.min(100, (grams / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 text-xs text-white/50">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-2 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="w-10 text-right text-xs text-white/70">{grams}g</span>
    </div>
  );
}

export function MealAnalysisCard({ analysis }: { analysis: MealAnalysisResult }) {
  const tier = qualityTier(analysis.mealQualityScore);

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40">Meal Quality</p>
          <p className="text-2xl font-bold text-white">
            {analysis.mealQualityScore}
            <span className="text-sm text-white/40">/100</span>
          </p>
        </div>
        <span
          className="rounded-full border px-2.5 py-1 text-xs font-semibold"
          style={{ borderColor: `${tier.color}60`, color: tier.color, backgroundColor: `${tier.color}1A` }}
        >
          {tier.label}
        </span>
      </div>

      <div className="rounded-lg bg-white/[0.04] p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-xs text-white/60">Estimated Calories</p>
          <div>
            <span className="text-xl font-bold text-white">{analysis.totals.calories}</span>
            <span className="ml-1 text-[10px] text-white/30">
              ({analysis.totals.calorieRange[0]}–{analysis.totals.calorieRange[1]})
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-1 rounded-full bg-[#2DA5A0]"
              style={{ width: `${Math.round(analysis.analysisConfidence * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-white/30">
            {Math.round(analysis.analysisConfidence * 100)}% confident
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <MacroBar label="Protein" grams={analysis.totals.protein} color="#2DA5A0" max={50} />
        <MacroBar label="Carbs" grams={analysis.totals.carbs} color="#B75E18" max={80} />
        <MacroBar label="Fat" grams={analysis.totals.fat} color="#F59E0B" max={40} />
        {analysis.totals.fiber > 0 && (
          <MacroBar label="Fiber" grams={analysis.totals.fiber} color="#22C55E" max={15} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Scale className="h-4 w-4 text-white/40" strokeWidth={1.5} />
        <p className="text-xs text-white/50">
          Portion: <span className="capitalize text-white/70">{analysis.portionAssessment.replace('_', ' ')}</span>
        </p>
      </div>

      {analysis.qualityFactors.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.qualityFactors.map((f) => (
            <span key={f} className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50">
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
