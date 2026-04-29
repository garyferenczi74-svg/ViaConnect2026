// Prompt #98 Phase 3: Apply the referred-practitioner first-month
// subscription discount.
//
// POST /api/practitioner/referrals/redeem-subscription-discount
//   body: { tier_id, monthly_price_cents }
//
// Called by the subscription checkout flow at the moment of first
// charge. Idempotent: a second call after redemption returns
// eligible=false with reason.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { computeReferredSubscriptionDiscount } from '@/lib/practitioner-referral/benefit-redemption';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const schema = z.object({
  tier_id: z.string().min(1).max(60),
  monthly_price_cents: z.number().int().min(0).max(100_000_00),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.practitioner.referrals.redeem-subscription-discount.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.referrals.redeem-subscription-discount', 'auth timeout', { requestId, error: err });
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
      'api.practitioner.referrals.redeem-subscription-discount.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const attributionRes = await withTimeout(
      (async () => sb
        .from('practitioner_referral_attributions')
        .select('id, status, referred_first_month_discount_redeemed')
        .eq('referred_practitioner_id', practitioner.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.referrals.redeem-subscription-discount.attribution-load',
    );
    const attribution = attributionRes.data;

    const result = computeReferredSubscriptionDiscount({
      tier_id: parsed.data.tier_id,
      monthly_price_cents: parsed.data.monthly_price_cents,
      already_redeemed: !!attribution?.referred_first_month_discount_redeemed,
      attribution_active: attribution?.status === 'verified_active' || attribution?.status === 'pending_verification',
    });

    if (!result.eligible) {
      return NextResponse.json({
        ok: false,
        eligible: false,
        reason: result.reason,
        discount_cents: 0,
        discounted_price_cents: parsed.data.monthly_price_cents,
      });
    }

    // Persist the redemption flag.
    await withTimeout(
      (async () => sb
        .from('practitioner_referral_attributions')
        .update({
          referred_first_month_discount_redeemed: true,
          referred_first_month_discount_redeemed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', attribution!.id))(),
      8000,
      'api.practitioner.referrals.redeem-subscription-discount.persist',
    );

    return NextResponse.json({
      ok: true,
      eligible: true,
      discount_cents: result.discount_cents,
      discounted_price_cents: result.discounted_price_cents,
      applied_discount_percent: result.applied_discount_percent,
      attribution_id: attribution!.id,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.referrals.redeem-subscription-discount', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.referrals.redeem-subscription-discount', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
