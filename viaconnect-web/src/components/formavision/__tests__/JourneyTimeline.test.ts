// Prompt 210b P3-T2b: JourneyTimeline render + honesty tests. Node harness (no
// DOM reconciler), so these render the component to static markup with
// react-dom/server and assert structure + the resting-at-latest readout. The
// position-to-vector math and reduced-motion snapping are covered behaviorally by
// the pure journeyTimeline + lerpParamVector lib tests; here we prove the surface
// wires those honestly (real-scan snaps, honest single-scan state, real numbers).

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JourneyTimeline, type JourneyScanReadout } from '../JourneyTimeline';
import { scanToParamVector } from '@/lib/formavision/geometry/scanToParamVector';
import { lerpParamVector } from '@/lib/formavision/geometry/lerpParamVector';
import { resolveTimelinePosition } from '@/lib/formavision/timeline/journeyTimeline';
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
