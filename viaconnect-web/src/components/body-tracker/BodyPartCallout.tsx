'use client';

// Prompt #85k: 12 finer-grained body-part callouts that flank the silhouette.
// Inherits the SegmentalCallout glassmorphism, swapping the 5-key label
// constraint for a free-form label (Neck, Shoulders, Chest, Waist, R. Bicep, etc.).

import { ChevronRight } from 'lucide-react';
import { STATUS_COLORS, type SegmentStatus } from '@/lib/body-tracker/calculations';

interface BodyPartCalloutProps {
  label: string;
  value: number;
  unit: string;
  status: SegmentStatus;
  position: 'left' | 'right';
}

export function BodyPartCallout({ label, value, unit, status, position }: BodyPartCalloutProps) {
  const color = STATUS_COLORS[status];
  return (
    <div
      className={`flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-[#1E3054]/80 p-3 backdrop-blur-sm ${
        position === 'right' ? 'flex-row-reverse text-right' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className={`flex items-center gap-1.5 text-xs text-white/60 ${position === 'right' ? 'justify-end' : ''}`}>
          <span>{label}</span>
          <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
        </div>
        <p className="mt-0.5 text-lg font-bold text-white">
          {value.toFixed(1)} <span className="text-xs text-white/40">{unit}</span>
        </p>
        <span
          className="mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={{ color, backgroundColor: `${color}22`, borderColor: `${color}44` }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
