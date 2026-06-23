/**
 * src/components/journey/trio/__tests__/donutArcs.test.ts
 *
 * Unit tests for the PURE donut arc math (Prompt 208d, Task D-T4, 3.6).
 * Written first (TDD RED -> GREEN).
 *
 * donutArcs maps a list of weighted segments onto a single circle of a given
 * radius, returning each segment's SVG stroke-dasharray plus the cumulative
 * stroke-dashoffset so the segments tile the ring proportionally to value/total.
 *
 * Numbers are rounded to a few decimals (compact SVG output), so equality
 * assertions here are checked to 2 decimal places rather than full float
 * precision.
 *
 * Contract:
 *   - The drawn length of each arc is (value / total) * circumference.
 *   - dashArray is "<arcLen> <circumference - arcLen>" so only the arc paints.
 *   - dashOffset is the NEGATED cumulative arc length of the preceding segments
 *     (SVG paints a positive-length dash starting earlier as the offset grows
 *     negative), so the segments butt up against each other without gaps.
 *   - total <= 0 (empty / all-zero / non-finite) -> every arc is zero-length
 *     (an honest empty ring), never a divide-by-zero, never NaN.
 *
 * PURE, DETERMINISTIC, never throws. No DB, no React, no Supabase.
 * No em/en-dashes. No emojis.
 */

import { describe, it, expect } from 'vitest';
import { donutArcs } from '../donutArcs';

const TWO_PI = 2 * Math.PI;

describe('donutArcs', () => {
  const RADIUS = 50;
  const CIRC = TWO_PI * RADIUS;

  // Parse the "<arcLen> <gap>" dashArray into [arcLen, gap].
  function parseDash(dashArray: string): [number, number] {
    const parts = dashArray.trim().split(/\s+/).map(Number);
    return [parts[0], parts[1]];
  }

  it('splits 3 equal segments into 3 arcs each ~1/3 of the circumference', () => {
    const arcs = donutArcs(
      [
        { value: 1, color: '#2DA5A0', label: 'a' },
        { value: 1, color: '#B75E18', label: 'b' },
        { value: 1, color: '#6C7A99', label: 'c' },
      ],
      { radius: RADIUS },
    );

    expect(arcs).toHaveLength(3);
    const third = CIRC / 3;
    for (const arc of arcs) {
      const [arcLen] = parseDash(arc.dashArray);
      expect(arcLen).toBeCloseTo(third, 2);
    }
  });

  it('lays segments out with cumulative (negated) offsets so they butt up against each other', () => {
    const arcs = donutArcs(
      [
        { value: 1, color: '#2DA5A0', label: 'a' },
        { value: 1, color: '#B75E18', label: 'b' },
        { value: 1, color: '#6C7A99', label: 'c' },
      ],
      { radius: RADIUS },
    );

    const third = CIRC / 3;
    // First segment starts at the origin (offset 0).
    expect(arcs[0].dashOffset).toBeCloseTo(0, 2);
    // Each later segment is offset by the negated cumulative length before it.
    expect(arcs[1].dashOffset).toBeCloseTo(-third, 2);
    expect(arcs[2].dashOffset).toBeCloseTo(-2 * third, 2);

    // Labels and colors are preserved in order.
    expect(arcs.map((a) => a.label)).toEqual(['a', 'b', 'c']);
    expect(arcs.map((a) => a.color)).toEqual(['#2DA5A0', '#B75E18', '#6C7A99']);
  });

  it('renders a single 100% segment as one full-circumference arc with no gap', () => {
    const arcs = donutArcs([{ value: 7, color: '#2DA5A0', label: 'only' }], {
      radius: RADIUS,
    });
    expect(arcs).toHaveLength(1);
    const [arcLen, gap] = parseDash(arcs[0].dashArray);
    expect(arcLen).toBeCloseTo(CIRC, 2);
    expect(gap).toBeCloseTo(0, 2);
    expect(arcs[0].dashOffset).toBeCloseTo(0, 2);
  });

  it('keeps proportions for unequal segments (50 / 30 / 20)', () => {
    const arcs = donutArcs(
      [
        { value: 50, color: '#2DA5A0', label: 'carbs' },
        { value: 30, color: '#B75E18', label: 'protein' },
        { value: 20, color: '#6C7A99', label: 'fat' },
      ],
      { radius: RADIUS },
    );
    const [a0] = parseDash(arcs[0].dashArray);
    const [a1] = parseDash(arcs[1].dashArray);
    const [a2] = parseDash(arcs[2].dashArray);
    expect(a0).toBeCloseTo(CIRC * 0.5, 2);
    expect(a1).toBeCloseTo(CIRC * 0.3, 2);
    expect(a2).toBeCloseTo(CIRC * 0.2, 2);
    // Cumulative offsets stack.
    expect(arcs[1].dashOffset).toBeCloseTo(-CIRC * 0.5, 2);
    expect(arcs[2].dashOffset).toBeCloseTo(-CIRC * 0.8, 2);
  });

  it('total 0 -> all zero-length arcs (honest empty ring, no NaN)', () => {
    const arcs = donutArcs(
      [
        { value: 0, color: '#2DA5A0', label: 'a' },
        { value: 0, color: '#B75E18', label: 'b' },
      ],
      { radius: RADIUS },
    );
    expect(arcs).toHaveLength(2);
    for (const arc of arcs) {
      const [arcLen] = parseDash(arc.dashArray);
      expect(arcLen).toBeCloseTo(0, 5);
      expect(arc.dashArray).not.toMatch(/NaN|Infinity/);
      expect(Number.isFinite(arc.dashOffset)).toBe(true);
    }
  });

  it('never throws and never emits NaN on empty / negative / non-finite input', () => {
    expect(() => donutArcs([], { radius: RADIUS })).not.toThrow();
    expect(donutArcs([], { radius: RADIUS })).toEqual([]);

    const bad = donutArcs(
      [
        { value: NaN, color: '#2DA5A0', label: 'a' },
        { value: -5, color: '#B75E18', label: 'b' },
        { value: Infinity, color: '#6C7A99', label: 'c' },
      ],
      { radius: RADIUS },
    );
    expect(bad).toHaveLength(3);
    for (const arc of bad) {
      expect(arc.dashArray).not.toMatch(/NaN|Infinity/);
      expect(Number.isFinite(arc.dashOffset)).toBe(true);
    }
  });

  it('defaults the radius when none is supplied and never divides by zero on radius 0', () => {
    const withDefault = donutArcs([{ value: 1, color: '#2DA5A0', label: 'a' }]);
    expect(withDefault).toHaveLength(1);
    expect(withDefault[0].dashArray).not.toMatch(/NaN|Infinity/);

    const zeroR = donutArcs([{ value: 1, color: '#2DA5A0', label: 'a' }], {
      radius: 0,
    });
    expect(zeroR[0].dashArray).not.toMatch(/NaN|Infinity/);
    expect(Number.isFinite(zeroR[0].dashOffset)).toBe(true);
  });

  it('is deterministic (same input -> identical output)', () => {
    const input = [
      { value: 2, color: '#2DA5A0', label: 'a' },
      { value: 3, color: '#B75E18', label: 'b' },
    ];
    expect(donutArcs(input, { radius: RADIUS })).toEqual(
      donutArcs(input, { radius: RADIUS }),
    );
  });
});
