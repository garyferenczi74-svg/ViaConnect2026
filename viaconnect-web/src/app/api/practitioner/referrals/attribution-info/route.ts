// Prompt #98 Phase 3: Read the calling practitioner's attribution
// + benefit-redemption status.
//
// GET /api/practitioner/referrals/attribution-info
// Returns null when this practitioner has no attribution (i.e. they
// were not referred). Otherwise returns referrer practice name +
// redemption flags + notification preference.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.practitioner.referrals.attribution-info.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.referrals.attribution-info', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const practitionerRes = await withTimeout(
      (async () => sb
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.referrals.attribution-info.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const attributionRes = await withTimeout(
      (async () => sb
        .from('practitioner_referral_attributions')
        .select(`
          id, status,
          referring_practitioner_id,
          referred_first_month_discount_redeemed,
          referred_first_month_discount_redeemed_at,
          referred_cert_discount_redeemed,
          referred_cert_discount_redeemed_at,
          attributed_at,
          practitioners:referring_practitioner_id (practice_name)
        `)
        .eq('referred_practitioner_id', practitioner.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.referrals.attribution-info.attribution-load',
    );
    const attribution = attributionRes.data;

    if (!attribution) return NextResponse.json({ attribution: null });

    const prefsRes = await withTimeout(
      (async () => sb
        .from('practitioner_referral_notification_preferences')
        .select('allow_referrer_progress_notifications, opted_out_at, updated_at')
        .eq('attribution_id', attribution.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.referrals.attribution-info.prefs-load',
    );
    const prefs = prefsRes.data;

    return NextResponse.json({
    attribution: {
      id: attribution.id,
      status: attribution.status,
      referring_practice_name: attribution.practitioners?.practice_name ?? null,
      attributed_at: attribution.attributed_at,
      first_month_discount: {
        redeemed: !!attribution.referred_first_month_discount_redeemed,
        redeemed_at: attribution.referred_first_month_discount_redeemed_at,
      },
      cert_discount: {
        redeemed: !!attribution.referred_cert_discount_redeemed,
        redeemed_at: attribution.referred_cert_discount_redeemed_at,
      },
        notification_preferences: prefs ?? {
          allow_referrer_progress_notifications: true,
          opted_out_at: null,
          updated_at: null,
        },
      },
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.referrals.attribution-info', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.referrals.attribution-info', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
