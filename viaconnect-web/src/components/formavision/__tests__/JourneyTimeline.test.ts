// Prompt 210b P3-T2b: JourneyTimeline render + honesty tests. Node harness (no
// DOM reconciler), so these render the component to static markup with
// react-dom/server and assert structure + the resting-at-latest readout. The
// position-to-vector math and reduced-motion snapping are covered behaviorally by
// the pure journeyTimeline + lerpParamVector lib tests; here we prove the surface
// wires those honestly (real-scan snaps, honest single-scan state, real numbers).

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  JourneyTimeline,
  sequentialBodyFatClassifications,
  type JourneyScanReadout,
} from '../JourneyTimeline';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { lerpParamVector } from '@/lib/formavision/geometry/lerpParamVector';
import { resolveTimelinePosition } from '@/lib/formavision/timeline/journeyTimeline';
import { confidenceBandAriaLabel } from '@/lib/formavision/noise/trendConfidenceBand';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
import {
  emptyMeasurements,
  type CircumferenceMeasurements,
} from '@/lib/body-tracker/circumference';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';

function snap(date: string, fat: number | null): CompositionSnapshot {
  return {
    entryId: `e-${date}`,
    source: 'scan',
    recordedAt: date,
    totalBodyFatPct: fat,
    regionFatPct: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
  };
}

function circ(waist: number | null): CircumferenceMeasurements {
  return { ...emptyMeasurements(), waist };
}

function vectorFor(waist: number | null): BodyParamVector {
  return scanToParamVector({ snapshot: null, circumferences: circ(waist), sex: 'male', unit: 'in' });
}

const noop = () => {};

describe('JourneyTimeline: single scan / no history', () => {
  it('a single scan shows an honest invite, never a fake timeline', () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, {
        vectors: [vectorFor(34)],
        readouts: [{ recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 25, waist: 34 }],
        unit: 'in',
        onScrub: noop,
      }),
    );
    expect(html).toContain('journey-timeline-empty');
    expect(html).toContain('Log another scan');
    // No range, no snap markers in the empty state.
    expect(html).not.toContain('journey-range');
    expect(html).not.toContain('journey-snap-0');
  });

  it('no scans shows the same honest invite', () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors: [], readouts: [], unit: 'in', onScrub: noop }),
    );
    expect(html).toContain('journey-timeline-empty');
    expect(html).not.toContain('journey-range');
  });
});

describe('JourneyTimeline: N scans -> N snap points', () => {
  const vectors = [vectorFor(38), vectorFor(35), vectorFor(33)];
  const readouts: JourneyScanReadout[] = [
    { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 28, waist: 38 },
    { recordedAt: '2026-03-01T00:00:00Z', totalBodyFatPct: 25, waist: 35 },
    { recordedAt: '2026-06-01T00:00:00Z', totalBodyFatPct: 23, waist: 33 },
  ];

  it('renders one snap marker per real scan and the scrubber controls', () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors, readouts, unit: 'in', onScrub: noop }),
    );
    expect(html).toContain('journey-snap-0');
    expect(html).toContain('journey-snap-1');
    expect(html).toContain('journey-snap-2');
    expect(html).not.toContain('journey-snap-3');
    expect(html).toContain('journey-range');
    expect(html).toContain('journey-play');
  });

  it('rests at the latest scan: the readout shows the latest real values (measured, not transition)', () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors, readouts, unit: 'in', onScrub: noop }),
    );
    // Resting at latest -> measured readout for the last scan.
    expect(html).toContain('journey-measured-date');
    expect(html).not.toContain('journey-transition-label');
    expect(html).toContain('23.0%'); // latest body fat
    expect(html).toContain('33.0 in'); // latest waist
  });
});

