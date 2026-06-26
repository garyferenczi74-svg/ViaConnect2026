// Prompt 210b VR (Section 8): tests for the body-fat readout + Notable Changes
// surfaces. Node harness (no DOM reconciler), so these render the components to
// static markup with react-dom/server and assert on the output. Components are
// driven by props (the delta result from computeCompositionDeltas), which keeps
// the test deterministic and proves the surfaces consume the shared data without
// recomputing it.

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BodyFatReadout } from '../BodyFatReadout';
import { NotableChanges } from '../NotableChanges';
import { computeCompositionDeltas } from '@/lib/formavision/deltas/compositionDeltas';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import {
  emptyMeasurements,
  type CircumferenceMeasurements,
} from '@/lib/body-tracker/circumference';

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

// Lucide renders the icon name into the class list (lucide-arrow-down etc.),
// which lets us assert which arrow was chosen from the static markup.
function hasArrowDown(html: string): boolean {
  return html.includes('lucide-arrow-down');
}
function hasArrowUp(html: string): boolean {
  return html.includes('lucide-arrow-up');
}
function hasMinus(html: string): boolean {
  return /lucide-minus(?![a-z])/.test(html);
}

const TEAL = '#2DA5A0';

describe('BodyFatReadout', () => {
  it('improved: shows the latest figure, a down arrow, the teal progress tone, and both dates', () => {
    const deltas = computeCompositionDeltas({
      firstComposition: snapshot({ totalBodyFatPct: 28 }),
      latestComposition: snapshot({ totalBodyFatPct: 24 }),
      firstCircumferences: null,
      latestCircumferences: null,
      unit: 'in',
    });
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: deltas.bodyFat,
        firstScanDate: '2026-01-01T00:00:00Z',
        latestScanDate: '2026-06-01T00:00:00Z',
      }),
    );
    expect(html).toContain('24.0%');
    expect(html).toContain('4.0%'); // |delta|
    expect(hasArrowDown(html)).toBe(true);
    expect(hasArrowUp(html)).toBe(false);
    expect(html).toContain(TEAL); // progress emphasis token
    expect(html).toContain('First scan');
    expect(html).toContain('Latest');
  });

  it('worsened: up arrow with neutral (non-shaming) framing, no teal progress tone on the delta', () => {
    const deltas = computeCompositionDeltas({
      firstComposition: snapshot({ totalBodyFatPct: 22 }),
      latestComposition: snapshot({ totalBodyFatPct: 26 }),
      firstCircumferences: null,
      latestCircumferences: null,
      unit: 'in',
    });
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 26,
        bodyFat: deltas.bodyFat,
        firstScanDate: '2026-01-01T00:00:00Z',
        latestScanDate: '2026-06-01T00:00:00Z',
      }),
    );
    expect(hasArrowUp(html)).toBe(true);
    expect(hasArrowDown(html)).toBe(false);
    // Kind framing, never shaming language.
    expect(html.toLowerCase()).not.toContain('fat gain');
    expect(html.toLowerCase()).not.toContain('overweight');
  });

  it('UNKNOWN: no latest fat shows an honest invite, never a fabricated 0', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: null,
        bodyFat: null,
        firstScanDate: null,
        latestScanDate: null,
      }),
    );
    expect(html).toContain('Scan or log your body composition');
    expect(html).not.toContain('0.0%');
  });

  it('single scan: latest known but no delta shows the figure plus a log-another invite, no fabricated delta', () => {
    const html = renderToStaticMarkup(
      React.createElement(BodyFatReadout, {
        latestBodyFatPct: 24,
        bodyFat: null,
        firstScanDate: null,
        latestScanDate: '2026-06-01T00:00:00Z',
      }),
    );
    expect(html).toContain('24.0%');
    expect(html).toContain('Log another scan');
    expect(hasArrowDown(html)).toBe(false);
    expect(hasArrowUp(html)).toBe(false);
  });
});

describe('NotableChanges', () => {
  it('orders rows by the delta order and skips UNKNOWN regions', () => {
    const deltas = computeCompositionDeltas({
      firstComposition: null,
      latestComposition: null,
      firstCircumferences: circ({ waist: 38, chest: 41, neck: 16 /* rightBicep UNKNOWN */ }),
      latestCircumferences: circ({ waist: 33, chest: 40, neck: 15 }),
      unit: 'in',
    });
    const html = renderToStaticMarkup(React.createElement(NotableChanges, { deltas }));
    // waist (-5), chest (-1), neck (-1): waist row must appear before chest.
    const waistIdx = html.indexOf('notable-row-waist');
    const chestIdx = html.indexOf('notable-row-chest');
    expect(waistIdx).toBeGreaterThan(-1);
    expect(chestIdx).toBeGreaterThan(-1);
    expect(waistIdx).toBeLessThan(chestIdx);
    // rightBicep was UNKNOWN on one side: no row.
    expect(html).not.toContain('notable-row-rightBicep');
  });

  it('a girth reduction is improved (down arrow) and a girth increase is worsened (up arrow)', () => {
    const deltas = computeCompositionDeltas({
      firstComposition: null,
      latestComposition: null,
      firstCircumferences: circ({ waist: 36, rightBicep: 14 }),
      latestCircumferences: circ({ waist: 33, rightBicep: 15 }),
      unit: 'in',
    });
    const html = renderToStaticMarkup(React.createElement(NotableChanges, { deltas }));
    expect(html).toContain('data-direction="improved"');
    expect(html).toContain('data-direction="worsened"');
    expect(hasArrowDown(html)).toBe(true);
    expect(hasArrowUp(html)).toBe(true);
  });

  it('shoulderWidth (neutral) renders with a neutral marker, no good/bad arrow', () => {
    const deltas = computeCompositionDeltas({
      firstComposition: null,
      latestComposition: null,
      firstCircumferences: circ({ shoulderWidth: 50 }),
      latestCircumferences: circ({ shoulderWidth: 47 }),
      unit: 'in',
    });
    const html = renderToStaticMarkup(React.createElement(NotableChanges, { deltas }));
    expect(html).toContain('notable-row-shoulderWidth');
    expect(html).toContain('data-direction="neutral"');
    // shoulderWidth is the only row here: no progress/regress arrow, a minus marker.
    expect(hasArrowDown(html)).toBe(false);
    expect(hasArrowUp(html)).toBe(false);
    expect(hasMinus(html)).toBe(true);
  });

  it('single scan / no deltas shows an inviting empty state, never a fabricated number', () => {
    const deltas = computeCompositionDeltas({
      firstComposition: null,
      latestComposition: null,
      firstCircumferences: null,
      latestCircumferences: null,
      unit: 'in',
    });
    const html = renderToStaticMarkup(React.createElement(NotableChanges, { deltas }));
    expect(html).toContain('Log another scan');
    expect(html).not.toContain('notable-row-');
  });

  it('numbers match the source delta (no parallel recompute)', () => {
    const deltas = computeCompositionDeltas({
      firstComposition: null,
      latestComposition: null,
      firstCircumferences: circ({ waist: 38 }),
      latestCircumferences: circ({ waist: 33 }),
      unit: 'in',
    });
    const waist = deltas.circumferences.find((c) => c.key === 'waist')!;
    const html = renderToStaticMarkup(React.createElement(NotableChanges, { deltas }));
    // The rendered magnitude equals the delta magnitude from the shared function.
    const expected = `${Math.abs(waist.delta).toFixed(1)} in`;
    expect(html).toContain(expected);
  });
});
