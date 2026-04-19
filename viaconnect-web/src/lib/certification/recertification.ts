// Prompt #91 Phase 4: Recertification helpers.
//
// Pure functions over a CertificationRow snapshot. No DB. The reminder
// scheduler edge function calls these to decide whether to send a 90/60/
// 30/14/7/1-day-out reminder, and whether to transition lapsed
// certifications to 'expired'.

import type { CertificationStatus } from '@/lib/practitioner/taxonomy';

export interface CertificationRow {
  id: string;
  practitioner_id: string;
  certification_level_id: string;
  status: CertificationStatus;
  expires_at: string | null;
}

/** Spec offsets (days before expiry) at which a reminder is sent. */
export const REMINDER_OFFSETS_DAYS = [90, 60, 30, 14, 7, 1] as const;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntilExpiry(
  row: CertificationRow,
  now: Date = new Date(),
): number | null {
  if (!row.expires_at) return null;
  const expires = new Date(row.expires_at).getTime();
  return Math.round((expires - now.getTime()) / ONE_DAY_MS);
}

export function isCertExpired(
  row: CertificationRow,
  now: Date = new Date(),
): boolean {
  if (!row.expires_at) return false;
  return new Date(row.expires_at).getTime() < now.getTime();
}

/**
 * Returns the reminder offset (one of REMINDER_OFFSETS_DAYS) if the
 * certification is currently sitting at exactly that offset from expiry.
 * Returns null if no offset matches OR if the certification is not in the
 * 'certified' state (only certified rows are eligible for reminders).
 */
export function reminderWindowFor(
  row: CertificationRow,
  now: Date = new Date(),
): number | null {
  if (row.status !== 'certified') return null;
  const days = daysUntilExpiry(row, now);
  if (days === null) return null;
  for (const offset of REMINDER_OFFSETS_DAYS) {
    if (days === offset) return offset;
  }
  return null;
}

/**
 * Convenience filter for the cron job: from a list of certifications
 * scoped to "certified rows", return the (row, offset) tuples that should
 * receive a reminder right now.
 */
export function dueReminders(
  rows: CertificationRow[],
  now: Date = new Date(),
): Array<{ row: CertificationRow; offsetDays: number }> {
  const out: Array<{ row: CertificationRow; offsetDays: number }> = [];
  for (const row of rows) {
    const offset = reminderWindowFor(row, now);
    if (offset !== null) out.push({ row, offsetDays: offset });
  }
  return out;
}
