// Prompt 211a Workstream 4 (Part 2) - Scan streak DISPLAY formatting (pure).
//
// The consumer-only streak surface reads scan_streak (current_streak,
// longest_streak) and shows it with tasteful milestones. This module is the
// pure formatting brain: given the streak numbers it returns the label, the
// milestone tier (if any), and a warm, dash-free line. It is:
//   * Pure and deterministic (no IO, no Date.now).
//   * Honest: a zero / absent streak returns a null display (the surface renders
//     nothing rather than a fake "0 day streak"). Milestones are only awarded at
//     genuine thresholds; nothing is inflated.
//   * Read-only: this NEVER credits anything. Streak credit is a server award
//     lane concern (baseline Item 5); the visual surface only reads and formats.

/** A tasteful milestone tier reached by the current streak, or null. */
export type StreakMilestone = 'first' | 'week' | 'fortnight' | 'month' | 'quarter';

/** The milestone thresholds (in consecutive scans), ascending. */
export const STREAK_MILESTONES: ReadonlyArray<{ tier: StreakMilestone; atLeast: number; label: string }> = [
  { tier: 'quarter', atLeast: 12, label: 'Twelve in a row' },
  { tier: 'month', atLeast: 8, label: 'Eight in a row' },
  { tier: 'fortnight', atLeast: 4, label: 'Four in a row' },
  { tier: 'week', atLeast: 2, label: 'Back to back' },
  { tier: 'first', atLeast: 1, label: 'First scan logged' },
];

/** The formatted streak display, or null when there is nothing honest to show. */
export interface StreakDisplay {
  /** e.g. "5 scan streak" or "1 scan" (singular). */
  label: string;
  /** The milestone tier reached, or null when between milestones. */
  milestone: StreakMilestone | null;
  /** The milestone label when a milestone is reached, else null. */
  milestoneLabel: string | null;
  /** A warm, dash-free supporting line. */
  caption: string;
  /** True when the current streak ties or beats the user's own best. */
  isPersonalBest: boolean;
}

/**
 * Formats a scan streak for display. Returns null when currentStreak <= 0 so the
 * surface renders nothing (honest: no fabricated "0 day streak").
 *
 * @param currentStreak The current run length (scan_streak.current_streak).
 * @param longestStreak The best run ever (scan_streak.longest_streak).
 * @returns A StreakDisplay, or null when there is no streak to show.
 */
export function formatStreakDisplay(
  currentStreak: number,
  longestStreak: number,
): StreakDisplay | null {
  if (!Number.isFinite(currentStreak) || currentStreak <= 0) {
    return null;
  }

  const label = currentStreak === 1 ? '1 scan' : `${currentStreak} scan streak`;

  const reached = STREAK_MILESTONES.find((m) => currentStreak >= m.atLeast) ?? null;
  const milestone = reached ? reached.tier : null;
  const milestoneLabel = reached ? reached.label : null;

  const isPersonalBest = currentStreak >= Math.max(longestStreak, 0) && currentStreak > 1;

  let caption: string;
  if (currentStreak === 1) {
    caption = 'A great start. One scan on the board.';
  } else if (isPersonalBest) {
    caption = 'This is your best run yet. Lovely consistency.';
  } else {
    caption = 'Steady scanning keeps your progress picture honest.';
  }

  return { label, milestone, milestoneLabel, caption, isPersonalBest };
}
