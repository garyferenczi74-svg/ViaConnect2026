'use client';

// Prompt #170 Phase 1l: confidence badge for items + meal.
//
// Renders a small pill with a status word and a colored dot:
//   high   Teal #2DA5A0
//   medium White/40
//   low    Orange #B75E18
//
// Used inline in MealItemCard + the AnalysisResult totals header.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import type { ConfidenceBand } from './types';

interface ConfidenceBadgeProps {
  band: ConfidenceBand;
  score?: number;
  label?: 'item' | 'meal';
  size?: 'sm' | 'md';
}

const BAND_COPY: Record<ConfidenceBand, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

const BAND_COLOR: Record<ConfidenceBand, string> = {
  high: '#2DA5A0',
  medium: 'rgba(255,255,255,0.6)',
  low: '#B75E18',
};

const BAND_BG: Record<ConfidenceBand, string> = {
  high: 'rgba(45,165,160,0.15)',
  medium: 'rgba(255,255,255,0.08)',
  low: 'rgba(183,94,24,0.18)',
};

export function ConfidenceBadge({ band, score, label = 'item', size = 'sm' }: ConfidenceBadgeProps) {
  const Icon = band === 'high' ? CheckCircle2 : band === 'low' ? AlertCircle : Circle;
  const px = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5';
  const text = size === 'md' ? 'text-xs' : 'text-[11px]';
  const iconSize = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  const pct = typeof score === 'number' ? Math.round(Math.max(0, Math.min(1, score)) * 100) : null;
  const ariaLabel = `${label === 'meal' ? 'Meal' : 'Item'} ${BAND_COPY[band]}${pct !== null ? `, ${pct} percent` : ''}`;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 rounded-full ${px} ${text} font-medium`}
      style={{
        backgroundColor: BAND_BG[band],
        color: BAND_COLOR[band],
      }}
      data-band={band}
    >
      <Icon className={iconSize} strokeWidth={1.5} />
      <span>{BAND_COPY[band]}</span>
      {pct !== null && (
        <span className="opacity-70">{pct}%</span>
      )}
    </span>
  );
}
