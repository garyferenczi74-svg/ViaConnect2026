import { describe, it, expect } from 'vitest';
import { computeTrend } from '../trend';

describe('computeTrend', () => {
  it('detects a rising trend with positive slope', () => {
    const t = computeTrend([
      { date: '2026-01-01', value: 10 },
      { date: '2026-02-01', value: 14 },
      { date: '2026-03-01', value: 18 },
    ]);
    expect(t.direction).toBe('rising');
    expect(t.slope).toBeGreaterThan(0);
  });

  it('detects a falling trend with negative slope', () => {
    const t = computeTrend([
      { date: '2026-01-01', value: 20 },
      { date: '2026-02-01', value: 15 },
      { date: '2026-03-01', value: 10 },
    ]);
    expect(t.direction).toBe('falling');
    expect(t.slope).toBeLessThan(0);
  });

  it('reports flat for constant values', () => {
    const t = computeTrend([
      { date: '2026-01-01', value: 12 },
      { date: '2026-02-01', value: 12 },
      { date: '2026-03-01', value: 12 },
    ]);
    expect(t.direction).toBe('flat');
    expect(t.slope).toBeCloseTo(0, 8);
  });

  it('returns a flat zero trend for a single point', () => {
    expect(computeTrend([{ date: '2026-01-01', value: 5 }])).toEqual({
      direction: 'flat',
      slope: 0,
      trend_window: '1 point',
    });
  });

  it('returns a flat zero trend for no points', () => {
    expect(computeTrend([])).toEqual({ direction: 'flat', slope: 0, trend_window: '0 point' });
  });

  it('falls back to index ordering when dates are unparseable', () => {
    const t = computeTrend([
      { date: 'not-a-date', value: 1 },
      { date: 'also-bad', value: 5 },
    ]);
    expect(t.direction).toBe('rising');
    expect(t.slope).toBeGreaterThan(0);
  });
});
