'use client';

// Prompt #85k: 12 finer-grained body-part callouts that flank the silhouette.
// Inherits the SegmentalCallout glassmorphism, swapping the 5-key label
// constraint for a free-form label.
//
// Prompt #85n: optional change + metric + isFirstEntry props add a
// colored trend row that matches the avatar oval indicator tone for
// this region. Fat callouts color a positive change red (gain) and
// negative green (loss); muscle callouts invert (gain green, loss red).
// Sub-threshold and null changes render "no change" or "first entry"
// in muted yellow.
//
// Prompt #85n v3: the status badge now reads from the same green /
// yellow / red bucket as the avatar oval. badgeMode="absolute"
// (default) keeps the SegmentStatus label (Low / Standard / High) but
// recolors it via getOvalColorFromStatus. badgeMode="change" replaces
// the label with the change-direction copy (Muscle Gain / No Change /
// Muscle Loss for muscle, Fat Loss / No Change / Fat Gain for fat) and
// colors via getOvalColorFromChange.

import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { SegmentStatus } from '@/lib/body-tracker/calculations';
import {
  CHANGE_THRESHOLD,
  getCalloutToneClass,
  getChangeDirection,
  getOvalColorFromChange,
  getOvalColorFromStatus,
  OVAL_HEX,
  type Metric,
  type OvalColor,
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
  badgeMode?: 'absolute' | 'change';
}

interface BadgeFace {
  readonly label: string;
  readonly color: OvalColor;
}

function buildBadge(
  status: SegmentStatus,
  change: number | null,
  metric: Metric,
  badgeMode: 'absolute' | 'change',
): BadgeFace {
  if (badgeMode === 'absolute') {
    return { label: status, color: getOvalColorFromStatus(status) };
  }
  const color = getOvalColorFromChange(change, metric);
  if (color === 'yellow') {
    return { label: 'No Change', color };
  }
  if (metric === 'fat') {
    return { label: change !== null && change > 0 ? 'Fat Gain' : 'Fat Loss', color };
  }
  return { label: change !== null && change > 0 ? 'Muscle Gain' : 'Muscle Loss', color };
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
  badgeMode = 'absolute',
}: BodyPartCalloutProps) {
  const badge = buildBadge(status, change, metric, badgeMode);
  const badgeColor = OVAL_HEX[badge.color];
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
          style={{ color: badgeColor, backgroundColor: `${badgeColor}22`, borderColor: `${badgeColor}44` }}
        >
          {badge.label}
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
