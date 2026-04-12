'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dna, AlertTriangle, ChevronDown } from 'lucide-react';
import type { FoodAvoidance } from '@/lib/agents/gordan/generateNutritionalGuide';

const SEVERITY_STYLES = {
  avoid:   { label: 'Avoid', color: '#EF4444', dot: 'bg-red-400' },
  limit:   { label: 'Limit', color: '#F59E0B', dot: 'bg-yellow-400' },
  caution: { label: 'Caution', color: '#B75E18', dot: 'bg-[#B75E18]' },
};

export function AvoidanceCard({ item }: { item: FoodAvoidance }) {
  const [expanded, setExpanded] = useState(false);
  const style = SEVERITY_STYLES[item.severity];

  return (
    <div className={`rounded-xl border bg-[#1E3054]/60 backdrop-blur-md p-4`}
      style={{ borderColor: `${style.color}30` }}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${style.dot}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{item.food}</p>
            <p className="mt-0.5 text-xs" style={{ color: style.color }}>{style.label}</p>
          </div>
        </div>
        <ChevronDown
          className={`mt-1 h-4 w-4 flex-shrink-0 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            <p className="text-xs text-white/60">{item.reason}</p>

            {item.geneticBasis && (
              <div className="flex items-center gap-1.5">
                <Dna className="h-3 w-3 text-[#2DA5A0]" strokeWidth={1.5} />
                <span className="text-[10px] text-[#2DA5A0]">{item.geneticBasis}</span>
              </div>
            )}
            {item.allergyBasis && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-red-400" strokeWidth={1.5} />
                <span className="text-[10px] text-red-400">{item.allergyBasis}</span>
              </div>
            )}

            {item.alternatives.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wider text-white/30">Alternatives</p>
                <div className="flex flex-wrap gap-1">
                  {item.alternatives.map((alt) => (
                    <span key={alt} className="rounded-full bg-[#2DA5A0]/10 px-2 py-0.5 text-[10px] text-[#2DA5A0]">{alt}</span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
