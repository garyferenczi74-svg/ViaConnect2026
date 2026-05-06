'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { MeasurementUnit } from '@/lib/body-tracker/circumference';

interface MeasurementCardProps {
  label: string;
  value: number | null;
  previousValue: number | null;
  unit: MeasurementUnit;
}

export function MeasurementCard({ label, value, previousValue, unit }: MeasurementCardProps) {
  if (value === null) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/5 p-3">
        <p className="text-xs uppercase tracking-wider text-white/50 font-medium">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-white/20">·</p>
        <p className="mt-1 text-xs text-white/20">Not yet logged</p>
      </div>
    );
  }

  const diff = previousValue !== null ? Math.round((value - previousValue) * 10) / 10 : null;
  const isFirstEntry = previousValue === null;
  const hasChange = diff !== null && diff !== 0;
  const magnitude = diff !== null ? Math.abs(diff).toFixed(1) : null;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/5 p-3">
      <p className="text-xs uppercase tracking-wider text-white/50 font-medium">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-semibold text-white">{value.toFixed(1)}</span>
        <span className="text-sm text-white/40">{unit}</span>
      </p>
      <div className="mt-1 flex items-center gap-1 text-xs">
        {isFirstEntry && <span className="text-white/20">first entry</span>}
        {!isFirstEntry && !hasChange && <span className="text-white/30">no change</span>}
        {!isFirstEntry && hasChange && diff! > 0 && (
          <>
            <TrendingUp size={14} strokeWidth={1.5} className="text-[#2DA5A0]" />
            <span className="text-[#2DA5A0]">{magnitude} {unit}</span>
          </>
        )}
        {!isFirstEntry && hasChange && diff! < 0 && (
          <>
            <TrendingDown size={14} strokeWidth={1.5} className="text-[#B75E18]" />
            <span className="text-[#B75E18]">{magnitude} {unit}</span>
          </>
        )}
      </div>
    </div>
  );
}