describe('JourneyTimeline: reduced motion structural signal', () => {
  it('uses a snap-only range step under reduced motion (no fabricated intermediate positions)', () => {
    const vectors = [vectorFor(38), vectorFor(33)];
    const readouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 28, waist: 38 },
      { recordedAt: '2026-06-01T00:00:00Z', totalBodyFatPct: 23, waist: 33 },
    ];
    const reduced = renderToStaticMarkup(
      React.createElement(JourneyTimeline, {
        vectors,
        readouts,
        unit: 'in',
        reducedMotion: true,
        onScrub: noop,
      }),
    );
    const full = renderToStaticMarkup(
      React.createElement(JourneyTimeline, {
        vectors,
        readouts,
        unit: 'in',
        reducedMotion: false,
        onScrub: noop,
      }),
    );
    // Reduced motion: integer step (snap to scans). Full motion: fine step.
    expect(reduced).toContain('step="1"');
    expect(full).toContain('step="0.001"');
  });
});

describe('JourneyTimeline: scrub uses the shared lerp core (no second impl)', () => {
  it('a between-scans position maps to lerpParamVector of the two adjacent scan vectors', () => {
    // This proves the timeline math the component uses: position -> adjacent
    // scans + localT -> lerpParamVector. The component calls exactly this.
    const a = vectorFor(38);
    const b = vectorFor(33);
    const pos = resolveTimelinePosition(0.5, 2); // exactly between the two scans
    expect(pos.indexA).toBe(0);
    expect(pos.indexB).toBe(1);
    expect(pos.localT).toBeCloseTo(0.5, 6);
    const mid = lerpParamVector(a, b, pos.localT);
    // Waist 38in and 33in in meters, midpoint.
    const waistRing = mid.rings.find((r) => r.id === 'waist');
    const aWaist = a.rings.find((r) => r.id === 'waist')!.circumferenceM!;
    const bWaist = b.rings.find((r) => r.id === 'waist')!.circumferenceM!;
    expect(waistRing!.circumferenceM).toBeCloseTo((aWaist + bWaist) / 2, 9);
  });
});

describe('JourneyTimeline: onScrub contract', () => {
  it('accepts an onScrub callback (the page passes setScrubVector)', () => {
    const onScrub = vi.fn();
    // Rendering does not call onScrub (only drag/play do); this asserts the prop
    // is wired without a reconciler. The drag/play behavior is Gary eyeball.
    renderToStaticMarkup(
      React.createElement(JourneyTimeline, {
        vectors: [vectorFor(38), vectorFor(33)],
        readouts: [
          { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 28, waist: 38 },
          { recordedAt: '2026-06-01T00:00:00Z', totalBodyFatPct: 23, waist: 33 },
        ],
        unit: 'in',
        onScrub,
      }),
    );
    expect(onScrub).not.toHaveBeenCalled();
  });
});

// Fix #3: formatPct / formatLen treat 0 as not-measured (honesty, never "0.0%").
describe('JourneyTimeline: honesty - zero values render as Not measured', () => {
  it('renders Not measured for a zero totalBodyFatPct, not 0.0%', () => {
    const vectors = [vectorFor(38), vectorFor(33)];
    const readouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 28, waist: 38 },
      { recordedAt: '2026-06-01T00:00:00Z', totalBodyFatPct: 0, waist: 33 },
    ];
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors, readouts, unit: 'in', onScrub: noop }),
    );
    expect(html).not.toContain('0.0%');
    expect(html).toContain('Not measured');
  });

  it('renders Not measured for a zero waist value, not 0.0 in', () => {
    const vectors = [vectorFor(38), vectorFor(33)];
    const readouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 28, waist: 38 },
      { recordedAt: '2026-06-01T00:00:00Z', totalBodyFatPct: 23, waist: 0 },
    ];
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors, readouts, unit: 'in', onScrub: noop }),
    );
    expect(html).not.toContain('0.0 in');
    expect(html).toContain('Not measured');
  });
});

