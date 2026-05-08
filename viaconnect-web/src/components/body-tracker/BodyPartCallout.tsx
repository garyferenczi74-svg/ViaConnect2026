'use client';

// Prompt #85k: 12 finer-grained body-part callouts that flank the silhouette.
// Inherits the SegmentalCallout glassmorphism, swapping the 5-key label
// constraint for a free-form label (Neck, Shoulders, Chest, Waist, R. Bicep, etc.).
//
// Prompt #85n: optional change + metric + isFirstEntry props add a colored
// trend row that matches the avatar heat-map overlay tone for this region.
// Fat callouts color a positive change red (gain) and negative green (loss);
// muscle callouts invert (gain green, loss red). Sub-threshold and null
// changes render "no change" or "first entry" in muted yellow.

import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { STATUS_COLORS, type SegmentStatus } from '@/lib/body-tracker/calculations';
import {
  CHANGE_THRESHOLD,
  getCalloutToneClass,
  getChangeDirection,
  type Metric,
} from '@/lib/body-tracker/heatmap-colors';

interface BodyPartCalloutProps {
  label: string;
  value: number;
  unit: string;
  status: SegmentStatus;
  position: 'left' | 'right';
  change?: number | null;
  metric?: Metric;
  isFirstEntry?: boolean;
}

export function BodyPartCallout({
  label,
  value,
  unit,
  status,
  position,
  change = null,
  metric = 'fat',
  isFirstEntry = false,
}: BodyPartCalloutProps) {
  const color = STATUS_COLORS[status];
  const direction = getChangeDirection(change);
  const toneClass = getCalloutToneClass(direction, metric);
  const rightAlign = position === 'right';

  const hasMagnitude = change !== null && Math.abs(change) >= CHANGE_THRESHOLD;
  const hasSubThreshold = change !== null && Math.abs(change) < CHANGE_THRESHOLD;
  const showFirstEntry = change === null && isFirstEntry;

  return (
    <div
      className={`flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-[#1E3054]/80 p-3 backdrop-blur-sm ${
        rightAlign ? 'flex-row-reverse text-right' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className={`flex items-center gap-1.5 text-xs text-white/60 ${rightAlign ? 'justify-end' : ''}`}>
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
        {hasMagnitude && (
          <div
            className={`mt-0.5 flex items-center gap-1 text-[10px] ${toneClass} ${rightAlign ? 'justify-end' : ''}`}
            data-testid="callout-change"
          >
            {(change as number) > 0
              ? <TrendingUp className="h-2.5 w-2.5" strokeWidth={1.5} />
              : <TrendingDown className="h-2.5 w-2.5" strokeWidth={1.5} />}
            <span>
              {(change as number) > 0 ? '+' : ''}
              {(change as number).toFixed(1)}{unit}
            </span>
          </div>
        )}
        {hasSubThreshold && (
          <div
            className={`mt-0.5 text-[10px] text-yellow-400/80 ${rightAlign ? 'text-right' : ''}`}
            data-testid="callout-no-change"
          >
            no change
          </div>
        )}
        {showFirstEntry && (
          <div
            className={`mt-0.5 text-[10px] text-yellow-400/80 ${rightAlign ? 'text-right' : ''}`}
            data-testid="callout-first-entry"
          >
            first entry
          </div>
        )}
      </div>
    </div>
  );
}
