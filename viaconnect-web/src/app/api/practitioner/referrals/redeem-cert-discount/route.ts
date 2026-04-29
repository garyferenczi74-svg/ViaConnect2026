// Prompt #98 Phase 3: Apply the referred-practitioner Level 2
// certification discount.
//
// POST /api/practitioner/referrals/redeem-cert-discount
//   body: { certification_level_id, base_fee_cents }

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { computeReferredCertDiscount } from '@/lib/practitioner-referral/benefit-redemption';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const schema = z.object({
  certification_level_id: z.string().min(1).max(60),
  base_fee_cents: z.number().int().min(0).max(1_000_000_00),
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
        'api.practitioner.referrals.redeem-cert-discount.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.referrals.redeem-cert-discount', 'auth timeout', { requestId, error: err });
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
      'api.practitioner.referrals.redeem-cert-discount.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const attributionRes = await withTimeout(
      (async () => sb
        .from('practitioner_referral_attributions')
        .select('id, status, referred_cert_discount_redeemed')
        .eq('referred_practitioner_id', practitioner.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.referrals.redeem-cert-discount.attribution-load',
    );
    const attribution = attributionRes.data;

    const result = computeReferredCertDiscount({
      certification_level_id: parsed.data.certification_level_id,
      base_fee_cents: parsed.data.base_fee_cents,
      already_redeemed: !!attribution?.referred_cert_discount_redeemed,
      attribution_active: attribution?.status === 'verified_active' || attribution?.status === 'pending_verification',
    });

    if (!result.eligible) {
      return NextResponse.json({
        ok: false,
        eligible: false,
        reason: result.reason,
        discount_cents: 0,
        discounted_fee_cents: parsed.data.base_fee_cents,
      });
    }

    await withTimeout(
      (async () => sb
        .from('practitioner_referral_attributions')
        .update({
          referred_cert_discount_redeemed: true,
          referred_cert_discount_redeemed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', attribution!.id))(),
      8000,
      'api.practitioner.referrals.redeem-cert-discount.persist',
    );

    return NextResponse.json({
      ok: true,
      eligible: true,
      discount_cents: result.discount_cents,
      discounted_fee_cents: result.discounted_fee_cents,
      applied_discount_percent: result.applied_discount_percent,
      attribution_id: attribution!.id,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.referrals.redeem-cert-discount', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.referrals.redeem-cert-discount', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
