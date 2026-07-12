// Prompt 211a Workstream 4 (Part 2) - Time-of-day bucketing (pure).
//
// Maps a scan timestamp to the coarse TimeOfDayBucket the cadence logic uses.
// Kept tiny and pure so both the fingerprint history assembly and the cadence
// history assembly derive the bucket the same way, and so it is unit testable.
// Buckets follow common wall-clock intuition:
//   morning   05:00 to 11:59
//   afternoon 12:00 to 16:59
//   evening   17:00 to 20:59
//   night     21:00 to 04:59

import type { TimeOfDayBucket } from './fingerprint';

/**
 * Buckets an hour-of-day (0..23) into a TimeOfDayBucket. Pure and total: any
 * finite hour maps to a bucket; out-of-range or non-finite input falls back to
 * 'morning' (a safe, non-alarming default) rather than throwing.
 */
export function bucketHour(hour: number): TimeOfDayBucket {
  if (!Number.isFinite(hour)) return 'morning';
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

/**
 * Derives the TimeOfDayBucket from an ISO timestamp (or Date). Uses the local
 * hour so the bucket matches the user's felt time of day. An unparseable input
 * falls back to 'morning' rather than throwing (fail-soft for display).
 *
 * @param isoOrDate An ISO timestamp string or a Date.
 */
export function timeOfDayFromTimestamp(isoOrDate: string | Date): TimeOfDayBucket {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  const hour = d.getHours();
  if (Number.isNaN(hour)) return 'morning';
  return bucketHour(hour);
}
