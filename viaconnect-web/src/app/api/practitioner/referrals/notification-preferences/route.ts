// Prompt #98 Phase 3: Referred-practitioner notification preferences.
//
// PATCH /api/practitioner/referrals/notification-preferences
//   body: { allow_referrer_progress_notifications: boolean }
//
// Owned by the referred practitioner. When toggled to false the
// referrer stops receiving milestone notifications; reward vesting
// continues silently (Phase 4 dispatcher checks this flag).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const schema = z.object({
  allow_referrer_progress_notifications: z.boolean(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.practitioner.referrals.notification-preferences.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.referrals.notification-preferences', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    const sb = supabase as any;
    const practitionerRes = await withTimeout(
      (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
      8000,
      'api.practitioner.referrals.notification-preferences.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const existingRes = await withTimeout(
      (async () => sb
        .from('practitioner_referral_notification_preferences')
        .select('attribution_id, allow_referrer_progress_notifications')
        .eq('referred_practitioner_id', practitioner.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.referrals.notification-preferences.existing-load',
    );
    const existing = existingRes.data;
    if (!existing) {
      return NextResponse.json({ error: 'No referral attribution; nothing to configure' }, { status: 404 });
    }

    const wasEnabled = existing.allow_referrer_progress_notifications === true;
    const isEnabling = parsed.data.allow_referrer_progress_notifications === true;
    const justOptedOut = wasEnabled && !isEnabling;

    await withTimeout(
      (async () => sb
        .from('practitioner_referral_notification_preferences')
        .update({
          allow_referrer_progress_notifications: parsed.data.allow_referrer_progress_notifications,
          opted_out_at: isEnabling ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('referred_practitioner_id', practitioner.id))(),
      8000,
      'api.practitioner.referrals.notification-preferences.update',
    );

    // Phase 4 will hook a one-time notification to the referrer here on
    // the just-opted-out edge. For now we log so the dispatcher's contract
    // is documented and easy to grep.
    if (justOptedOut) {
      safeLog.info('api.practitioner.referrals.notification-preferences', 'practitioner opted out; referrer should receive silent-vesting notice', { requestId, practitionerId: practitioner.id });
    }

    return NextResponse.json({
      allow_referrer_progress_notifications: parsed.data.allow_referrer_progress_notifications,
      opted_out_just_now: justOptedOut,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.referrals.notification-preferences', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.referrals.notification-preferences', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
