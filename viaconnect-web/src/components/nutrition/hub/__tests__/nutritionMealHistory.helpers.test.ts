// Prompt 183 Task 5 (2026-06-10): unit tests for the pure helpers that drive
// the presentational 7 Day Meal History tile. The component body is not unit
// tested in node-env (it renders PlasmaGauge + framer-motion); the pure bar
// height scaling and weekday derivation are exported and tested here. A fixed
// injected `now` keeps the weekday labels deterministic across machines.

import { describe, it, expect } from 'vitest';
import {
  MIN_FILLED_FRACTION,
  barHeightFraction,
  barHeightFractions,
  peakMealCount,
  weekdayLabelsEndingToday,
} from '../nutritionMealHistory.helpers';

describe('barHeightFraction', () => {
  it('maps a zero count to the empty track (0)', () => {
    expect(barHeightFraction(0, 4)).toBe(0);
  });

  it('maps the tallest day in the window to full height (1)', () => {
    expect(barHeightFraction(4, 4)).toBe(1);
  });

  it('gives any positive count at least the minimum filled fraction', () => {
    // A single meal against a busy peak still reads as a clearly filled bar.
    expect(barHeightFraction(1, 10)).toBeGreaterThanOrEqual(MIN_FILLED_FRACTION);
  });

  it('is monotonic: a larger count never yields a shorter bar', () => {
    const peak = 6;
    let prev = -1;
    for (let c = 0; c <= peak; c += 1) {
      const h = barHeightFraction(c, peak);
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });

  it('returns 0 when the peak is not positive (all zero window)', () => {
    expect(barHeightFraction(0, 0)).toBe(0);
    expect(barHeightFraction(3, 0)).toBe(0);
  });

  it('coerces non finite or negative input to a clean 0, never NaN', () => {
    expect(barHeightFraction(Number.NaN, 4)).toBe(0);
    expect(barHeightFraction(-2, 4)).toBe(0);
    expect(Number.isNaN(barHeightFraction(2, Number.POSITIVE_INFINITY))).toBe(false);
  });

  it('clamps a count above the peak to full height', () => {
    expect(barHeightFraction(9, 4)).toBe(1);
  });
});

describe('peakMealCount', () => {
  it('returns the largest count in the window', () => {
    expect(peakMealCount([0, 1, 3, 2, 0, 1, 4])).toBe(4);
  });

  it('returns 0 for an empty or all zero window', () => {
    expect(peakMealCount([])).toBe(0);
    expect(peakMealCount([0, 0, 0])).toBe(0);
  });
});

describe('barHeightFractions', () => {
  it('returns one fraction per day, same length as the input', () => {
    expect(barHeightFractions([0, 1, 2, 0, 0, 0, 3])).toHaveLength(7);
  });

  it('returns all zeros for an all zero window', () => {
    expect(barHeightFractions([0, 0, 0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('fills the peak day to 1 and leaves zero days at 0', () => {
    const out = barHeightFractions([0, 2, 0, 4, 0, 0, 1]);
    expect(out[0]).toBe(0);
    expect(out[2]).toBe(0);
    expect(out[3]).toBe(1); // peak
    expect(out[1]).toBeGreaterThan(0);
    expect(out[1]).toBeLessThan(1);
    expect(out[6]).toBeGreaterThanOrEqual(MIN_FILLED_FRACTION);
  });
});

describe('weekdayLabelsEndingToday', () => {
  it('returns 7 short labels ending today, oldest to newest', () => {
    // 2026-06-10 is a Wednesday. The window runs Thu..Wed.
    const now = new Date(2026, 5, 10, 12, 0, 0);
    expect(weekdayLabelsEndingToday(now, 7)).toEqual([
      'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed',
    ]);
  });

  it('puts today as the final label', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0); // Wednesday
    const labels = weekdayLabelsEndingToday(now, 7);
    expect(labels[labels.length - 1]).toBe('Wed');
  });

  it('honors a custom length', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0); // Wednesday
    expect(weekdayLabelsEndingToday(now, 3)).toEqual(['Mon', 'Tue', 'Wed']);
  });

  it('falls back to a valid window for an invalid now', () => {
    const labels = weekdayLabelsEndingToday(new Date(Number.NaN), 7);
    expect(labels).toHaveLength(7);
    labels.forEach((l) => expect(typeof l).toBe('string'));
  });
});
