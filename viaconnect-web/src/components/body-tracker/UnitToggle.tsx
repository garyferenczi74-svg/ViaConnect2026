'use client';

import { motion } from 'framer-motion';
import type { MeasurementUnit } from '@/lib/body-tracker/circumference';

interface UnitToggleProps {
  value: MeasurementUnit;
  onChange: (unit: MeasurementUnit) => void;
  layoutId?: string;
  ariaLabel?: string;
}

const OPTIONS: Array<{ key: MeasurementUnit; label: string }> = [
  { key: 'in', label: 'in' },
  { key: 'cm', label: 'cm' },
];

export function UnitToggle({
  value,
  onChange,
  layoutId = 'measurement-unit-toggle',
  ariaLabel = 'Measurement unit',
}: UnitToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="relative inline-flex gap-1 rounded-full bg-white/5 p-0.5"
    >
      {OPTIONS.map((opt) => {
        const isActive = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.key)}
            className="relative z-10 rounded-full px-3 py-1 text-xs font-medium transition-colors min-h-[32px]"
            style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.4)' }}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
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
