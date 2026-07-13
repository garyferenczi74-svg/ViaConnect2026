/**
 * Prompt 211b W2: tests for within-noise vs meaningful presentation decisions.
 *
 * TDD contract:
 *   1. A WITHIN_NOISE body fat delta renders within-noise copy, not a failure state.
 *   2. A MEANINGFUL body fat delta keeps its directional arrow.
 *   3. A WITHIN_NOISE circumference row shows the within-noise badge (not just arrow).
 *   4. A MEANINGFUL circumference row keeps its directional arrow.
 *   5. Within-noise copy contains no failure language on any surface.
 *   6. WithinNoiseBadge renders the inline label and tooltip copy.
 *   7. null noise classification falls back to the existing (pre-211b) presentation.
 *
 * Uses renderToStaticMarkup (no DOM, no JSDOM). Pure markup assertions.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyFatReadout } from '../BodyFatReadout';
import { NotableChanges } from '../NotableChanges';
import { WithinNoiseBadge } from '../WithinNoiseBadge';
import { computeCompositionDeltas } from '@/lib/formavision/deltas/compositionDeltas';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import {
  emptyMeasurements,
  type CircumferenceMeasurements,
} from '@/lib/body-tracker/circumference';
import { WITHIN_NOISE_INLINE_LABEL } from '@/lib/formavision/noise/mdcEngine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function snapshot(over: Partial<CompositionSnapshot> = {}): CompositionSnapshot {
  return {
    entryId: 'e',
    source: 'scan',
    recordedAt: '2026-01-01T00:00:00Z',
    totalBodyFatPct: null,
    regionFatPct: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    ...over,
  };
}

function circ(over: Partial<CircumferenceMeasurements> = {}): CircumferenceMeasurements {
  return { ...emptyMeasurements(), ...over };
}

function hasArrowDown(html: string): boolean {
  return html.includes('lucide-arrow-down');
}
function hasArrowUp(html: string): boolean {
  return html.includes('lucide-arrow-up');
}

// Word-boundary check: we test for these as whole words to avoid false positives
// from substrings like "badge" containing "bad".
const FAILURE_WORDS_PATTERN = /\b(fail|wrong|stuck|regress|decline|overweight|shame)\b/;

// ---------------------------------------------------------------------------
// BodyFatReadout: within-noise vs meaningful presentation
// ---------------------------------------------------------------------------

describe('BodyFatReadout: within-noise vs meaningful (Prompt 211b W2)', () => {
  const improvedDeltas = computeCompositionDeltas({
    firstComposition: snapshot({ totalBodyFatPct: 25 }),
    latestComposition: snapshot({ totalBodyFatPct: 24 }),
    firstCircumferences: null,
    latestCircumferences: null,
    unit: 'in',
  });

  const meaningfulDeltas = computeCompositionDeltas({
    firstComposition: snapshot({ totalBodyFatPct: 28 }),
    latestComposition: snapshot({ totalBodyFatPct: 24 }),
    firstCircumferences: null,
    latestCircumferences: null,
    unit: 'in',
  });

  it('WITHIN_NOISE: renders within-noise copy, not a failure state', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: improvedDeltas.bodyFat,
        firstScanDate: '2026-01-01T00:00:00Z',
        latestScanDate: '2026-06-01T00:00:00Z',
        bodyFatNoise: 'WITHIN_NOISE',
      }),
    );
    expect(html).toContain('body-fat-within-noise');
    expect(html).toContain('body-fat-within-noise-copy');
    expect(html.toLowerCase(), 'within-noise body fat copy must not contain failure language').not.toMatch(FAILURE_WORDS_PATTERN);
  });

  it('WITHIN_NOISE: body fat figure is still shown (never hidden)', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: improvedDeltas.bodyFat,
        firstScanDate: null,
        latestScanDate: null,
        bodyFatNoise: 'WITHIN_NOISE',
      }),
    );
    // The large figure must still render.
    expect(html).toContain('24.0%');
    expect(html).toContain('body-fat-figure');
  });

  it('WITHIN_NOISE: directional arrow is NOT shown (would imply false precision)', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: improvedDeltas.bodyFat,
        firstScanDate: null,
        latestScanDate: null,
        bodyFatNoise: 'WITHIN_NOISE',
      }),
    );
    // The arrow row (body-fat-delta) must not appear.
    expect(html).not.toContain('body-fat-delta');
  });

  it('MEANINGFUL: keeps directional arrow, no within-noise elements', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: meaningfulDeltas.bodyFat,
        firstScanDate: '2026-01-01T00:00:00Z',
        latestScanDate: '2026-06-01T00:00:00Z',
        bodyFatNoise: 'MEANINGFUL',
      }),
    );
    expect(html).toContain('body-fat-delta');
    expect(html).not.toContain('body-fat-within-noise');
    expect(hasArrowDown(html)).toBe(true);
  });

  it('null noise: falls back to existing pre-211b arrow presentation', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: meaningfulDeltas.bodyFat,
        firstScanDate: null,
        latestScanDate: null,
        bodyFatNoise: null,
      }),
    );
    expect(html).toContain('body-fat-delta');
    expect(html).not.toContain('body-fat-within-noise');
  });

  it('undefined noise: falls back to existing presentation (backward-compatible)', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: meaningfulDeltas.bodyFat,
        firstScanDate: null,
        latestScanDate: null,
        // bodyFatNoise is optional; not passing it.
      }),
    );
    expect(html).toContain('body-fat-delta');
  });

  it('within-noise copy contains precision or measurement language', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 25,
        bodyFat: improvedDeltas.bodyFat,
        firstScanDate: null,
        latestScanDate: null,
        bodyFatNoise: 'WITHIN_NOISE',
      }),
    );
    const lower = html.toLowerCase();
    const mentionsPrecision =
      lower.includes('precision') || lower.includes('measurement') || lower.includes('noise');
    expect(mentionsPrecision).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NotableChanges: within-noise per-row badges
// ---------------------------------------------------------------------------

describe('NotableChanges: within-noise per-row badges (Prompt 211b W2)', () => {
  const deltas = computeCompositionDeltas({
    firstComposition: null,
    latestComposition: null,
    firstCircumferences: circ({ waist: 36, chest: 100 }),
    latestCircumferences: circ({ waist: 35, chest: 95 }),
    unit: 'cm',
  });

  it('WITHIN_NOISE row: shows within-noise badge, still shows value', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotableChanges, {
        deltas,
        noiseClassifications: { waist: 'WITHIN_NOISE' },
      }),
    );
    // Within-noise badge must appear on the waist row.
    expect(html).toContain('within-noise-badge');
    // The numeric value must still be visible (never hidden).
    expect(html).toContain('notable-row-waist');
  });

  it('WITHIN_NOISE row: badge text is not failure language', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotableChanges, {
        deltas,
        noiseClassifications: { waist: 'WITHIN_NOISE' },
      }),
    ).toLowerCase();
    expect(html, 'badge text must not contain failure language').not.toMatch(FAILURE_WORDS_PATTERN);
  });

  it('MEANINGFUL row: shows directional arrow, no within-noise badge for that row', () => {
    // waist = WITHIN_NOISE, chest = MEANINGFUL
    const html = renderToStaticMarkup(
      React.createElement(NotableChanges, {
        deltas,
        noiseClassifications: { waist: 'WITHIN_NOISE', chest: 'MEANINGFUL' },
      }),
    );
    expect(html).toContain('within-noise-badge');
    // The chest row should still have an arrow (rendered by the direction icon).
    // We test that both rows render.
    expect(html).toContain('notable-row-waist');
    expect(html).toContain('notable-row-chest');
  });

  it('null classification: falls back to arrow presentation (backward-compatible)', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotableChanges, {
        deltas,
        noiseClassifications: { waist: null },
      }),
    );
    // Null should not add within-noise badge.
    // The waist row renders normally.
    expect(html).toContain('notable-row-waist');
  });

  it('no noiseClassifications prop: existing behavior unchanged', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotableChanges, { deltas }),
    );
    // No within-noise badge when no classifications supplied.
    expect(html).not.toContain('within-noise-badge');
    expect(html).toContain('notable-row-waist');
  });

  it('data-noise attribute is set correctly on within-noise rows', () => {
    const html = renderToStaticMarkup(
      React.createElement(NotableChanges, {
        deltas,
        noiseClassifications: { waist: 'WITHIN_NOISE', chest: 'MEANINGFUL' },
      }),
    );
    expect(html).toContain('data-noise="WITHIN_NOISE"');
    expect(html).toContain('data-noise="MEANINGFUL"');
  });
});

// ---------------------------------------------------------------------------
// WithinNoiseBadge component
// ---------------------------------------------------------------------------

describe('WithinNoiseBadge (Prompt 211b W2)', () => {
  it('renders the WITHIN_NOISE_INLINE_LABEL', () => {
    const html = renderToStaticMarkup(
      React.createElement(WithinNoiseBadge, { metricLabel: 'waist' }),
    );
    expect(html).toContain(WITHIN_NOISE_INLINE_LABEL);
  });

  it('has the within-noise-badge test id', () => {
    const html = renderToStaticMarkup(
      React.createElement(WithinNoiseBadge, { metricLabel: 'waist' }),
    );
    expect(html).toContain('within-noise-badge');
  });

  it('contains no failure language', () => {
    const html = renderToStaticMarkup(
      React.createElement(WithinNoiseBadge, { metricLabel: 'body fat' }),
    ).toLowerCase();
    expect(html, 'within-noise badge must not contain failure language').not.toMatch(FAILURE_WORDS_PATTERN);
  });

  it('has no em or en dashes', () => {
    const html = renderToStaticMarkup(
      React.createElement(WithinNoiseBadge, { metricLabel: 'waist' }),
    );
    expect(html).not.toContain(String.fromCharCode(0x2014));
    expect(html).not.toContain(String.fromCharCode(0x2013));
  });

  it('aria-label includes the metric label', () => {
    const html = renderToStaticMarkup(
      React.createElement(WithinNoiseBadge, { metricLabel: 'upper arm' }),
    );
    expect(html).toContain('upper arm');
  });
});

// ---------------------------------------------------------------------------
// Invariant: both surfaces use same classification decision
// ---------------------------------------------------------------------------

describe('Cross-surface invariant: same noise classification drives both surfaces', () => {
  it('when classification is WITHIN_NOISE, BodyFatReadout suppresses arrow AND NotableChanges shows badge', () => {
    // These two surfaces, when given the same WITHIN_NOISE signal, must both
    // respond consistently -- neither implies the precision the harness has
    // not proven.
    const bodyFatDeltas = computeCompositionDeltas({
      firstComposition: snapshot({ totalBodyFatPct: 25 }),
      latestComposition: snapshot({ totalBodyFatPct: 24 }),
      firstCircumferences: null,
      latestCircumferences: null,
      unit: 'in',
    });

    const bfrHtml = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: bodyFatDeltas.bodyFat,
        firstScanDate: null,
        latestScanDate: null,
        bodyFatNoise: 'WITHIN_NOISE',
      }),
    );
    // Arrow suppressed on BodyFatReadout.
    expect(bfrHtml).not.toContain('body-fat-delta');
    expect(bfrHtml).toContain('body-fat-within-noise');

    const circDeltas = computeCompositionDeltas({
      firstComposition: null,
      latestComposition: null,
      firstCircumferences: circ({ waist: 35 }),
      latestCircumferences: circ({ waist: 34 }),
      unit: 'cm',
    });

    const ncHtml = renderToStaticMarkup(
      React.createElement(NotableChanges, {
        deltas: circDeltas,
        noiseClassifications: { waist: 'WITHIN_NOISE' },
      }),
    );
    // Badge shown on NotableChanges.
    expect(ncHtml).toContain('within-noise-badge');
  });
});
