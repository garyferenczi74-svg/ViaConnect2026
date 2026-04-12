'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { NutrientTarget } from '@/lib/agents/gordan/generateNutritionalGuide';

export function NutrientTargetBar({ target }: { target: NutrientTarget }) {
  const [expanded, setExpanded] = useState(false);
  const suppPct = Math.min(100, target.supplementCoverage);
  const isAdjusted = target.dailyTarget !== target.standardRDA;

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between text-left">
        <div>
          <p className="text-sm font-medium text-white">{target.nutrient}</p>
          <p className="text-xs text-white/40">
            {target.dailyTarget} {target.unit}
            {isAdjusted && (
              <span className="ml-1 text-[#2DA5A0]">({target.geneticAdjustment})</span>
            )}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} strokeWidth={1.5} />
      </button>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="flex h-full">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${suppPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full rounded-l-full bg-[#2DA5A0]"
          />
          {target.dietGap > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100 - suppPct, target.dietGap)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
              className="h-full bg-[#B75E18]/60"
            />
          )}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-white/40">
        <span>{suppPct}% from supplements</span>
        <span>{target.dietGap}% from diet</span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-white/60">{target.adjustmentReason}</p>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">Top food sources</p>
            {target.topFoodSources.map((s) => (
              <p key={s} className="text-xs text-white/50">{s}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
