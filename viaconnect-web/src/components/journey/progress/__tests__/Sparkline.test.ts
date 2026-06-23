/**
 * src/components/journey/progress/__tests__/Sparkline.test.ts
 *
 * Unit tests for the PURE sparklinePath path-math (Prompt 208d, Task D-T3).
 * Tests are written first (TDD RED -> GREEN).
 *
 * Orientation contract: the SVG y-axis points DOWN, so the HIGHEST value maps
 * to the smallest y (top of the box) and the LOWEST value maps to the largest y
 * (bottom). Therefore a strictly ASCENDING value series produces strictly
 * DECREASING y-coordinates.
 *
 * sparklinePath is pure and deterministic and never throws (empty / single /
 * non-finite inputs degrade to a calm flat baseline at the vertical midline).
 *
 * No DB, no React, no Supabase. No em/en-dashes. No emojis.
 */

import { describe, it, expect } from 'vitest';
import { sparklinePath } from '../sparklinePath';

// Parse an SVG path "M x y L x y L x y ..." into an array of [x, y] points.
function parsePoints(d: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const re = /[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    out.push([Number(m[1]), Number(m[2])]);
  }
  return out;
}

describe('sparklinePath', () => {
  const W = 100;
  const H = 40;

  it('maps 3 ascending points to strictly decreasing y-coordinates (higher value = lower y)', () => {
    const d = sparklinePath([1, 2, 3], W, H);
    const pts = parsePoints(d);
    expect(pts).toHaveLength(3);

    // x spreads left -> right across the width.
    expect(pts[0][0]).toBeCloseTo(0, 5);
    expect(pts[2][0]).toBeCloseTo(W, 5);
    expect(pts[0][0]).toBeLessThan(pts[1][0]);
    expect(pts[1][0]).toBeLessThan(pts[2][0]);

    // Ascending values -> strictly decreasing y (top of box is the max).
    expect(pts[0][1]).toBeGreaterThan(pts[1][1]);
    expect(pts[1][1]).toBeGreaterThan(pts[2][1]);

    // The extremes pin to the box: max value at y=0, min value at y=H.
    expect(pts[2][1]).toBeCloseTo(0, 5); // value 3 (max) -> top
    expect(pts[0][1]).toBeCloseTo(H, 5); // value 1 (min) -> bottom
  });

  it('maps a descending series to strictly increasing y-coordinates', () => {
    const pts = parsePoints(sparklinePath([3, 2, 1], W, H));
    expect(pts).toHaveLength(3);
    expect(pts[0][1]).toBeLessThan(pts[1][1]);
    expect(pts[1][1]).toBeLessThan(pts[2][1]);
  });

  it('renders a flat baseline at the vertical midline for fewer than 2 points', () => {
    const mid = H / 2;

    const empty = parsePoints(sparklinePath([], W, H));
    expect(empty).toHaveLength(2);
    expect(empty[0]).toEqual([0, mid]);
    expect(empty[1]).toEqual([W, mid]);

    const single = parsePoints(sparklinePath([42], W, H));
    expect(single).toHaveLength(2);
    expect(single[0][1]).toBeCloseTo(mid, 5);
    expect(single[1][1]).toBeCloseTo(mid, 5);
  });

  it('renders a flat baseline when all values are equal (zero range, no divide-by-zero)', () => {
    const pts = parsePoints(sparklinePath([5, 5, 5], W, H));
    // Zero range collapses to the honest 2-point flat baseline at the midline.
    expect(pts).toHaveLength(2);
    const mid = H / 2;
    for (const [, y] of pts) {
      expect(y).toBeCloseTo(mid, 5);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  it('is deterministic (same input -> identical path string)', () => {
    expect(sparklinePath([1, 4, 2, 8], W, H)).toBe(sparklinePath([1, 4, 2, 8], W, H));
  });

  it('never throws and never emits NaN on non-finite or malformed input', () => {
    const inputs: number[][] = [
      [NaN, NaN],
      [1, NaN, 3],
      [Infinity, -Infinity],
      [],
    ];
    for (const input of inputs) {
      expect(() => sparklinePath(input, W, H)).not.toThrow();
      const d = sparklinePath(input, W, H);
      expect(d).not.toMatch(/NaN|Infinity/);
    }
  });

  it('is robust to non-positive width/height (never divides by zero, never NaN)', () => {
    expect(() => sparklinePath([1, 2, 3], 0, 0)).not.toThrow();
    const d = sparklinePath([1, 2, 3], 0, 0);
    expect(d).not.toMatch(/NaN|Infinity/);
  });
});
