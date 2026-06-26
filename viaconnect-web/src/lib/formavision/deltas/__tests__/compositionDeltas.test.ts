// Prompt 210b P3-delta: tests for the pure latest-vs-first delta lib.

import { describe, it, expect } from 'vitest';
import {
  computeCompositionDeltas,
  CIRCUMFERENCE_EPSILON,
  type ComputeCompositionDeltasInput,
} from '../compositionDeltas';
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
    totalBodyFatPct: null,
    regionFatPct: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    visceralFatRating: null,
    bodyWaterPct: null,
    regionMuscleLbs: { right_arm: null, left_arm: null, trunk: null, right_leg: null, left_leg: null },
    totalMuscleMassLbs: null,
    skeletalMuscleMassLbs: null,
    ...overrides,
  };
}

function circ(overrides: Partial<CircumferenceMeasurements> = {}): CircumferenceMeasurements {
  return { ...emptyMeasurements(), ...overrides };
}

function baseInput(over: Partial<ComputeCompositionDeltasInput> = {}): ComputeCompositionDeltasInput {
  return {
    firstComposition: null,
    latestComposition: null,
    firstCircumferences: null,
    latestCircumferences: null,
    unit: 'in',
    ...over,
  };
}

describe('computeCompositionDeltas: body fat', () => {
  it('latest below first is improved with the correct signed delta', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstComposition: snapshot({ totalBodyFatPct: 28 }),
        latestComposition: snapshot({ totalBodyFatPct: 24 }),
      }),
    );
    expect(res.bodyFat).not.toBeNull();
    expect(res.bodyFat!.from).toBe(28);
    expect(res.bodyFat!.to).toBe(24);
    expect(res.bodyFat!.delta).toBe(-4);
    expect(res.bodyFat!.direction).toBe('improved');
  });

  it('latest above first is worsened', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstComposition: snapshot({ totalBodyFatPct: 22 }),
        latestComposition: snapshot({ totalBodyFatPct: 26 }),
      }),
    );
    expect(res.bodyFat!.direction).toBe('worsened');
    expect(res.bodyFat!.delta).toBe(4);
  });

  it('a sub-epsilon change is unchanged', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstComposition: snapshot({ totalBodyFatPct: 22.0 }),
        latestComposition: snapshot({ totalBodyFatPct: 22.1 }),
      }),
    );
    expect(res.bodyFat!.direction).toBe('unchanged');
  });

  it('is null when either side is UNKNOWN, never a 0 delta', () => {
    const onlyFirst = computeCompositionDeltas(
      baseInput({
        firstComposition: snapshot({ totalBodyFatPct: 25 }),
        latestComposition: snapshot({ totalBodyFatPct: null }),
      }),
    );
    expect(onlyFirst.bodyFat).toBeNull();

    const neither = computeCompositionDeltas(baseInput());
    expect(neither.bodyFat).toBeNull();
  });
});

describe('computeCompositionDeltas: circumferences', () => {
  it('orders by absolute delta descending and carries the unit', () => {
    const res = computeCompositionDeltas(
      baseInput({
        unit: 'cm',
        firstCircumferences: circ({ waist: 90, chest: 100, neck: 40 }),
        latestCircumferences: circ({ waist: 84, chest: 98, neck: 39 }),
      }),
    );
    // deltas: waist -6, chest -2, neck -1 -> order waist, chest, neck.
    expect(res.circumferences.map((c) => c.key)).toEqual(['waist', 'chest', 'neck']);
    expect(res.circumferences[0].unit).toBe('cm');
    expect(res.circumferences[0].delta).toBe(-6);
  });

  it('skips a region when either side is UNKNOWN', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstCircumferences: circ({ waist: 34, chest: null }),
        latestCircumferences: circ({ waist: 32, chest: 40 }),
      }),
    );
    const keys = res.circumferences.map((c) => c.key);
    expect(keys).toContain('waist');
    expect(keys).not.toContain('chest');
  });

  it('a girth reduction is improved and an increase is worsened', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstCircumferences: circ({ waist: 36, rightBicep: 14 }),
        latestCircumferences: circ({ waist: 33, rightBicep: 15 }),
      }),
    );
    const waist = res.circumferences.find((c) => c.key === 'waist')!;
    const bicep = res.circumferences.find((c) => c.key === 'rightBicep')!;
    expect(waist.direction).toBe('improved');
    expect(bicep.direction).toBe('worsened');
  });

  it('a sub-epsilon girth change is unchanged', () => {
    const tiny = CIRCUMFERENCE_EPSILON / 2;
    const res = computeCompositionDeltas(
      baseInput({
        firstCircumferences: circ({ waist: 34 }),
        latestCircumferences: circ({ waist: 34 + tiny }),
      }),
    );
    expect(res.circumferences[0].direction).toBe('unchanged');
  });

  it('returns no circumference deltas when either frame is missing', () => {
    const res = computeCompositionDeltas(
      baseInput({ firstCircumferences: circ({ waist: 34 }), latestCircumferences: null }),
    );
    expect(res.circumferences).toEqual([]);
  });
});

