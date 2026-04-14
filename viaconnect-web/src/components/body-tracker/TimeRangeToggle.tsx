'use client';

import { motion } from 'framer-motion';

interface TimeRangeToggleProps {
  value: 'D' | 'W' | 'M';
  onChange: (range: 'D' | 'W' | 'M') => void;
}

const OPTIONS: Array<{ key: 'D' | 'W' | 'M'; label: string }> = [
  { key: 'D', label: 'D' },
  { key: 'W', label: 'W' },
  { key: 'M', label: 'M' },
];

export function TimeRangeToggle({ value, onChange }: TimeRangeToggleProps) {
  return (
    <div className="relative flex gap-1 rounded-full bg-white/5 p-1">
      {OPTIONS.map((opt) => {
        const isActive = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="relative z-10 rounded-full px-4 py-1.5 text-xs font-medium transition-colors"
            style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.4)' }}
          >
            {isActive && (
              <motion.div
                layoutId="time-range-pill"
                className="absolute inset-0 rounded-full bg-[#1E3054]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
