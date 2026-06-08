import { describe, it, expect } from 'vitest';
import { ewmaSeries, smoothedWeightChange } from '@/lib/body-goals/ewma';

const pts = (vals: Array<[string, number]>) =>
  vals.map(([date, weightLb]) => ({ date, weightLb }));

describe('ewmaSeries', () => {
  it('seeds the first smoothed value to the first raw value', () => {
    const s = ewmaSeries(pts([['2026-06-01', 200]]), 10);
    expect(s[0].smoothedLb).toBe(200);
  });
  it('lags a step change toward, not onto, the new value', () => {
    const s = ewmaSeries(pts([['2026-06-01', 200], ['2026-06-02', 190]]), 10);
    expect(s[1].smoothedLb).toBeGreaterThan(190);
    expect(s[1].smoothedLb).toBeLessThan(200);
  });
  it('returns empty for empty input', () => {
    expect(ewmaSeries([], 10)).toEqual([]);
  });
  it('sorts unordered input before smoothing', () => {
    const s = ewmaSeries(pts([['2026-06-05', 198], ['2026-06-01', 200]]), 10);
    expect(s[0].date).toBe('2026-06-01');
    expect(s[0].smoothedLb).toBe(200);
  });
});

describe('smoothedWeightChange', () => {
  it('is negative when the smoothed trend falls across the window', () => {
    const series = pts([
      ['2026-06-01', 200], ['2026-06-04', 199], ['2026-06-08', 198],
      ['2026-06-11', 197], ['2026-06-15', 196],
    ]);
    const change = smoothedWeightChange(series, '2026-06-01', '2026-06-15', 10);
    expect(change).not.toBeNull();
    expect(change as number).toBeLessThan(0);
  });
  it('returns null for an empty series', () => {
    expect(smoothedWeightChange([], '2026-06-01', '2026-06-15', 10)).toBeNull();
  });
});
