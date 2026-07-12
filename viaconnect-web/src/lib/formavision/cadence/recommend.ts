// Prompt 211a Workstream 4 (Part 1) - Scan cadence recommendation pure logic.
//
// recommendCadence looks at the user's own scan history and gently suggests a
// rhythm (weekly or biweekly), a next-due date, and a reminder time of day that
// defaults to WHEN THEY ACTUALLY SCAN, not a hardcoded generic time. It is:
//
//   * Pure and deterministic. The clock is injected as nowMs; there is no
//     Date.now() inside the function.
//   * Never-nagging. The result is an opt-in suggestion (isSuggestion is always
//     true); the caller decides whether to surface it, and nothing here writes a
//     reminder or a nudge.
//   * Honest. It returns null when history is too thin to recommend anything,
//     rather than inventing a cadence the data does not support (RULE 9).
//
// The Part 2 follow-up (UI + cron nudges) consumes this suggestion; this module
// only computes it.

import type { TimeOfDayBucket } from './fingerprint';
import { WEEKLY_WINDOW_DAYS, BIWEEKLY_WINDOW_DAYS } from './streak';

export type { TimeOfDayBucket };

/** Rhythm the user is nudged toward. */
export type CadenceRhythm = 'weekly' | 'biweekly';

/** A minimal history row: the scan date and the time bucket it was taken in. */
export interface ScanHistoryEntry {
  /** ISO calendar date (YYYY-MM-DD). */
  scanDate: string;
  timeOfDay: TimeOfDayBucket;
}

/** A gentle, opt-in cadence suggestion built from the user's own history. */
export interface CadenceRecommendation {
  rhythm: CadenceRhythm;
  /** ISO date (YYYY-MM-DD) one rhythm-length after the most recent scan. */
  nextDueDate: string;
  /** Reminder time defaulting to the user's dominant historical scan time. */
  defaultReminderTimeOfDay: TimeOfDayBucket;
  /** Always true: this is a suggestion, never a demand. */
  isSuggestion: true;
  /** Short, warm, dash-free explanation. */
  reason: string;
}

/** Minimum prior scans required before a cadence can be suggested. */
export const MIN_HISTORY_FOR_CADENCE = 3;

/**
 * Midpoint (in days) between the weekly and biweekly windows. A median gap at or
 * below this rounds to weekly; above it rounds to biweekly.
 */
const WEEKLY_BIWEEKLY_SPLIT_DAYS = (WEEKLY_WINDOW_DAYS + BIWEEKLY_WINDOW_DAYS) / 2;

function toEpochDay(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) {
    throw new Error(`recommendCadence: invalid ISO date "${isoDate}", expected YYYY-MM-DD`);
  }
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Math.floor(ms / 86400000);
}

function epochDayToIso(day: number): string {
  const d = new Date(day * 86400000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const date = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/** Median of a numeric list. list must be non-empty. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Most frequent time bucket in the history (ties broken by most recent use). */
function dominantTimeOfDay(entries: ScanHistoryEntry[]): TimeOfDayBucket {
  const count = new Map<TimeOfDayBucket, number>();
  const latestDay = new Map<TimeOfDayBucket, number>();
  for (const e of entries) {
    count.set(e.timeOfDay, (count.get(e.timeOfDay) ?? 0) + 1);
    const day = toEpochDay(e.scanDate);
    latestDay.set(e.timeOfDay, Math.max(latestDay.get(e.timeOfDay) ?? -Infinity, day));
  }
  let best: TimeOfDayBucket | null = null;
  let bestCount = -1;
  let bestLatest = -Infinity;
  for (const [bucket, c] of count) {
    const latest = latestDay.get(bucket) ?? -Infinity;
    if (c > bestCount || (c === bestCount && latest > bestLatest)) {
      best = bucket;
      bestCount = c;
      bestLatest = latest;
    }
  }
  return best as TimeOfDayBucket;
}

/**
 * Recommends a gentle scan cadence from the user's own history.
 *
 * The rhythm is chosen from the median gap between consecutive scans: a median
 * at or below the weekly/biweekly midpoint suggests weekly, otherwise biweekly.
 * The reminder time defaults to the user's dominant historical scan time. The
 * next-due date is one rhythm-length after their most recent scan.
 *
 * Returns null when there are fewer than MIN_HISTORY_FOR_CADENCE scans: with too
 * little history no honest recommendation can be made.
 *
 * @param scanHistory The user's scans (any order). Dates are ISO (YYYY-MM-DD).
 * @param nowMs Injected clock (epoch ms). Used only for determinism guarantees;
 *   the next-due date is anchored to the most recent scan, not to now.
 * @returns A CadenceRecommendation, or null when history is too thin.
 */
export function recommendCadence(
  scanHistory: ScanHistoryEntry[],
  nowMs: number,
): CadenceRecommendation | null {
  // nowMs is accepted so the signature is clock-injected and future reminder
  // math stays deterministic; referenced here to keep the contract explicit.
  void nowMs;

  if (scanHistory.length < MIN_HISTORY_FOR_CADENCE) {
    return null;
  }

  const days = scanHistory.map((e) => toEpochDay(e.scanDate)).sort((a, b) => a - b);

  const gaps: number[] = [];
  for (let i = 1; i < days.length; i += 1) {
    gaps.push(days[i] - days[i - 1]);
  }

  // gaps has at least MIN_HISTORY_FOR_CADENCE - 1 (>= 2) entries here.
  const medianGap = median(gaps);
  const rhythm: CadenceRhythm = medianGap <= WEEKLY_BIWEEKLY_SPLIT_DAYS ? 'weekly' : 'biweekly';
  const rhythmDays = rhythm === 'weekly' ? WEEKLY_WINDOW_DAYS : BIWEEKLY_WINDOW_DAYS;

  const lastDay = days[days.length - 1];
  const nextDueDate = epochDayToIso(lastDay + rhythmDays);

  const defaultReminderTimeOfDay = dominantTimeOfDay(scanHistory);

  const rhythmWord = rhythm === 'weekly' ? 'once a week' : 'every couple of weeks';
  const reason =
    `You tend to scan about ${rhythmWord} in the ${defaultReminderTimeOfDay}, so if a gentle reminder around then would help, ` +
    'I can nudge you when your next one is due. Totally up to you.';

  return {
    rhythm,
    nextDueDate,
    defaultReminderTimeOfDay,
    isSuggestion: true,
    reason,
  };
}
