// Prompt #98 Phase 3: Read the calling practitioner's attribution
// + benefit-redemption status.
//
// GET /api/practitioner/referrals/attribution-info
// Returns null when this practitioner has no attribution (i.e. they
// were not referred). Otherwise returns referrer practice name +
// redemption flags + notification preference.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

  const { data: attribution } = await sb
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
    .maybeSingle();

  if (!attribution) return NextResponse.json({ attribution: null });

  const { data: prefs } = await sb
    .from('practitioner_referral_notification_preferences')
    .select('allow_referrer_progress_notifications, opted_out_at, updated_at')
    .eq('attribution_id', attribution.id)
    .maybeSingle();

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
}
