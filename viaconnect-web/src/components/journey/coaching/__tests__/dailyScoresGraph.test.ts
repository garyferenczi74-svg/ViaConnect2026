/**
 * src/components/journey/coaching/__tests__/dailyScoresGraph.test.ts
 *
 * TDD for scoreLinePath, rangeToTrendKey, yAxisTicks, and xAxisMarkers.
 * Pure helpers: deterministic, never throw, no DOM, node-safe.
 *
 * scoreLinePath: maps {score}[] points to an SVG polyline path string on a
 * fixed 0..100 y-scale. Returns '' for fewer than 2 finite points.
 *
 * rangeToTrendKey: maps the switcher tab label to the useBioOptimizationTrend
 * TimeRange key. Pure tab mapping.
 *
 * yAxisTicks: returns the eleven fixed tick values 0 to 100 in steps of 10.
 *
 * xAxisMarkers: returns axis marker objects for Week, Month, or Year mode
 * given a fixed reference timestamp. Never throws. Labels are short strings.
 */

import { describe, it, expect } from 'vitest';
import {
  scoreLinePath,
  scoreAreaPath,
  rangeToTrendKey,
  yAxisTicks,
  xAxisMarkers,
} from '../DailyScoresGraph';

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
  it('maps Week to 7D', () => {
    expect(rangeToTrendKey('Week')).toBe('7D');
  });

  it('maps Month to 4W', () => {
    expect(rangeToTrendKey('Month')).toBe('4W');
  });

  it('maps Year to 1Y', () => {
    expect(rangeToTrendKey('Year')).toBe('1Y');
  });

  it('is deterministic', () => {
    expect(rangeToTrendKey('Week')).toBe(rangeToTrendKey('Week'));
    expect(rangeToTrendKey('Month')).toBe(rangeToTrendKey('Month'));
    expect(rangeToTrendKey('Year')).toBe(rangeToTrendKey('Year'));
  });
});

// ---------------------------------------------------------------------------
// yAxisTicks
// ---------------------------------------------------------------------------

describe('yAxisTicks', () => {
  it('returns exactly 11 entries', () => {
    expect(yAxisTicks()).toHaveLength(11);
  });

  it('starts at 0 and ends at 100', () => {
    const ticks = yAxisTicks();
    expect(ticks[0]).toBe(0);
    expect(ticks[10]).toBe(100);
  });

  it('steps by 10 between each entry', () => {
    const ticks = yAxisTicks();
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i] - ticks[i - 1]).toBe(10);
    }
  });

  it('returns [0,10,20,30,40,50,60,70,80,90,100]', () => {
    expect(yAxisTicks()).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });

  it('never throws', () => {
    expect(() => yAxisTicks()).not.toThrow();
  });

  it('is deterministic', () => {
    expect(yAxisTicks()).toEqual(yAxisTicks());
  });
});

// ---------------------------------------------------------------------------
// xAxisMarkers
// ---------------------------------------------------------------------------

// Fixed reference: 2024-03-15 12:00:00 UTC
// March = 31-day month; Jan is first month; Dec is last month.
const MARCH_15_2024_MS = new Date('2024-03-15T12:00:00.000Z').getTime();
// Fixed reference for a 30-day month: 2024-04-20 (April = 30 days)
const APRIL_20_2024_MS = new Date('2024-04-20T12:00:00.000Z').getTime();
// Fixed reference for February 2024 (leap year: 29 days)
const FEB_10_2024_MS = new Date('2024-02-10T12:00:00.000Z').getTime();

