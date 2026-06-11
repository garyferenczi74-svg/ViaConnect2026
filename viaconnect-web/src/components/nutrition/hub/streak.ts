// Prompt 183 Task 2 (2026-06-10): My Nutrition hub streak math.
//
// Pure, total function. Given the per-day meal counts for the last 7
// local days ordered oldest to newest (index 6 is today), returns the
// current consecutive run of days that have at least one meal and that
// ENDS TODAY.
//
// Rule: if today (the last element) has zero meals, the streak is 0.
// Otherwise count backward from today while the count stays at one or
// more, stopping at the first zero. The result is capped at 7.
//
// Total over bad input: an empty or short array, or one whose last
// element is missing or non-positive, returns 0. No throw, no NaN.

const MAX_STREAK_DAYS = 7;

function asCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return value;
}

/**
 * Returns the consecutive run of days with one or more meals ending
 * today. See file header for the exact rule. Pure and total.
 *
 * @param dailyMealCounts meal counts for the last 7 local days, oldest
 *   to newest, where the final element is today.
 */
export function computeConsecutiveMealStreak(dailyMealCounts: number[]): number {
  if (!Array.isArray(dailyMealCounts) || dailyMealCounts.length === 0) {
    return 0;
  }
  let streak = 0;
  for (let i = dailyMealCounts.length - 1; i >= 0; i -= 1) {
    if (asCount(dailyMealCounts[i]) >= 1) {
      streak += 1;
      if (streak >= MAX_STREAK_DAYS) return MAX_STREAK_DAYS;
    } else {
      break;
    }
  }
  return streak;
}

export default computeConsecutiveMealStreak;
