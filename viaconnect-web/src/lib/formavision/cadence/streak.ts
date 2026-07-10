// Prompt 211a Workstream 4 (Part 1) - Scan streak pure logic.
//
// The vision scan streak is the scan analogue of the compliance streak. This
// module computes the next streak state from a previous state and the date of a
// new scan, given the user's cadence window. It is:
//
//   * Pure and deterministic. Dates are injected as YYYY-MM-DD strings; there is
//     no Date.now() call inside the function. The same inputs always produce the
//     same output, so it is trivially unit-testable and safe on the server.
//   * Honest. It never fabricates a streak the dates do not support. A scan
//     outside the cadence window resets the streak to 1 rather than pretending
//     continuity. A stale (earlier than last) date is ignored, never rewinding.
//
// Persistence shape mirrors public.scan_streak / public.compliance_streaks
// (current_streak, longest_streak, last_scan_date, streak_started_at). Streak
// credit is written server-side in the award lane, never from the avatar
// surface (Helix invisibility, baseline Item 5).

/** Nominal gap for a weekly scan rhythm, in days. */
export const WEEKLY_WINDOW_DAYS = 7;

/** Nominal gap for a biweekly (every two weeks) scan rhythm, in days. */
export const BIWEEKLY_WINDOW_DAYS = 14;

/**
 * Extra days of tolerance added to the nominal window before a streak resets.
 * Life happens: a scan a day or two late should still extend the streak rather
 * than punish the user. Kept small so the streak stays meaningful.
 */
export const CADENCE_GRACE_DAYS = 2;

/**
 * Persisted scan streak state. Mirrors the public.scan_streak columns.
 * Dates are ISO calendar dates (YYYY-MM-DD) or null when never set.
 */
export interface ScanStreakState {
  currentStreak: number;
  longestStreak: number;
  /** ISO date (YYYY-MM-DD) of the most recent counted scan, or null. */
  lastScanDate: string | null;
  /** ISO date (YYYY-MM-DD) the current run began, or null. */
  streakStartedAt: string | null;
}

/**
 * Parses an ISO calendar date (YYYY-MM-DD) into a UTC-midnight epoch in whole
 * days. Using UTC midnight avoids timezone drift so a pure date difference is
 * exact. Throws on a malformed date so a bad caller fails loudly rather than
 * silently producing a wrong streak.
 */
function toEpochDay(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) {
    throw new Error(`computeStreakUpdate: invalid ISO date "${isoDate}", expected YYYY-MM-DD`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  return Math.floor(ms / 86400000);
}

/**
 * Computes the next scan streak state.
 *
 * Rules (deterministic, never fabricated):
 *   * Fresh state (no lastScanDate): the scan starts a streak at 1.
 *   * Same-day repeat (scanDate === lastScanDate): idempotent. State is
 *     returned unchanged so a double submission never double counts.
 *   * Out-of-order (scanDate strictly before lastScanDate): ignored. A stale
 *     date must not increment the count nor rewind lastScanDate.
 *   * Gap within cadenceWindowDays + CADENCE_GRACE_DAYS: extends the streak by 1
 *     and keeps the original streakStartedAt.
 *   * Gap beyond the tolerance: resets currentStreak to 1 and starts a new run
 *     at scanDate. longestStreak is always retained.
 *
 * longestStreak is raised only when the new currentStreak exceeds it.
 *
 * @param prev The previous persisted streak state.
 * @param scanDate ISO date (YYYY-MM-DD) of the new scan.
 * @param cadenceWindowDays The user's nominal rhythm in days (7 or 14).
 * @returns The next ScanStreakState. prev is not mutated.
 */
export function computeStreakUpdate(
  prev: ScanStreakState,
  scanDate: string,
  cadenceWindowDays: number,
): ScanStreakState {
  const scanDay = toEpochDay(scanDate);

  // Fresh state: this scan begins the streak.
  if (prev.lastScanDate === null) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(prev.longestStreak, 1),
      lastScanDate: scanDate,
      streakStartedAt: scanDate,
    };
  }

  const lastDay = toEpochDay(prev.lastScanDate);

  // Same day: idempotent. No double count.
  if (scanDay === lastDay) {
    return { ...prev };
  }

  // Out of order: an earlier date than the last counted scan is ignored.
  if (scanDay < lastDay) {
    return { ...prev };
  }

  const gapDays = scanDay - lastDay;
  const tolerance = cadenceWindowDays + CADENCE_GRACE_DAYS;

  if (gapDays <= tolerance) {
    // Inside the window (plus grace): extend.
    const currentStreak = prev.currentStreak + 1;
    return {
      currentStreak,
      longestStreak: Math.max(prev.longestStreak, currentStreak),
      lastScanDate: scanDate,
      streakStartedAt: prev.streakStartedAt ?? scanDate,
    };
  }

  // Beyond tolerance: the run is broken. Start fresh at 1, retain longest.
  return {
    currentStreak: 1,
    longestStreak: Math.max(prev.longestStreak, 1),
    lastScanDate: scanDate,
    streakStartedAt: scanDate,
  };
}
