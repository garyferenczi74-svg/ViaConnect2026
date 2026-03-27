'use client';

import { motion } from 'framer-motion';
import { HelixIcon } from './HelixIcon';

interface DailyActionRowProps {
  emoji: string;
  label: string;
  helix: number;
  completed: boolean;
  index?: number;
}

export function DailyActionRow({ emoji, label, helix, completed, index = 0 }: DailyActionRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: 'easeOut' }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        completed
          ? 'bg-[#2DA5A0]/10 border border-[#2DA5A0]/15'
          : 'bg-white/[0.02] border border-white/[0.04]'
      }`}
    >
      <span className="text-lg">{emoji}</span>
      {completed ? (
        <span className="text-xs text-[#2DA5A0] font-bold">✓</span>
      ) : (
        <span className="w-3.5 h-3.5 rounded-full border border-white/20" />
      )}
      <span
        className={`flex-1 text-[13px] font-medium ${
          completed ? 'text-white' : 'text-white/35'
        }`}
      >
        {label}
      </span>
      <div className="flex items-center gap-1">
        <HelixIcon size={12} />
        <span
          className={`text-[13px] font-bold ${
            completed ? 'text-[#2DA5A0]' : 'text-white/25'
          }`}
        >
          +{helix}
        </span>
      </div>
    </motion.div>
  );
}