describe('xAxisMarkers - Week mode', () => {
  it('returns exactly 7 markers', () => {
    const markers = xAxisMarkers('Week', MARCH_15_2024_MS);
    expect(markers).toHaveLength(7);
  });

  it('first marker has xFraction 0', () => {
    const markers = xAxisMarkers('Week', MARCH_15_2024_MS);
    expect(markers[0].xFraction).toBe(0);
  });

  it('last marker has xFraction 1', () => {
    const markers = xAxisMarkers('Week', MARCH_15_2024_MS);
    expect(markers[6].xFraction).toBe(1);
  });

  it('xFractions are evenly spaced (step = 1/6)', () => {
    const markers = xAxisMarkers('Week', MARCH_15_2024_MS);
    for (let i = 0; i < markers.length; i++) {
      expect(markers[i].xFraction).toBeCloseTo(i / 6, 10);
    }
  });

  it('all markers are major', () => {
    const markers = xAxisMarkers('Week', MARCH_15_2024_MS);
    markers.forEach((m) => expect(m.major).toBe(true));
  });

  it('all markers have non-empty label strings', () => {
    const markers = xAxisMarkers('Week', MARCH_15_2024_MS);
    markers.forEach((m) => {
      expect(typeof m.label).toBe('string');
      expect(m.label.length).toBeGreaterThan(0);
    });
  });

  it('never throws', () => {
    expect(() => xAxisMarkers('Week', MARCH_15_2024_MS)).not.toThrow();
  });

  it('is deterministic', () => {
    expect(xAxisMarkers('Week', MARCH_15_2024_MS)).toEqual(
      xAxisMarkers('Week', MARCH_15_2024_MS)
    );
  });
});

describe('xAxisMarkers - Month mode (31-day: March 2024)', () => {
  it('includes a marker for day 1', () => {
    const markers = xAxisMarkers('Month', MARCH_15_2024_MS);
    const hasDay1 = markers.some((m) => m.label === '1');
    expect(hasDay1).toBe(true);
  });

  it('includes a marker for day 31 (month end)', () => {
    const markers = xAxisMarkers('Month', MARCH_15_2024_MS);
    const hasLast = markers.some((m) => m.label === '31');
    expect(hasLast).toBe(true);
  });

  it('includes markers for days 1,5,10,15,20,25,31', () => {
    const markers = xAxisMarkers('Month', MARCH_15_2024_MS);
    const labels = markers.map((m) => m.label);
    expect(labels).toContain('1');
    expect(labels).toContain('5');
    expect(labels).toContain('10');
    expect(labels).toContain('15');
    expect(labels).toContain('20');
    expect(labels).toContain('25');
    expect(labels).toContain('31');
  });

  it('all xFractions are in [0,1]', () => {
    const markers = xAxisMarkers('Month', MARCH_15_2024_MS);
    markers.forEach((m) => {
      expect(m.xFraction).toBeGreaterThanOrEqual(0);
      expect(m.xFraction).toBeLessThanOrEqual(1);
    });
  });

  it('day 1 has xFraction 0', () => {
    const markers = xAxisMarkers('Month', MARCH_15_2024_MS);
    const m1 = markers.find((m) => m.label === '1');
    expect(m1?.xFraction).toBe(0);
  });

  it('last day (31) has xFraction 1', () => {
    const markers = xAxisMarkers('Month', MARCH_15_2024_MS);
    const mLast = markers.find((m) => m.label === '31');
    expect(mLast?.xFraction).toBe(1);
  });

  it('never throws', () => {
    expect(() => xAxisMarkers('Month', MARCH_15_2024_MS)).not.toThrow();
  });

  it('is deterministic', () => {
    expect(xAxisMarkers('Month', MARCH_15_2024_MS)).toEqual(
      xAxisMarkers('Month', MARCH_15_2024_MS)
    );
  });
});

describe('xAxisMarkers - Month mode (30-day: April 2024)', () => {
  it('includes a marker for day 30 (month end)', () => {
    const markers = xAxisMarkers('Month', APRIL_20_2024_MS);
    const hasLast = markers.some((m) => m.label === '30');
    expect(hasLast).toBe(true);
  });

  it('does NOT include a marker for day 31', () => {
    const markers = xAxisMarkers('Month', APRIL_20_2024_MS);
    const has31 = markers.some((m) => m.label === '31');
    expect(has31).toBe(false);
  });

  it('day 30 has xFraction 1', () => {
    const markers = xAxisMarkers('Month', APRIL_20_2024_MS);
    const mLast = markers.find((m) => m.label === '30');
    expect(mLast?.xFraction).toBe(1);
  });

  it('never throws', () => {
    expect(() => xAxisMarkers('Month', APRIL_20_2024_MS)).not.toThrow();
  });
});

