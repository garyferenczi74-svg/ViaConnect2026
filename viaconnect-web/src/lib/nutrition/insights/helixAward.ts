// Prompt 192 Task 3: Helix award stub for the weekly insights digest.
//
// Launch state: the insights_helix_award flag is OFF, so this is a logged
// no-op. When the flag flips on, the FIRST weekly digest review of each
// ISO week earns exactly one helix_transactions row, mirroring the
// helix-bridge insert shape (type 'earn', source = event key,
// event_type_id = event key, metadata.event_key). Once per week is
// enforced by a metadata.week_key containment check before insert.
//
// Before enabling the flag: a helix_earning_event_types seed row for
// 'insights_weekly_digest_review' must exist (event_type_id references
// that table, same dependency as the NutriVision and barcode event keys).
//
// Consumer portal only per the Helix scoping rule: practitioner surfaces
// never see token events. Best effort by contract: never throws.

import type { SupabaseClient } from '@supabase/supabase-js';
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/utils/with-timeout';

const SCOPE = 'insights.helix-award';
const DB_TIMEOUT_MS = 4000;

export const INSIGHTS_DIGEST_SOURCE = 'insights_weekly_digest_review';

// Placeholder amount: the final value awaits Gary sign off before the
// insights_helix_award flag is ever enabled.
export const DIGEST_AWARD_AMOUNT = 10;

/** ISO 8601 week key (for example 2026-W24) of an ISO instant, UTC based. */
export function isoWeekKey(iso: string): string {
  const d = new Date(iso);
  const probe = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = probe.getUTCDay() || 7; // Monday 1 .. Sunday 7
  probe.setUTCDate(probe.getUTCDate() + 4 - dayNum); // shift to the week's Thursday
  const yearStart = new Date(Date.UTC(probe.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((probe.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${probe.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function awardFirstWeeklyDigestReview(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  if (!isFeatureEnabled('insights_helix_award')) {
    safeLog.info(SCOPE, 'flag off, award skipped', { userId });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;
  const weekKey = isoWeekKey(new Date().toISOString());

  try {
    const { data, error } = await withTimeout(
      Promise.resolve(
        sb
          .from('helix_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('source', INSIGHTS_DIGEST_SOURCE)
          .contains('metadata', { week_key: weekKey })
          .limit(1),
      ),
      DB_TIMEOUT_MS,
      `${SCOPE}.prior-check`,
    );
    if (error) throw new Error(error.message);
    if (Array.isArray(data) && data.length > 0) {
      safeLog.info(SCOPE, 'already awarded this week, skipped', { userId, weekKey });
      return;
    }

    const { error: insertError } = await withTimeout(
      Promise.resolve(
        sb.from('helix_transactions').insert({
          user_id: userId,
          amount: DIGEST_AWARD_AMOUNT,
          type: 'earn',
          source: INSIGHTS_DIGEST_SOURCE,
          description: 'Weekly insights digest reviewed',
          event_type_id: INSIGHTS_DIGEST_SOURCE,
          metadata: {
            event_key: INSIGHTS_DIGEST_SOURCE,
            week_key: weekKey,
            source: 'insights',
          },
        }),
      ),
      DB_TIMEOUT_MS,
      `${SCOPE}.insert`,
    );
    if (insertError) throw new Error(insertError.message);
    safeLog.info(SCOPE, 'digest review awarded', {
      userId,
      weekKey,
      amount: DIGEST_AWARD_AMOUNT,
    });
  } catch (err) {
    safeLog.warn(SCOPE, 'award failed', { userId, weekKey, err });
  }
}
