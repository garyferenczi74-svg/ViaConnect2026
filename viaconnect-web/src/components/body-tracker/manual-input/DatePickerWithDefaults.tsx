'use client';

import { Calendar } from 'lucide-react';
import { isValidEntryDate } from '@/lib/body-tracker/manual-input';

interface DatePickerWithDefaultsProps {
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  label?: string;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function oneYearAgoIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DatePickerWithDefaults({
  value,
  onChange,
  id = 'entry-date',
  label = 'Date',
}: DatePickerWithDefaultsProps) {
  const max = todayIso();
  const min = oneYearAgoIso();

  const invalid = value && !isValidEntryDate(new Date(value));

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-white/60">
        {label}
      </label>
      <div className="relative">
        <Calendar
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50"
          strokeWidth={1.5}
        />
        <input
          id={id}
          type="date"
          value={value}
          max={max}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-white/[0.08] bg-[#1A2744] py-2.5 pl-10 pr-3 text-base text-white placeholder-white/30 focus:border-[#2DA5A0] focus:outline-none focus:ring-1 focus:ring-[#2DA5A0]"
        />
      </div>
      {invalid && (
        <p className="text-xs text-[#FCA5A5]">Date must be within the last year and not in the future.</p>
      )}
    </div>
  );
}

export { todayIso };
