// Prompt Brief 2: measurement-delta tests. Circumference only; omit nulls, never 0.

import { describe, it, expect } from 'vitest';
import { computeAbMeasurementDeltas } from '../abMeasurementDeltas';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import {
  emptyMeasurements,
  type CircumferenceMeasurements,
} from '@/lib/body-tracker/circumference';

function snapshot(overrides: Partial<CompositionSnapshot> = {}): CompositionSnapshot {
  return {
    entryId: 'e',
    source: 'scan',
    recordedAt: '2026-01-01T00:00:00Z',
    totalBodyFatPct: 22,
    regionFatPct: {
      right_arm: null,
      left_arm: null,
      trunk: null,
      right_leg: null,
      left_leg: null,
    },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: {
      right_arm: null,
      left_arm: null,
      trunk: null,
      right_leg: null,
      left_leg: null,
    },
    totalMuscleMassLbs: 80,
    skeletalMuscleMassLbs: null,
    ...overrides,
  };
}

function circ(overrides: Partial<CircumferenceMeasurements> = {}): CircumferenceMeasurements {
  return { ...emptyMeasurements(), ...overrides };
}

describe('computeAbMeasurementDeltas', () => {
  it('returns circumference deltas only (no body-fat or muscle rows)', () => {
    const rows = computeAbMeasurementDeltas({
      baselineComposition: snapshot({ totalBodyFatPct: 28, totalMuscleMassLbs: 70 }),
      latestComposition: snapshot({ totalBodyFatPct: 22, totalMuscleMassLbs: 80 }),
      baselineCircumferences: circ({ waist: 36, chest: 40 }),
      latestCircumferences: circ({ waist: 33, chest: 39 }),
      unit: 'in',
    });
    expect(rows.map((r) => r.key).sort()).toEqual(['chest', 'waist']);
    expect(rows.find((r) => r.key === 'waist')?.delta).toBe(-3);
  });

  it('omits a region when either side is UNKNOWN, never a 0 stand-in', () => {
    const rows = computeAbMeasurementDeltas({
      baselineComposition: snapshot(),
      latestComposition: snapshot(),
      baselineCircumferences: circ({ waist: 34, chest: null, neck: 15 }),
      latestCircumferences: circ({ waist: 32, chest: 40, neck: null }),
      unit: 'in',
    });
    const keys = rows.map((r) => r.key);
    expect(keys).toContain('waist');
    expect(keys).not.toContain('chest');
    expect(keys).not.toContain('neck');
    expect(rows.every((r) => r.from !== null && r.to !== null)).toBe(true);
  });

  it('preserves a real measured 0 (not skipped as UNKNOWN)', () => {
    const rows = computeAbMeasurementDeltas({
      baselineComposition: snapshot(),
      latestComposition: snapshot(),
      baselineCircumferences: circ({ waist: 0 }),
      latestCircumferences: circ({ waist: 2 }),
      unit: 'in',
    });
    const waist = rows.find((r) => r.key === 'waist');
    expect(waist).toBeDefined();
    expect(waist?.from).toBe(0);
    expect(waist?.delta).toBe(2);
  });

  it('returns an empty list when there is nothing to compare', () => {
    const rows = computeAbMeasurementDeltas({
      baselineComposition: null,
      latestComposition: snapshot(),
      baselineCircumferences: null,
      latestCircumferences: circ({ waist: 32 }),
      unit: 'in',
    });
    expect(rows).toEqual([]);
  });
});
