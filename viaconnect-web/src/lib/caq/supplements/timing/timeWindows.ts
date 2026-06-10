// =============================================================================
// Prompt 185a slice 3 (2026-06-09): timezone anchoring. Resolve the Morning /
// Afternoon / Evening clock windows from the user's wake and wind-down times so
// the schedule buckets read against the user's real day. Pure: callers pass the
// times already resolved in the user's timezone (profiles.sleep_wake = wake,
// profiles.sleep_start = wind-down) and the defaults when not yet collected.
//
// Morning starts at wake; Evening ends at wind-down; Afternoon bridges the
// middle. The helper is timezone-agnostic (the caller owns tz resolution via
// src/lib/timezone.ts). No emojis. No em or en dashes.
// =============================================================================

import type { TimeOfDay } from './types';

export const DEFAULT_WAKE = '07:00';
export const DEFAULT_WIND_DOWN = '22:00';

export interface BucketWindow {
  start: string; // HH:MM
  end: string;   // HH:MM
}

export type BucketWindows = Record<TimeOfDay, BucketWindow>;

function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return Number.NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return Number.NaN;
  return h * 60 + min;
}

function toHHMM(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const min = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Resolve the three bucket windows from wake + wind-down. Falls back to
 * 07:00 / 22:00 when either is missing, unparseable, or yields a waking window
 * shorter than three hours. Morning runs wake to the first third, Afternoon the
 * middle third, Evening the last third up to wind-down.
 */
export function resolveBucketWindows(
  wakeTime?: string | null,
  windDownTime?: string | null,
): BucketWindows {
  let wake = toMinutes(wakeTime ?? DEFAULT_WAKE);
  let wind = toMinutes(windDownTime ?? DEFAULT_WIND_DOWN);
  if (!Number.isFinite(wake)) wake = toMinutes(DEFAULT_WAKE);
  if (!Number.isFinite(wind)) wind = toMinutes(DEFAULT_WIND_DOWN);
  let span = wind - wake;
  if (span < 180) {
    wake = toMinutes(DEFAULT_WAKE);
    wind = toMinutes(DEFAULT_WIND_DOWN);
    span = wind - wake;
  }
  const third = span / 3;
  return {
    morning: { start: toHHMM(wake), end: toHHMM(wake + third) },
    afternoon: { start: toHHMM(wake + third), end: toHHMM(wake + 2 * third) },
    evening: { start: toHHMM(wake + 2 * third), end: toHHMM(wind) },
  };
}

/**
 * Which bucket a given HH:MM falls into, given the resolved windows. Times
 * before the morning end are Morning, before the afternoon end are Afternoon,
 * otherwise Evening.
 */
export function bucketForTime(hhmm: string, windows: BucketWindows): TimeOfDay {
  const t = toMinutes(hhmm);
  if (!Number.isFinite(t)) return 'morning';
  if (t < toMinutes(windows.morning.end)) return 'morning';
  if (t < toMinutes(windows.afternoon.end)) return 'afternoon';
  return 'evening';
}