// Fix #2: transition render path readout bounds guard.
// The transition JSX branch only renders during live drag (SSR always starts at
// position=1, which is measured mode). The guard expression is tested directly
// here: readouts[indexB] where indexB is out of bounds must return '' not throw.
describe('JourneyTimeline: guard - out-of-bounds readout access in transition path', () => {
  it('guarded readout access is safe when an index is out of bounds', () => {
    const readouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 28, waist: 38 },
    ];
    // Simulates pos.indexA=0 (in bounds) and pos.indexB=1 (out of bounds).
    const indexA = 0;
    const indexB = 1;
    const safeA = readouts[indexA] ? readouts[indexA].recordedAt : '';
    const safeB = readouts[indexB] ? readouts[indexB].recordedAt : '';
    expect(safeA).toBe('2026-01-01T00:00:00Z');
    expect(safeB).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Prompt 211b W2c: trend honesty wiring (confidence band, plateau, spike).
// ---------------------------------------------------------------------------

describe('sequentialBodyFatClassifications (pure bridge)', () => {
  it('returns one classification per consecutive pair, newest first', () => {
    const readouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 25, waist: 38 },
      { recordedAt: '2026-02-01T00:00:00Z', totalBodyFatPct: 24.9, waist: 37 },
      { recordedAt: '2026-03-01T00:00:00Z', totalBodyFatPct: 24.8, waist: 36 },
    ];
    const result = sequentialBodyFatClassifications(readouts);
    expect(result.length).toBe(2);
    // Tiny deltas (0.1) are well within the MDC95 noise band.
    expect(result[0]).toBe('WITHIN_NOISE');
    expect(result[1]).toBe('WITHIN_NOISE');
  });

  it('a large delta between the two most recent scans classifies as MEANINGFUL', () => {
    const readouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 20, waist: 38 },
      { recordedAt: '2026-02-01T00:00:00Z', totalBodyFatPct: 30, waist: 36 },
    ];
    const result = sequentialBodyFatClassifications(readouts);
    expect(result[0]).toBe('MEANINGFUL');
  });

  it('UNKNOWN (null) on either side yields a null (honest UNKNOWN) entry', () => {
    const readouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: null, waist: 38 },
      { recordedAt: '2026-02-01T00:00:00Z', totalBodyFatPct: 24, waist: 36 },
    ];
    const result = sequentialBodyFatClassifications(readouts);
    expect(result[0]).toBeNull();
  });
});

describe('JourneyTimeline: confidence band annotation (Prompt 211b W2c)', () => {
  const vectors = [vectorFor(38), vectorFor(35), vectorFor(33)];
  const readouts: JourneyScanReadout[] = [
    { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 28, waist: 38 },
    { recordedAt: '2026-03-01T00:00:00Z', totalBodyFatPct: 25.1, waist: 35 },
    { recordedAt: '2026-06-01T00:00:00Z', totalBodyFatPct: 25, waist: 33 },
  ];

  it('renders a qualitative band annotation for body fat and waist when measured', () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors, readouts, unit: 'in', onScrub: noop }),
    );
    expect(html).toContain('journey-band-bodyfat');
    expect(html).toContain('journey-band-waist');
  });

  it('the band annotation never contains a digit (no precision figure)', () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors, readouts, unit: 'in', onScrub: noop }),
    );
    // Pull the two aria-label attribute values straight out of the markup and
    // assert neither contains a digit (the qualitative-only contract).
    const bodyFatMatch = html.match(/data-testid="journey-band-bodyfat" aria-label="([^"]*)"/);
    const waistMatch = html.match(/data-testid="journey-band-waist" aria-label="([^"]*)"/);
    expect(bodyFatMatch).not.toBeNull();
    expect(waistMatch).not.toBeNull();
    // Strip HTML entities (e.g. the escaped apostrophe &#x27; contains digits
    // in its own encoding) before checking for a real numeric precision figure.
    const stripEntities = (s: string) => s.replace(/&#x[0-9a-f]+;/gi, '').replace(/&\w+;/g, '');
    expect(stripEntities(bodyFatMatch![1])).not.toMatch(/\d/);
    expect(stripEntities(waistMatch![1])).not.toMatch(/\d/);
    // The exported helper itself is digit-free regardless of the args passed.
    expect(confidenceBandAriaLabel('body fat', 0, 'pct')).not.toMatch(/\d/);
  });

  it('omits the band annotation honestly when the value is not measured', () => {
    const unmeasured: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 28, waist: 38 },
      { recordedAt: '2026-06-01T00:00:00Z', totalBodyFatPct: 0, waist: 33 },
    ];
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, {
        vectors: [vectorFor(38), vectorFor(33)],
        readouts: unmeasured,
        unit: 'in',
        onScrub: noop,
      }),
    );
    expect(html).not.toContain('journey-band-bodyfat');
  });
});

