// Prompt 183 Task 5 (2026-06-10): pure helpers for the presentational 7 Day
// Meal History tile (Row 4 of the My Nutrition bento hub).
//
// Extracted from the component so the bar height scaling and the weekday label
// derivation are unit testable in node-env with an injected `now`, the same
// pattern the hub metrics hook and the Today's Meals helpers use. Nothing here
// reads, writes, or mutates anything: every function is a pure transform of the
// dailyMealCounts the component already has in hand from useNutritionHubMetrics.

// The minimum visible fraction for a day that has at least one meal, so a
// single meal day still reads as a clearly filled bar against the empty track
// rather than a sliver. The tallest day in the window maps to 1 (full height);
// other filled days scale linearly between the floor and 1 by their share of
// that peak. A zero count day always maps to 0 (the empty track).
export const MIN_FILLED_FRACTION = 0.28;

// Short weekday labels, Sunday first, matching toLocaleDateString('en-US',
// { weekday: 'short' }) so the display reads the same as MealHistory without
// pulling Intl into a pure node test. Index is the JS getDay() value.
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function asCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

/**
 * Pure. Maps a single day's meal count to a 0..1 bar height fraction given the
 * window's peak count. A zero count yields 0 (the empty track). Any positive
 * count yields at least MIN_FILLED_FRACTION and scales toward 1 in proportion
 * to the peak, so the busiest day is full height and the relationship is
 * monotonic in the count. Total over bad input: a non finite or negative count
 * or peak coerces to a clean result, never NaN.
 *
 * @param count this day's meal count
 * @param peak the largest meal count across the window (>= count)
 */
export function barHeightFraction(count: number, peak: number): number {
  const c = asCount(count);
  if (c <= 0) return 0;
  const p = asCount(peak);
  if (p <= 0) return 0;
  const ratio = Math.min(1, c / p);
  return MIN_FILLED_FRACTION + (1 - MIN_FILLED_FRACTION) * ratio;
}

/**
 * Pure. The peak (largest) meal count across the window, used as the divisor
 * for barHeightFraction. Returns 0 for an empty array or an all zero window so
 * every bar renders as an empty track rather than dividing by zero.
 */
export function peakMealCount(counts: ReadonlyArray<number>): number {
  let peak = 0;
  for (const c of counts) {
    const n = asCount(c);
    if (n > peak) peak = n;
  }
  return peak;
}

/**
 * Pure. The 0..1 bar height fraction for every day in the window, oldest to
 * newest, computed against the window's own peak. Length matches the input.
 * An empty or all zero window yields all zeros (every bar an empty track).
 */
export function barHeightFractions(counts: ReadonlyArray<number>): number[] {
  const peak = peakMealCount(counts);
  return counts.map((c) => barHeightFraction(c, peak));
}

/**
 * Pure. Short weekday labels (Sun..Sat form) for the seven day window ending
 * today, oldest to newest, so the final label is today. `now` is injected so
 * the labels are deterministic across machines and the local calendar day is
 * used. Returns exactly `length` labels (default 7).
 *
 * This is presentational formatting only: it derives display labels from the
 * current date and never reads a stored date or a meal record.
 *
 * @param now the current local instant
 * @param length number of trailing days to label (default 7)
 */
export function weekdayLabelsEndingToday(now: Date, length = 7): string[] {
  const labels: string[] = [];
  const base = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  for (let i = length - 1; i >= 0; i -= 1) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    labels.push(WEEKDAY_SHORT[d.getDay()]);
  }
  return labels;
}
