'use client';

// Prompt #85k + #85n + #157e: 12 finer-grained body-part score cards
// flanking the avatar. Square translucent layout with status-tinted
// fill matching the heat map glow on the avatar (#157d). Each card
// renders as an aspect-square pill with vertically-centered label,
// percentage, and status badge; the card's translucent fill +
// border tone tracks the badge color (green / yellow / red).
//
// Cards are status-driven via badgeMode prop:
//   - 'absolute' (fat default): label = SegmentStatus (Low / Standard
//     / High); color via getOvalColorFromStatus.
//   - 'change' (muscle default): label = directional change copy
//     (Muscle Gain / No Change / Muscle Loss); color via
//     getOvalColorFromChange.

import { TrendingUp, TrendingDown } from 'lucide-react';
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

const TINT_BG: Record<OvalColor, string> = {
  green:  'rgba(34, 197, 94, 0.12)',
  yellow: 'rgba(234, 179, 8, 0.12)',
  red:    'rgba(239, 68, 68, 0.12)',
};

const TINT_BORDER: Record<OvalColor, string> = {
  green:  'rgba(34, 197, 94, 0.30)',
  yellow: 'rgba(234, 179, 8, 0.30)',
  red:    'rgba(239, 68, 68, 0.30)',
};

export function BodyPartCallout({
  label,
  value,
  unit,
  status,
  change = null,
  metric = 'fat',
  isFirstEntry = false,
  badgeMode = 'absolute',
}: BodyPartCalloutProps) {
  const badge = buildBadge(status, change, metric, badgeMode);
  const badgeColor = OVAL_HEX[badge.color];
  const direction = getChangeDirection(change);
  const toneClass = getCalloutToneClass(direction, metric);

  const hasMagnitude = change !== null && Math.abs(change) >= CHANGE_THRESHOLD;
  const hasSubThreshold = change !== null && Math.abs(change) < CHANGE_THRESHOLD;
  const showFirstEntry = change === null && isFirstEntry;

  return (
    <div
      className="flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-lg p-2 text-center"
      style={{
        backgroundColor: TINT_BG[badge.color],
        border: `1px solid ${TINT_BORDER[badge.color]}`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="text-xs font-medium leading-tight text-white/70">{label}</div>
      <p className="text-lg font-semibold leading-tight text-white">
        {value.toFixed(1)}
        <span className="text-xs text-white/40"> {unit}</span>
      </p>
      <span
        className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight"
        style={{ color: badgeColor, backgroundColor: `${badgeColor}22`, borderColor: `${badgeColor}44` }}
      >
        {badge.label}
      </span>
      {hasMagnitude && (
        <div
          className={`flex items-center gap-1 text-[10px] leading-tight ${toneClass}`}
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
        <div className="text-[10px] leading-tight text-yellow-400/80" data-testid="callout-no-change">
          no change
        </div>
      )}
      {showFirstEntry && (
        <div className="text-[10px] leading-tight text-yellow-400/80" data-testid="callout-first-entry">
          first entry
        </div>
      )}
    </div>
  );
}
