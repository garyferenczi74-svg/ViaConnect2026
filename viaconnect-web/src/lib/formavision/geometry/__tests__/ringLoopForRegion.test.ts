import { describe, it, expect } from 'vitest';
import { ringLoopForRegion } from '../ringLoopForRegion';
import { polygonPerimeter } from '../ellipse';
import type { BodyParamVector } from '../types';

function paramWith(chestM: number | null, estimated = false): BodyParamVector {
  return {
    sex: 'male',
    heightM: 1.8,
    rings: [
      { id: 'chest', levelN: 0.72, circumferenceM: chestM, aspectRatio: 0.72, estimated },
      { id: 'waist', levelN: 0.62, circumferenceM: 0.85, aspectRatio: 0.78, estimated: false },
    ],
    arms: [
      { side: 'r', bicepM: 0.32, forearmM: 0.27, estimated: false },
      { side: 'l', bicepM: 0.32, forearmM: 0.27, estimated: false },
    ],
  };
}

describe('ringLoopForRegion', () => {
  it('returns the requested number of ordered points', () => {
    const loop = ringLoopForRegion(paramWith(1.0), 'chest', 48);
    expect(loop.points).toHaveLength(48);
  });

  it('places the ring at the region level height (levelN * heightM)', () => {
    const loop = ringLoopForRegion(paramWith(1.0), 'chest');
    expect(loop.levelN).toBe(0.72);
    expect(loop.y).toBeCloseTo(0.72 * 1.8, 6);
  });

  it('sizes the ring to the measured circumference (the ring is the number)', () => {
    const small = ringLoopForRegion(paramWith(0.9), 'chest');
    const large = ringLoopForRegion(paramWith(1.2), 'chest');
    // A larger measured circumference yields a larger ring perimeter and radius.
    expect(polygonPerimeter(large.points)).toBeGreaterThan(
      polygonPerimeter(small.points),
    );
    const largeRadius = Math.max(...large.points.map((p) => Math.abs(p.x)));
    const smallRadius = Math.max(...small.points.map((p) => Math.abs(p.x)));
    expect(largeRadius).toBeGreaterThan(smallRadius);
  });

  it('the loop perimeter matches the measured circumference closely', () => {
    const loop = ringLoopForRegion(paramWith(1.05), 'chest', 96);
    expect(polygonPerimeter(loop.points)).toBeCloseTo(1.05, 2);
    expect(loop.circumferenceM).toBeCloseTo(1.05, 6);
    expect(loop.estimated).toBe(false);
  });

  it('falls back to the template and flags estimated when the value is UNKNOWN (null)', () => {
    const loop = ringLoopForRegion(paramWith(null), 'chest');
    expect(loop.estimated).toBe(true);
    // Never zero sized: the template circumference is used.
    expect(loop.circumferenceM).toBeGreaterThan(0);
  });

  it('flags estimated when the ring is marked estimated even with a value', () => {
    const loop = ringLoopForRegion(paramWith(1.0, true), 'chest');
    expect(loop.estimated).toBe(true);
  });

  it('handles an unknown region id without crashing (falls back to a template ring)', () => {
    const loop = ringLoopForRegion(paramWith(1.0), 'kneecapital');
    expect(loop.points.length).toBeGreaterThan(0);
    expect(loop.circumferenceM).toBeGreaterThan(0);
    expect(loop.estimated).toBe(true);
  });
});
