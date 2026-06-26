import { describe, it, expect } from 'vitest';
import {
  ellipsePointsForPerimeter,
  polygonPerimeter,
  solveSemiAxes,
} from '../ellipse';

describe('solveSemiAxes', () => {
  it('returns equal semi-axes for the circle case (aspectRatio 1)', () => {
    const perimeter = 1.2;
    const { a, b } = solveSemiAxes(perimeter, 1);
    expect(a).toBeCloseTo(b, 10);
    // Circle radius is perimeter / (2 * pi).
    expect(a).toBeCloseTo(perimeter / (2 * Math.PI), 6);
  });

  it('honors the requested aspect ratio b / a', () => {
    const { a, b } = solveSemiAxes(1.0, 0.7);
    expect(b / a).toBeCloseTo(0.7, 6);
  });
});

describe('ellipsePointsForPerimeter', () => {
  it('produces a circle whose radius is perimeter / (2 pi) when aspectRatio is 1', () => {
    const perimeter = 1.0;
    const segments = 64;
    const points = ellipsePointsForPerimeter(perimeter, 1, segments);
    const expectedRadius = perimeter / (2 * Math.PI);
    for (const p of points) {
      const r = Math.hypot(p.x, p.z);
      expect(r).toBeCloseTo(expectedRadius, 4);
    }
  });

  it('resampled polygon perimeter is within 1% of the target across cases', () => {
    const cases: Array<{ perimeter: number; aspect: number }> = [
      { perimeter: 0.39, aspect: 0.92 },
      { perimeter: 1.0, aspect: 0.72 },
      { perimeter: 0.74, aspect: 0.82 },
      { perimeter: 0.98, aspect: 0.74 },
      { perimeter: 0.33, aspect: 1.0 },
    ];
    const segments = 96;
    for (const c of cases) {
      const points = ellipsePointsForPerimeter(c.perimeter, c.aspect, segments);
      const measured = polygonPerimeter(points);
      const relError = Math.abs(measured - c.perimeter) / c.perimeter;
      expect(relError).toBeLessThan(0.01);
    }
  });

  it('returns the requested number of segments and is deterministic', () => {
    const a = ellipsePointsForPerimeter(0.9, 0.8, 48);
    const b = ellipsePointsForPerimeter(0.9, 0.8, 48);
    expect(a.length).toBe(48);
    expect(a).toEqual(b);
  });

  it('clamps a non-positive perimeter to a small positive ring rather than throwing', () => {
    const points = ellipsePointsForPerimeter(0, 1, 16);
    expect(points.length).toBe(16);
    for (const p of points) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
  });
});
