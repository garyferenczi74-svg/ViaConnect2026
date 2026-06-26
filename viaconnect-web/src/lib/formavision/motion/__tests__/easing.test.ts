import { describe, it, expect } from 'vitest';
import { easeInOutCubic, easeOutCubic, linear } from '../easing';

describe('easeInOutCubic', () => {
  it('anchors at f(0) = 0 and f(1) = 1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('passes through the midpoint at 0.5', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
  });

  it('is monotonic non decreasing across the domain', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 20; i += 1) {
      const v = easeInOutCubic(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('clamps inputs outside 0..1 to the curve endpoints', () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
  });
});

describe('easeOutCubic', () => {
  it('anchors at f(0) = 0 and f(1) = 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('decelerates: early progress is ahead of linear', () => {
    expect(easeOutCubic(0.25)).toBeGreaterThan(0.25);
  });

  it('is monotonic non decreasing across the domain', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 20; i += 1) {
      const v = easeOutCubic(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('clamps inputs outside 0..1 to the curve endpoints', () => {
    expect(easeOutCubic(-3)).toBe(0);
    expect(easeOutCubic(5)).toBe(1);
  });
});

describe('linear', () => {
  it('returns the clamped input', () => {
    expect(linear(0)).toBe(0);
    expect(linear(0.4)).toBe(0.4);
    expect(linear(1)).toBe(1);
    expect(linear(1.5)).toBe(1);
    expect(linear(-0.5)).toBe(0);
  });
});
