'use client';

// Prompt #160 section 9: animated analyzing state. Pulsing Sparkles icon,
// "Gordan is analyzing your meal..." subtitle.

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function AnalyzingState({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        className="rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 p-4"
      >
        <Sparkles className="h-8 w-8 text-[#2DA5A0]" strokeWidth={1.5} />
      </motion.div>
      <p className="mt-4 text-sm font-medium text-white">Gordan is analyzing your meal...</p>
      {subtitle && <p className="mt-1 text-xs text-white/40">{subtitle}</p>}
    </div>
  );
}
