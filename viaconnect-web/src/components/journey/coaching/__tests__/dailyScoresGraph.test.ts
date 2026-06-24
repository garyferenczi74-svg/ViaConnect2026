/**
 * src/components/journey/coaching/__tests__/dailyScoresGraph.test.ts
 *
 * TDD for scoreLinePath and rangeToTrendKey (Prompt 208g Task G-T3).
 * Pure helpers: deterministic, never throw, no DOM, node-safe.
 *
 * scoreLinePath: maps {score}[] points to an SVG polyline path string on a
 * fixed 0..100 y-scale. Returns '' for fewer than 2 finite points.
 *
 * rangeToTrendKey: maps the toggle range label to the useBioOptimizationTrend
 * TimeRange key. Pure toggle mapping.
 */

import { describe, it, expect } from 'vitest';
import { scoreLinePath, rangeToTrendKey } from '../DailyScoresGraph';

// ---------------------------------------------------------------------------
// scoreLinePath
// ---------------------------------------------------------------------------

describe('scoreLinePath', () => {
  it('returns empty string for 0 points', () => {
    expect(scoreLinePath([], 400, 200)).toBe('');
  });

  it('returns empty string for 1 point', () => {
    expect(scoreLinePath([{ score: 50 }], 400, 200)).toBe('');
  });

  it('returns a non-empty string for 2 points', () => {
    const result = scoreLinePath([{ score: 50 }, { score: 80 }], 400, 200);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for 5 points', () => {
    const result = scoreLinePath(
      [{ score: 10 }, { score: 30 }, { score: 50 }, { score: 70 }, { score: 90 }],
      400,
      200
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it('path string contains the expected number of coordinate pairs for 2 points', () => {
    const result = scoreLinePath([{ score: 50 }, { score: 80 }], 400, 200);
    // Split on M and L commands to count pairs
    const pairs = result.trim().split(/(?=[ML])/);
    expect(pairs.length).toBe(2);
  });

  it('path string contains the expected number of coordinate pairs for 5 points', () => {
    const result = scoreLinePath(
      [{ score: 10 }, { score: 30 }, { score: 50 }, { score: 70 }, { score: 90 }],
      400,
      200
    );
    const pairs = result.trim().split(/(?=[ML])/);
    expect(pairs.length).toBe(5);
  });

  it('maps score 100 to y=0 (top of chart)', () => {
    const result = scoreLinePath([{ score: 100 }, { score: 50 }], 400, 200);
    // First point x=0, y=(1 - 100/100)*200 = 0
    expect(result).toMatch(/M\s*0\s*,?\s*0/);
  });

  it('maps score 0 to y=height (bottom of chart)', () => {
    const result = scoreLinePath([{ score: 0 }, { score: 50 }], 400, 200);
    // First point x=0, y=(1 - 0/100)*200 = 200
    expect(result).toMatch(/M\s*0\s*,?\s*200/);
  });

  it('clamps score above 100 to 100 (y=0)', () => {
    const result = scoreLinePath([{ score: 150 }, { score: 50 }], 400, 200);
    // Clamped to 100 -> y=0
    expect(result).toMatch(/M\s*0\s*,?\s*0/);
  });

  it('clamps negative score to 0 (y=height)', () => {
    const result = scoreLinePath([{ score: -20 }, { score: 50 }], 400, 200);
    // Clamped to 0 -> y=200
    expect(result).toMatch(/M\s*0\s*,?\s*200/);
  });

  it('x coordinates are evenly spaced across width for 3 points', () => {
    // width=400, 3 points: x at 0, 200, 400
    const result = scoreLinePath(
      [{ score: 50 }, { score: 50 }, { score: 50 }],
      400,
      200
    );
    expect(result).toContain('0');
    // Second x = (400 / (3-1)) * 1 = 200
    expect(result).toMatch(/200/);
    // Third x = 400
    expect(result).toMatch(/400/);
  });

  it('is deterministic (same input -> same output)', () => {
    const pts = [{ score: 25 }, { score: 75 }, { score: 50 }];
    const a = scoreLinePath(pts, 300, 150);
    const b = scoreLinePath(pts, 300, 150);
    expect(a).toBe(b);
  });

  it('never throws on empty array', () => {
    expect(() => scoreLinePath([], 400, 200)).not.toThrow();
  });

  it('never throws on NaN score', () => {
    expect(() =>
      scoreLinePath([{ score: NaN }, { score: NaN }], 400, 200)
    ).not.toThrow();
  });

  it('returns empty string when all scores are NaN (fewer than 2 finite)', () => {
    expect(scoreLinePath([{ score: NaN }, { score: NaN }], 400, 200)).toBe('');
  });

  it('uses only finite points; returns empty when fewer than 2 are finite', () => {
    // Only 1 finite point among 5 entries
    expect(
      scoreLinePath(
        [{ score: NaN }, { score: 50 }, { score: NaN }, { score: NaN }, { score: NaN }],
        400,
        200
      )
    ).toBe('');
  });

  it('uses finite points correctly when mixed with NaN', () => {
    // 2 finite out of 3 -> should produce a path
    const result = scoreLinePath(
      [{ score: NaN }, { score: 40 }, { score: 80 }],
      400,
      200
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it('never throws on negative dimensions (edge case)', () => {
    expect(() =>
      scoreLinePath([{ score: 50 }, { score: 80 }], 0, 0)
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// rangeToTrendKey
// ---------------------------------------------------------------------------

describe('rangeToTrendKey', () => {
  it('maps 1W to 7D', () => {
    expect(rangeToTrendKey('1W')).toBe('7D');
  });

  it('maps 1M to 4W', () => {
    expect(rangeToTrendKey('1M')).toBe('4W');
  });

  it('maps 1Y to 1Y', () => {
    expect(rangeToTrendKey('1Y')).toBe('1Y');
  });

  it('is deterministic', () => {
    expect(rangeToTrendKey('1W')).toBe(rangeToTrendKey('1W'));
    expect(rangeToTrendKey('1M')).toBe(rangeToTrendKey('1M'));
    expect(rangeToTrendKey('1Y')).toBe(rangeToTrendKey('1Y'));
  });
});