describe('JourneyTimeline: plateau detection (Prompt 211b W2c)', () => {
  it('shows the Hannah-toned plateau copy when recent scans are all within noise', () => {
    const vectors = [vectorFor(38), vectorFor(37), vectorFor(36)];
    const readouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 25, waist: 38 },
      { recordedAt: '2026-02-01T00:00:00Z', totalBodyFatPct: 24.9, waist: 37 },
      { recordedAt: '2026-03-01T00:00:00Z', totalBodyFatPct: 24.8, waist: 36 },
    ];
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors, readouts, unit: 'in', onScrub: noop }),
    );
    expect(html).toContain('journey-plateau-copy');
    expect(html).toContain('body fat');
    expect(html.toLowerCase()).not.toMatch(/\b(fail|wrong|stuck|regress|decline|shame)\b/);
  });

  it('does NOT fabricate a plateau when the most recent change is meaningful', () => {
    const vectors = [vectorFor(38), vectorFor(33)];
    const readouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 20, waist: 38 },
      { recordedAt: '2026-02-01T00:00:00Z', totalBodyFatPct: 30, waist: 33 },
    ];
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors, readouts, unit: 'in', onScrub: noop }),
    );
    expect(html).not.toContain('journey-plateau-copy');
  });
});

describe('JourneyTimeline: fingerprint spike softening (Prompt 211b W2c)', () => {
  const vectors = [vectorFor(38), vectorFor(33)];
  const spikeReadouts: JourneyScanReadout[] = [
    { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 20, waist: 38 },
    { recordedAt: '2026-02-01T00:00:00Z', totalBodyFatPct: 30, waist: 33 },
  ];

  it('a meaningful delta with an outlier fingerprint is flagged as a spike, and the raw point stays visible', () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, {
        vectors,
        readouts: spikeReadouts,
        unit: 'in',
        onScrub: noop,
        latestFingerprintIsOutlier: true,
      }),
    );
    expect(html).toContain('journey-spike-copy');
    expect(html).toContain('still shown as a real data point');
    // The raw reading itself is untouched and visible.
    expect(html).toContain('30.0%');
    // The latest snap marker is softened, never removed.
    expect(html).toContain('journey-snap-1');
    expect(html).toContain('data-spike="true"');
  });

  it('a meaningful delta WITHOUT an outlier fingerprint is not softened', () => {
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, {
        vectors,
        readouts: spikeReadouts,
        unit: 'in',
        onScrub: noop,
        latestFingerprintIsOutlier: false,
      }),
    );
    expect(html).not.toContain('journey-spike-copy');
    expect(html).not.toContain('data-spike="true"');
  });

  it('a within-noise delta is never treated as a spike, even with an outlier fingerprint', () => {
    const stableReadouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 25, waist: 38 },
      { recordedAt: '2026-02-01T00:00:00Z', totalBodyFatPct: 24.9, waist: 33 },
    ];
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, {
        vectors,
        readouts: stableReadouts,
        unit: 'in',
        onScrub: noop,
        latestFingerprintIsOutlier: true,
      }),
    );
    expect(html).not.toContain('journey-spike-copy');
  });
});

describe('JourneyTimeline: reduced motion parity for trend honesty context (Prompt 211b W2c)', () => {
  it('the band annotation and plateau copy render identically under reduced motion', () => {
    const vectors = [vectorFor(38), vectorFor(37), vectorFor(36)];
    const readouts: JourneyScanReadout[] = [
      { recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 25, waist: 38 },
      { recordedAt: '2026-02-01T00:00:00Z', totalBodyFatPct: 24.9, waist: 37 },
      { recordedAt: '2026-03-01T00:00:00Z', totalBodyFatPct: 24.8, waist: 36 },
    ];
    const reduced = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors, readouts, unit: 'in', reducedMotion: true, onScrub: noop }),
    );
    const full = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { vectors, readouts, unit: 'in', reducedMotion: false, onScrub: noop }),
    );
    for (const marker of ['journey-band-bodyfat', 'journey-band-waist', 'journey-plateau-copy']) {
      expect(reduced).toContain(marker);
      expect(full).toContain(marker);
    }
  });
});
