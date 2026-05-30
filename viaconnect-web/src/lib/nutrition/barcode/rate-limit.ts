/**
 * Prompt 170l Phase 1a: per-user daily OFF lookup rate limit.
 *
 * Gate 4: server-side enforcement of 200 lookups/user/day per spec §3.5.
 * Counter table user_off_lookups (composite PK user_id + date).
 *
 * /api/nutrition/barcode/lookup calls checkRateLimit before any cache or OFF
 * read. Cache hits do NOT increment the counter; only OFF round-trips count
 * toward the 200 cap (OFF-citizenship reasoning: cache hits are not OFF load).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { BARCODE_OFF_LOOKUPS_PER_DAY_LIMIT } from './feature-flags';

const RATE_LIMIT_TABLE = 'user_off_lookups';

export interface RateLimitStatus {
  allowed: boolean;
  current: number;
  limit: number;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkRateLimit(
  userId: string,
  requestId: string,
): Promise<RateLimitStatus> {
  const supabase = createAdminClient();
  const date = todayDateString();

  const { data, error } = await supabase
    .from(RATE_LIMIT_TABLE)
    .select('count')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    safeLog.warn('nutrition.barcode.rate_limit.read_error', 'rate-limit read failed', {
      request_id: requestId,
      user_id: userId,
      error: error.message,
    });
    // Fail-open on infra error; better UX than blocking on read failure.
    return {
      allowed: true,
      current: 0,
      limit: BARCODE_OFF_LOOKUPS_PER_DAY_LIMIT,
    };
  }

  const current = data?.count ?? 0;
  return {
    allowed: current < BARCODE_OFF_LOOKUPS_PER_DAY_LIMIT,
    current,
    limit: BARCODE_OFF_LOOKUPS_PER_DAY_LIMIT,
  };
}

export async function incrementRateLimit(
  userId: string,
  requestId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const date = todayDateString();
  const now = new Date().toISOString();

  // Atomic increment via Postgres function (lands in same migration).
  const { error } = await supabase.rpc('increment_user_off_lookup', {
    p_user_id: userId,
    p_date: date,
    p_updated_at: now,
  });

  if (error) {
    safeLog.warn('nutrition.barcode.rate_limit.increment_error', 'rate-limit increment failed', {
      request_id: requestId,
      user_id: userId,
      error: error.message,
    });
  }
}
