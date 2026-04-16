'use client';

import type { UnitSystem } from '@/lib/body-tracker/manual-input';

interface UnitToggleProps {
  value: UnitSystem;
  onChange: (u: UnitSystem) => void;
  labelImperial?: string;
  labelMetric?: string;
  ariaLabel?: string;
}

export function UnitToggle({
  value,
  onChange,
  labelImperial = 'lbs',
  labelMetric = 'kg',
  ariaLabel = 'Unit system',
}: UnitToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 text-xs"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === 'imperial'}
        onClick={() => onChange('imperial')}
        className={`px-3 py-1.5 rounded-md min-h-[32px] font-medium transition-colors ${
          value === 'imperial' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60 hover:text-white'
        }`}
      >
        {labelImperial}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'metric'}
        onClick={() => onChange('metric')}
        className={`px-3 py-1.5 rounded-md min-h-[32px] font-medium transition-colors ${
          value === 'metric' ? 'bg-[#2DA5A0]/20 text-[#2DA5A0]' : 'text-white/60 hover:text-white'
        }`}
      >
        {labelMetric}
      </button>
    </div>
  );
}
