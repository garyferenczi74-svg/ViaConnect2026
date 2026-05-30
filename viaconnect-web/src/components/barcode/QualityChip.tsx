/**
 * Prompt 170l Phase 1c-2: Quality indicator chip (Hannah 11.4).
 *
 * Three variants: Nova food processing classification, NutriScore A-E
 * nutrition grade, Eco-Score A-E environmental grade. Each chip surfaces a
 * 4px LEFT color bar that encodes the grade without full-fill stop-sign
 * treatment per Hannah's anti-moralism architectural decision.
 *
 * Tap (mobile) or hover (desktop) opens a small inline popover with a
 * plain-language explanation of the value. Plain description; no shame.
 */

'use client';

import { useState } from 'react';

const TEAL = '#2DA5A0';
const NAVY_70 = 'rgba(26, 39, 68, 0.7)';
const NAVY_95 = 'rgba(26, 39, 68, 0.95)';
const CARD = '#1E3054';

type QualityKind = 'nova' | 'nutriscore' | 'ecoscore';

interface QualityChipProps {
  kind: QualityKind;
  value: number | string | null;
}

// Color bar by grade. Green-to-red ramp.
const NOVA_COLORS: Record<number, string> = {
  1: '#22C55E',
  2: '#84CC16',
  3: '#F59E0B',
  4: '#EF4444',
};

const SCORE_COLORS: Record<string, string> = {
  a: '#22C55E',
  b: '#84CC16',
  c: '#F59E0B',
  d: '#EA580C',
  e: '#EF4444',
};

const NOVA_DESCRIPTIONS: Record<number, string> = {
  1: 'Unprocessed or minimally processed food, typical of fresh produce, grains, eggs, and meat.',
  2: 'Processed culinary ingredient, typical of oils, butter, sugar, and salt used in cooking.',
  3: 'Processed food, typical of canned vegetables, cheese, freshly baked bread, and salted nuts.',
  4: 'Ultra-processed food, typical of packaged snacks, sodas, instant noodles, and ready-to-eat meals.',
};

const NUTRISCORE_DESCRIPTIONS: Record<string, string> = {
  a: 'Higher nutrition profile, typical of unprocessed and whole foods.',
  b: 'Moderately higher nutrition profile.',
  c: 'Mixed nutrition profile, balanced macronutrients.',
  d: 'Moderately lower nutrition profile, typical of foods higher in sugar, salt, or saturated fat.',
  e: 'Lower nutrition profile, typical of foods high in sugar, salt, or saturated fat.',
};

const ECOSCORE_DESCRIPTIONS: Record<string, string> = {
  a: 'Very low environmental impact.',
  b: 'Low environmental impact.',
  c: 'Moderate environmental impact.',
  d: 'High environmental impact.',
  e: 'Very high environmental impact.',
};

function labelFor(kind: QualityKind): string {
  switch (kind) {
    case 'nova': return 'PROCESSING';
    case 'nutriscore': return 'NUTRITION SCORE';
    case 'ecoscore': return 'ENVIRONMENT';
  }
}

function valueLabelFor(kind: QualityKind, value: number | string | null): string {
  if (value === null) return '—';
  if (kind === 'nova') {
    if (typeof value !== 'number') return '—';
    return `Group ${value}`;
  }
  if (typeof value === 'string') return value.toUpperCase();
  return '—';
}

function descriptionFor(kind: QualityKind, value: number | string | null): string {
  if (value === null) {
    return `${labelFor(kind)} classification not available for this product.`;
  }
  if (kind === 'nova' && typeof value === 'number') {
    return NOVA_DESCRIPTIONS[value] ?? `Group ${value}`;
  }
  if (kind === 'nutriscore' && typeof value === 'string') {
    return NUTRISCORE_DESCRIPTIONS[value.toLowerCase()] ?? `Score ${value.toUpperCase()}`;
  }
  if (kind === 'ecoscore' && typeof value === 'string') {
    return ECOSCORE_DESCRIPTIONS[value.toLowerCase()] ?? `Score ${value.toUpperCase()}`;
  }
  return '';
}

function barColorFor(kind: QualityKind, value: number | string | null): string {
  if (value === null) return 'rgba(26, 39, 68, 0.4)';
  if (kind === 'nova' && typeof value === 'number') {
    return NOVA_COLORS[value] ?? 'rgba(26, 39, 68, 0.4)';
  }
  if (typeof value === 'string') {
    return SCORE_COLORS[value.toLowerCase()] ?? 'rgba(26, 39, 68, 0.4)';
  }
  return 'rgba(26, 39, 68, 0.4)';
}

export function QualityChip({ kind, value }: QualityChipProps): JSX.Element {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const label = labelFor(kind);
  const valueLabel = valueLabelFor(kind, value);
  const description = descriptionFor(kind, value);
  const barColor = barColorFor(kind, value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPopoverOpen((s) => !s)}
        onBlur={() => setPopoverOpen(false)}
        aria-label={`${label}, ${valueLabel}. Tap for explanation.`}
        aria-haspopup="true"
        aria-expanded={popoverOpen}
        className="relative flex items-center gap-2 rounded-xl pl-3 pr-4 py-3 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2"
        style={{
          backgroundColor: 'rgba(30, 48, 84, 0.7)',
          minWidth: 104,
          height: 56,
          outlineColor: TEAL,
        }}
      >
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 rounded-l-xl"
          style={{ width: 4, backgroundColor: barColor }}
        />
        <span className="flex flex-col items-start gap-0.5">
          <span
            className="font-medium uppercase tracking-wide"
            style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.55)' }}
          >
            {label}
          </span>
          <span
            className="font-medium"
            style={{ fontSize: 14, color: '#FFFFFF' }}
          >
            {valueLabel}
          </span>
        </span>
      </button>
      {popoverOpen && (
        <div
          role="tooltip"
          aria-live="polite"
          className="absolute z-20 mt-1 rounded-lg p-3 shadow-lg"
          style={{
            backgroundColor: CARD,
            color: '#FFFFFF',
            width: 220,
            fontSize: 12,
            lineHeight: 1.4,
            border: `1px solid ${TEAL}`,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
}
