/**
 * Task 211b-W4b: cycle phase-context labeling on JourneyTimeline.
 *
 * TDD contract (from the task brief):
 *   1. latestWaistNoiseResult (pure helper): classifies the latest scan-over-scan
 *      waist delta; null on fewer than two scans or an UNKNOWN waist value.
 *   2. Opt-out (or absent cycleContext): the trend is unchanged -- no phase
 *      context copy is ever rendered, and the waist number is untouched.
 *   3. Opt-in + phase-typical (luteal/menstrual, MEANINGFUL waist increase):
 *      the phase-context label is present AND the underlying waist number is
 *      preserved exactly (never reframed as gain/loss, never hidden).
 *   4. Unknown phase while opted in: still unchanged (no label).
 *   5. Reduced-motion parity: the phase-context copy renders identically
 *      whether reducedMotion is true or false (it's static copy, not animated).
 *
 * Uses renderToStaticMarkup (no DOM, no @testing-library), matching the
 * repo's other node-safe render tests for this component family.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  JourneyTimeline,
  latestWaistNoiseResult,
  type JourneyScanReadout,
} from '../JourneyTimeline';
import type { BodyParamVector } from '@/lib/formavision/geometry/types';
import type { CyclePhaseAwareContext } from '@/lib/formavision/noise/cyclePhaseAware';

const MOCK_VECTOR: BodyParamVector = {
  sex: 'male',
  heightM: 1.75,
  rings: [],
  arms: [],
};

function readout(over: Partial<JourneyScanReadout>): JourneyScanReadout {
  return {
    recordedAt: '2026-01-01T00:00:00Z',
    totalBodyFatPct: null,
    waist: null,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// latestWaistNoiseResult: pure helper
// ---------------------------------------------------------------------------

describe('latestWaistNoiseResult', () => {
  it('fewer than two readouts -> null', () => {
    expect(latestWaistNoiseResult([readout({ waist: 80 })], 'cm')).toBeNull();
  });

  it('either waist UNKNOWN (null) on the latest pair -> null (never fabricated)', () => {
    const readouts = [
      readout({ recordedAt: '2026-01-01T00:00:00Z', waist: 80 }),
      readout({ recordedAt: '2026-02-01T00:00:00Z', waist: null }),
    ];
    expect(latestWaistNoiseResult(readouts, 'cm')).toBeNull();
  });

  it('a MEANINGFUL waist increase (5cm on a 3cm torso tolerance) classifies MEANINGFUL, worsened', () => {
    const readouts = [
      readout({ recordedAt: '2026-01-01T00:00:00Z', waist: 80 }),
      readout({ recordedAt: '2026-02-01T00:00:00Z', waist: 85 }),
    ];
    const result = latestWaistNoiseResult(readouts, 'cm');
    expect(result).not.toBeNull();
    expect(result!.classification).toBe('MEANINGFUL');
    expect(result!.delta.direction).toBe('worsened');
    expect(result!.delta.from).toBe(80);
    expect(result!.delta.to).toBe(85);
  });

  it('only uses the LATEST pair, ignoring earlier history', () => {
    const readouts = [
      readout({ recordedAt: '2026-01-01T00:00:00Z', waist: 100 }), // huge earlier swing, irrelevant
      readout({ recordedAt: '2026-02-01T00:00:00Z', waist: 80 }),
      readout({ recordedAt: '2026-03-01T00:00:00Z', waist: 80.1 }), // tiny latest change
    ];
    const result = latestWaistNoiseResult(readouts, 'cm');
    expect(result!.delta.from).toBe(80);
    expect(result!.delta.to).toBe(80.1);
    expect(result!.classification).toBe('WITHIN_NOISE');
  });

  it('a small change within the CIRCUMFERENCE_EPSILON is "unchanged" direction, still classified (not thrown away)', () => {
    const readouts = [
      readout({ recordedAt: '2026-01-01T00:00:00Z', waist: 80 }),
      readout({ recordedAt: '2026-02-01T00:00:00Z', waist: 80.05 }),
    ];
    const result = latestWaistNoiseResult(readouts, 'cm');
    expect(result).not.toBeNull();
    expect(result!.delta.direction).toBe('unchanged');
  });
});

// ---------------------------------------------------------------------------
// JourneyTimeline: cycle phase context wiring
// ---------------------------------------------------------------------------

function renderTimeline(cycleContext?: CyclePhaseAwareContext, reducedMotion = false): string {
  const vectors: BodyParamVector[] = [MOCK_VECTOR, MOCK_VECTOR];
  const readouts: JourneyScanReadout[] = [
    readout({ recordedAt: '2026-01-01T00:00:00Z', totalBodyFatPct: 20, waist: 80 }),
    readout({ recordedAt: '2026-02-01T00:00:00Z', totalBodyFatPct: 20, waist: 85 }),
  ];
  return renderToStaticMarkup(
    React.createElement(JourneyTimeline, {
      vectors,
      readouts,
      unit: 'cm',
      reducedMotion,
      onScrub: () => {},
      cycleContext,
    }),
  );
}

describe('JourneyTimeline: cycle phase context (opt-out unchanged)', () => {
  it('no cycleContext prop at all: no phase-context copy, waist number rendered exactly as scanned', () => {
    const html = renderTimeline(undefined);
    expect(html).not.toContain('journey-phase-context-copy');
    expect(html).toContain('85.0 cm');
  });

  it('opted out (optIn: false) even with a water-retention phase: unchanged, no label', () => {
    const html = renderTimeline({ optIn: false, phase: 'luteal' });
    expect(html).not.toContain('journey-phase-context-copy');
    expect(html).toContain('85.0 cm');
  });

  it('opted in but phase unknown: unchanged, no label', () => {
    const html = renderTimeline({ optIn: true, phase: 'unknown' });
    expect(html).not.toContain('journey-phase-context-copy');
    expect(html).toContain('85.0 cm');
  });

  it('opted in but phase is follicular (not a water-retention phase): unchanged, no label', () => {
    const html = renderTimeline({ optIn: true, phase: 'follicular' });
    expect(html).not.toContain('journey-phase-context-copy');
  });
});

describe('JourneyTimeline: cycle phase context (opt-in, phase-typical)', () => {
  it('opted in + luteal phase + MEANINGFUL waist increase: phase-context label present, waist number preserved exactly', () => {
    const html = renderTimeline({ optIn: true, phase: 'luteal' });
    expect(html).toContain('journey-phase-context-copy');
    // The waist number is NEVER reframed or hidden: exactly the scanned value.
    expect(html).toContain('85.0 cm');
    expect(html.toLowerCase()).toContain('can be typical for your current cycle phase');
  });

  it('opted in + menstrual phase: phase-context label present too', () => {
    const html = renderTimeline({ optIn: true, phase: 'menstrual' });
    expect(html).toContain('journey-phase-context-copy');
  });

  it('phase-context copy never reframes the change as a judged gain or loss', () => {
    const html = renderTimeline({ optIn: true, phase: 'luteal' }).toLowerCase();
    expect(html).not.toContain('you gained');
    expect(html).not.toContain('weight gain');
  });

  it('reduced-motion parity: the phase-context label renders identically with reducedMotion true or false', () => {
    const withMotion = renderTimeline({ optIn: true, phase: 'luteal' }, false);
    const reduced = renderTimeline({ optIn: true, phase: 'luteal' }, true);
    const extract = (html: string) => html.match(/data-testid="journey-phase-context-copy"[^]*?<\/p>/)?.[0];
    expect(extract(withMotion)).toBe(extract(reduced));
  });

  it('no em or en dash in the phase-context copy', () => {
    const html = renderTimeline({ optIn: true, phase: 'luteal' });
    const block = html.match(/data-testid="journey-phase-context-copy"[^]*?<\/p>/)?.[0] ?? '';
    expect(block.includes(String.fromCharCode(0x2014))).toBe(false);
    expect(block.includes(String.fromCharCode(0x2013))).toBe(false);
  });
});
