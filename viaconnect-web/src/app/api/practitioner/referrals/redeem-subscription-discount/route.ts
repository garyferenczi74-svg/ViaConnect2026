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

export const runtime = 'nodejs';

const schema = z.object({
  tier_id: z.string().min(1).max(60),
  monthly_price_cents: z.number().int().min(0).max(100_000_00),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners').select('id').eq('user_id', user.id).maybeSingle();
  if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

  const { data: attribution } = await sb
    .from('practitioner_referral_attributions')
    .select('id, status, referred_first_month_discount_redeemed')
    .eq('referred_practitioner_id', practitioner.id)
    .maybeSingle();

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
  await sb
    .from('practitioner_referral_attributions')
    .update({
      referred_first_month_discount_redeemed: true,
      referred_first_month_discount_redeemed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', attribution!.id);

  return NextResponse.json({
    ok: true,
    eligible: true,
    discount_cents: result.discount_cents,
    discounted_price_cents: result.discounted_price_cents,
    applied_discount_percent: result.applied_discount_percent,
    attribution_id: attribution!.id,
  });
}