describe('computeCompositionDeltas: muscle', () => {
  it('a muscle gain is improved (opposite polarity from fat/girth)', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstComposition: snapshot({ totalMuscleMassLbs: 80 }),
        latestComposition: snapshot({ totalMuscleMassLbs: 85 }),
      }),
    );
    const total = res.muscle.find((m) => m.key === 'totalMuscleMassLbs')!;
    expect(total.delta).toBe(5);
    expect(total.direction).toBe('improved');
  });

  it('a muscle loss is worsened and UNKNOWN sides are omitted', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstComposition: snapshot({ totalMuscleMassLbs: 85, skeletalMuscleMassLbs: null }),
        latestComposition: snapshot({ totalMuscleMassLbs: 82, skeletalMuscleMassLbs: 70 }),
      }),
    );
    const total = res.muscle.find((m) => m.key === 'totalMuscleMassLbs')!;
    expect(total.direction).toBe('worsened');
    // skeletal first is null -> omitted.
    expect(res.muscle.find((m) => m.key === 'skeletalMuscleMassLbs')).toBeUndefined();
  });
});

describe('computeCompositionDeltas: biggest', () => {
  it('picks the largest magnitude change across body fat and circumference', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstComposition: snapshot({ totalBodyFatPct: 25 }),
        latestComposition: snapshot({ totalBodyFatPct: 23 }), // |2|
        firstCircumferences: circ({ waist: 38 }),
        latestCircumferences: circ({ waist: 31 }), // |7|
      }),
    );
    expect(res.biggest).not.toBeNull();
    expect(res.biggest!.kind).toBe('circumference');
    expect(res.biggest!.magnitude).toBe(7);
  });

  it('on an exact tie prefers body fat (Section 8 hero) over circumference', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstComposition: snapshot({ totalBodyFatPct: 25 }),
        latestComposition: snapshot({ totalBodyFatPct: 22 }), // |3|
        firstCircumferences: circ({ waist: 38 }),
        latestCircumferences: circ({ waist: 35 }), // |3|
      }),
    );
    expect(res.biggest!.kind).toBe('bodyFat');
  });

  it('is null when there is nothing known to compare', () => {
    const res = computeCompositionDeltas(baseInput());
    expect(res.biggest).toBeNull();
  });
});

describe('computeCompositionDeltas: purity and safety', () => {
  it('is deterministic for identical inputs', () => {
    const input = baseInput({
      firstComposition: snapshot({ totalBodyFatPct: 25, totalMuscleMassLbs: 80 }),
      latestComposition: snapshot({ totalBodyFatPct: 22, totalMuscleMassLbs: 84 }),
      firstCircumferences: circ({ waist: 36, chest: 40 }),
      latestCircumferences: circ({ waist: 33, chest: 39 }),
    });
    const a = computeCompositionDeltas(input);
    const b = computeCompositionDeltas(input);
    expect(a).toEqual(b);
  });

  it('produces no NaN from null handling', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstComposition: snapshot({ totalBodyFatPct: null }),
        latestComposition: snapshot({ totalBodyFatPct: null }),
        firstCircumferences: circ({ waist: null }),
        latestCircumferences: circ({ waist: null }),
      }),
    );
    expect(res.bodyFat).toBeNull();
    expect(res.circumferences).toEqual([]);
    expect(res.muscle).toEqual([]);
    expect(res.biggest).toBeNull();
  });

  it('preserves a real 0 measurement as a known value (not skipped as UNKNOWN)', () => {
    const res = computeCompositionDeltas(
      baseInput({
        firstCircumferences: circ({ waist: 2 }),
        latestCircumferences: circ({ waist: 0 }),
      }),
    );
    const waist = res.circumferences.find((c) => c.key === 'waist');
    expect(waist).toBeDefined();
    expect(waist!.to).toBe(0);
    expect(waist!.delta).toBe(-2);
  });
});
