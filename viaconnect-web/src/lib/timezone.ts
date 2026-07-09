import type { SupabaseClient } from '@supabase/supabase-js';

import { reportSupabaseError } from '@/lib/utils/schema-drift';

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  } catch {
    return 'UTC';
  }
}

export function localDateString(timezone: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: timezone }).format(new Date());
}

// Prompt 210d P0-6: the profiles.timezone update payload, extracted into a
// pure builder so the write-shape test
// (src/lib/__tests__/profiles-write-shape.test.ts) can assert its keys
// against the live profiles columns plus the P0-6 migration columns. The key
// and value pass through unchanged.
export interface TimezoneSyncPayload {
  timezone: string;
}

export function buildTimezoneSyncPayload(timezone: string): TimezoneSyncPayload {
  return { timezone };
}

// Prompt 210d P0-6: timezone sync is best effort and fire-and-forget (the
// dashboard DailyCheckIn calls it without await), so syncTimezone must never
// reject. Route failures through the P0-1 classifier so schema drift
// (profiles.timezone absent live) becomes a reason-tagged safeLog.error
// instead of vanishing, but contain the deliberate strict-mode rethrow here.
// The drift log is emitted before the rethrow, so visibility is kept in
// every environment.
function reportTimezoneSyncError(error: unknown): void {
  try {
    reportSupabaseError('profiles.timezoneSync', error, { table: 'profiles' });
  } catch {
    // Strict-mode rethrow stops here; the sync stays non-blocking.
  }
}

export async function syncTimezone(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const tz = detectTimezone();
  try {
    // Prompt 210d P0-6: the update response error was previously discarded
    // (not even destructured), so the rejected write never surfaced anywhere.
    const { error } = await supabase
      .from('profiles')
      .update(buildTimezoneSyncPayload(tz))
      .eq('id', userId);
    if (error) {
      reportTimezoneSyncError(error);
    }
  } catch (error) {
    // Fail-open preserved: a thrown failure (network, abort) is reported
    // with the same scope and swallowed exactly as before.
    reportTimezoneSyncError(error);
  }
}
