'use client';

import { useId } from 'react';
import { FieldValidation } from './SanityValidator';
import type { SanityFieldKey } from '@/lib/body-tracker/manual-input';

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  placeholder?: string;
  step?: number | string;
  min?: number;
  max?: number;
  sanityField?: SanityFieldKey;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  autoFilled?: boolean;
  compact?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  placeholder,
  step = 'any',
  min,
  max,
  sanityField,
  hint,
  required,
  disabled,
  autoFilled,
  compact,
}: NumberFieldProps) {
  const id = useId();

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex items-center justify-between gap-2">
        <span className={`text-xs ${compact ? 'text-white/60' : 'font-semibold uppercase tracking-wider text-white/60'}`}>
          {label}
          {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
        </span>
        {autoFilled && <span className="text-[10px] text-[#2DA5A0]">auto</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          disabled={disabled}
          value={value === null || Number.isNaN(value) ? '' : value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '') return onChange(null);
            const n = parseFloat(v);
            onChange(Number.isFinite(n) ? n : null);
          }}
          className={`w-full rounded-lg border border-white/[0.08] bg-[#1A2744] py-2.5 pl-3 ${
            unit ? 'pr-12' : 'pr-3'
          } text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0] disabled:opacity-50`}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-white/45">{hint}</p>}
      {sanityField && <FieldValidation field={sanityField} value={value} />}
    </div>
  );
}
