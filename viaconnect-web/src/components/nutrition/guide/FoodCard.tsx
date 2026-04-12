'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dna, FlaskConical, Pill } from 'lucide-react';
import type { FoodRecommendation } from '@/lib/agents/gordan/generateNutritionalGuide';

const PRIORITY_STYLES = {
  essential:    { label: 'Essential', color: '#22C55E' },
  recommended:  { label: 'Recommended', color: '#2DA5A0' },
  beneficial:   { label: 'Beneficial', color: '#F59E0B' },
};

export function FoodCard({ food }: { food: FoodRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const style = PRIORITY_STYLES[food.priority];

  return (
    <div className="rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{food.food}</p>
          <p className="mt-0.5 text-xs text-white/40">{food.frequency} · {food.servingSize}</p>
        </div>
        <span
          className="flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
          style={{ borderColor: `${style.color}50`, color: style.color, backgroundColor: `${style.color}1A` }}
        >
          {style.label}
        </span>
      </div>

      <button onClick={() => setExpanded(!expanded)} className="mt-2 text-xs text-[#2DA5A0]">
        {expanded ? 'Hide details' : 'Why this food?'}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 space-y-2 overflow-hidden"
          >
            {food.geneticReason && (
              <div className="flex items-start gap-2">
                <Dna className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#2DA5A0]" strokeWidth={1.5} />
                <p className="text-xs text-white/60">{food.geneticReason}</p>
              </div>
            )}
            {food.labReason && (
              <div className="flex items-start gap-2">
                <FlaskConical className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#B75E18]" strokeWidth={1.5} />
                <p className="text-xs text-white/60">{food.labReason}</p>
              </div>
            )}
            {food.supplementSynergy && (
              <div className="flex items-start gap-2">
                <Pill className="mt-0.5 h-3 w-3 flex-shrink-0 text-purple-400" strokeWidth={1.5} />
                <p className="text-xs text-white/60">{food.supplementSynergy}</p>
              </div>
            )}
            {food.nutrientsProvided.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {food.nutrientsProvided.map((n) => (
                  <span key={n} className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50">{n}</span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
