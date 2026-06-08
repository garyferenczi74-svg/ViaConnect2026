import { describe, it, expect } from 'vitest';
import { aggregateDailyKcal } from '@/lib/body-goals/goalsData';

describe('aggregateDailyKcal', () => {
  it('sums per day then averages across the logged days', () => {
    const r = aggregateDailyKcal([
      { day: '2026-06-01', kcal: 500 },
      { day: '2026-06-01', kcal: 700 }, // day 1 total 1200
      { day: '2026-06-02', kcal: 1800 }, // day 2 total 1800
    ]);
    expect(r.daysLogged).toBe(2);
    expect(r.avgKcal).toBe(1500); // (1200 + 1800) / 2
  });
  it('returns zero for empty input', () => {
    expect(aggregateDailyKcal([])).toEqual({ avgKcal: 0, daysLogged: 0 });
  });
});
