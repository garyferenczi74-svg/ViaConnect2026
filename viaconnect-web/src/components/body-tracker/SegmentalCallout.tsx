'use client';

import { ChevronRight } from 'lucide-react';
import { STATUS_COLORS, type SegmentStatus } from '@/lib/body-tracker/calculations';

type SegmentKey = 'right_arm' | 'left_arm' | 'trunk' | 'right_leg' | 'left_leg';

const SEGMENT_LABELS: Record<SegmentKey, string> = {
  right_arm: 'Right Arm',
  left_arm: 'Left Arm',
  trunk: 'Trunk',
  right_leg: 'Right Leg',
  left_leg: 'Left Leg',
};

interface SegmentalCalloutProps {
  segment: SegmentKey;
  value: number;
  unit: string;
  status: SegmentStatus;
  position: 'left' | 'right';
  onClick?: () => void;
}

export function SegmentalCallout({ segment, value, unit, status, position, onClick }: SegmentalCalloutProps) {
  const color = STATUS_COLORS[status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-[#1E3054]/80 p-3 backdrop-blur-sm transition-all hover:border-white/20 ${
        position === 'right' ? 'flex-row-reverse text-right' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-white/60">
          <span>{SEGMENT_LABELS[segment]}</span>
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
    </button>
  );
}

export type { SegmentKey };