describe('xAxisMarkers - Month mode (29-day: Feb 2024 leap)', () => {
  it('includes a marker for day 29 (month end)', () => {
    const markers = xAxisMarkers('Month', FEB_10_2024_MS);
    const hasLast = markers.some((m) => m.label === '29');
    expect(hasLast).toBe(true);
  });

  it('does NOT include day 30 or 31', () => {
    const markers = xAxisMarkers('Month', FEB_10_2024_MS);
    expect(markers.some((m) => m.label === '30')).toBe(false);
    expect(markers.some((m) => m.label === '31')).toBe(false);
  });

  it('day 29 has xFraction 1', () => {
    const markers = xAxisMarkers('Month', FEB_10_2024_MS);
    const mLast = markers.find((m) => m.label === '29');
    expect(mLast?.xFraction).toBe(1);
  });

  it('never throws', () => {
    expect(() => xAxisMarkers('Month', FEB_10_2024_MS)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// scoreAreaPath
// ---------------------------------------------------------------------------

describe('scoreAreaPath', () => {
  it('returns empty string for 0 points', () => {
    expect(scoreAreaPath([], 400, 200)).toBe('');
  });

  it('returns empty string for 1 point', () => {
    expect(scoreAreaPath([{ score: 50 }], 400, 200)).toBe('');
  });

  it('returns a non-empty string for 2 points', () => {
    const result = scoreAreaPath([{ score: 50 }, { score: 80 }], 400, 200);
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for 5 points', () => {
    const result = scoreAreaPath(
      [{ score: 10 }, { score: 30 }, { score: 50 }, { score: 70 }, { score: 90 }],
      400,
      200
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it('closed path ends with Z', () => {
    const result = scoreAreaPath([{ score: 50 }, { score: 80 }], 400, 200);
    expect(result.trim().toUpperCase()).toMatch(/Z$/);
  });

  it('includes a baseline segment down to y=height at last x', () => {
    // 2 points, width 400, height 200: last x = 400
    const result = scoreAreaPath([{ score: 50 }, { score: 80 }], 400, 200);
    // Should contain a line to x=400,y=200 (bottom-right corner)
    expect(result).toMatch(/L\s*400\s*,?\s*200/);
  });

  it('includes a line across baseline back to x=0 at y=height', () => {
    // Should contain a line to x=0,y=200 (bottom-left corner) after bottom-right
    const result = scoreAreaPath([{ score: 50 }, { score: 80 }], 400, 200);
    expect(result).toMatch(/L\s*0\s*,?\s*200/);
  });

  it('maps score 100 to y=0 (top) for the line segment', () => {
    const result = scoreAreaPath([{ score: 100 }, { score: 50 }], 400, 200);
    // First point at x=0, y=(1-1)*200=0
    expect(result).toMatch(/M\s*0\s*,?\s*0/);
  });

  it('maps score 0 to y=height (bottom) for the line segment', () => {
    const result = scoreAreaPath([{ score: 0 }, { score: 50 }], 400, 200);
    // First point at x=0, y=(1-0)*200=200
    expect(result).toMatch(/M\s*0\s*,?\s*200/);
  });

  it('clamps score above 100 to 100 (y=0)', () => {
    const result = scoreAreaPath([{ score: 150 }, { score: 50 }], 400, 200);
    expect(result).toMatch(/M\s*0\s*,?\s*0/);
  });

  it('clamps negative score to 0 (y=height)', () => {
    const result = scoreAreaPath([{ score: -20 }, { score: 50 }], 400, 200);
    expect(result).toMatch(/M\s*0\s*,?\s*200/);
  });

  it('returns empty string when all scores are NaN', () => {
    expect(scoreAreaPath([{ score: NaN }, { score: NaN }], 400, 200)).toBe('');
  });

  it('returns empty string when only 1 finite point', () => {
    expect(
      scoreAreaPath(
        [{ score: NaN }, { score: 50 }, { score: NaN }],
        400,
        200
      )
    ).toBe('');
  });

  it('uses 2 finite points when mixed with NaN', () => {
    const result = scoreAreaPath(
      [{ score: NaN }, { score: 40 }, { score: 80 }],
      400,
      200
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.trim().toUpperCase()).toMatch(/Z$/);
  });

  it('never throws on empty array', () => {
    expect(() => scoreAreaPath([], 400, 200)).not.toThrow();
  });

  it('never throws on NaN scores', () => {
    expect(() =>
      scoreAreaPath([{ score: NaN }, { score: NaN }], 400, 200)
    ).not.toThrow();
  });

  it('never throws on zero dimensions', () => {
    expect(() =>
      scoreAreaPath([{ score: 50 }, { score: 80 }], 0, 0)
    ).not.toThrow();
  });

  it('is deterministic', () => {
    const pts = [{ score: 25 }, { score: 75 }, { score: 50 }];
    const a = scoreAreaPath(pts, 300, 150);
    const b = scoreAreaPath(pts, 300, 150);
    expect(a).toBe(b);
  });

  it('x spacing matches scoreLinePath spacing (same mapping)', () => {
    const pts = [{ score: 30 }, { score: 70 }, { score: 50 }];
    const line = scoreLinePath(pts, 300, 150);
    const area = scoreAreaPath(pts, 300, 150);
    // Both should start with the same M coordinate
    const lineStart = line.split(' ')[0];
    const areaStart = area.split(' ')[0];
    expect(areaStart).toBe(lineStart);
  });
});

describe('xAxisMarkers - Year mode', () => {
  it('contains exactly 12 major markers', () => {
    const markers = xAxisMarkers('Year', MARCH_15_2024_MS);
    const major = markers.filter((m) => m.major);
    expect(major).toHaveLength(12);
  });

  it('major markers are labeled Jan through Dec', () => {
    const markers = xAxisMarkers('Year', MARCH_15_2024_MS);
    const majorLabels = markers.filter((m) => m.major).map((m) => m.label);
    expect(majorLabels).toEqual([
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]);
  });

  it('major xFractions are i/11 for i = 0..11', () => {
    const markers = xAxisMarkers('Year', MARCH_15_2024_MS);
    const major = markers.filter((m) => m.major);
    major.forEach((m, i) => {
      expect(m.xFraction).toBeCloseTo(i / 11, 10);
    });
  });

  it('Jan major marker has xFraction 0', () => {
    const markers = xAxisMarkers('Year', MARCH_15_2024_MS);
    const jan = markers.find((m) => m.major && m.label === 'Jan');
    expect(jan?.xFraction).toBe(0);
  });

  it('Dec major marker has xFraction 1', () => {
    const markers = xAxisMarkers('Year', MARCH_15_2024_MS);
    const dec = markers.find((m) => m.major && m.label === 'Dec');
    expect(dec?.xFraction).toBe(1);
  });

  it('contains minor ticks between months (major:false)', () => {
    const markers = xAxisMarkers('Year', MARCH_15_2024_MS);
    const minor = markers.filter((m) => !m.major);
    expect(minor.length).toBeGreaterThan(0);
  });

  it('minor tick xFractions are in (0, 1) exclusive', () => {
    const markers = xAxisMarkers('Year', MARCH_15_2024_MS);
    const minor = markers.filter((m) => !m.major);
    minor.forEach((m) => {
      expect(m.xFraction).toBeGreaterThan(0);
      expect(m.xFraction).toBeLessThan(1);
    });
  });

  it('never throws', () => {
    expect(() => xAxisMarkers('Year', MARCH_15_2024_MS)).not.toThrow();
  });

  it('is deterministic', () => {
    expect(xAxisMarkers('Year', MARCH_15_2024_MS)).toEqual(
      xAxisMarkers('Year', MARCH_15_2024_MS)
    );
  });
});
