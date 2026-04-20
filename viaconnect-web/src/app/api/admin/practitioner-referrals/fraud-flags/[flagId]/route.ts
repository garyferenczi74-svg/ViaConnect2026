// Prompt #98 Phase 6: Admin fraud-flag detail (for review UI).
//
// GET /api/admin/practitioner-referrals/fraud-flags/[flagId]

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { flagId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { data: flag } = await sb
    .from('practitioner_referral_fraud_flags')
    .select('*')
    .eq('id', params.flagId)
    .maybeSingle();
  if (!flag) return NextResponse.json({ error: 'Flag not found' }, { status: 404 });

  // Load linked entities in parallel.
  const [attributionRes, milestoneRes, codeRes, referrerRes, historicFlagsRes] = await Promise.all([
    flag.attribution_id
      ? sb.from('practitioner_referral_attributions')
          .select('id, status, attributed_at, referring_practitioner_id, referred_practitioner_id')
          .eq('id', flag.attribution_id).maybeSingle()
      : Promise.resolve({ data: null }),
    flag.milestone_event_id
      ? sb.from('practitioner_referral_milestone_events')
          .select('id, milestone_id, vesting_status, achieved_at, hold_expires_at, evidence, vested_at')
          .eq('id', flag.milestone_event_id).maybeSingle()
      : Promise.resolve({ data: null }),
    flag.referral_code_id
      ? sb.from('practitioner_referral_codes')
          .select('id, code, is_active')
          .eq('id', flag.referral_code_id).maybeSingle()
      : Promise.resolve({ data: null }),
    flag.practitioner_id
      ? sb.from('practitioners')
          .select('id, practice_name, display_name, account_status')
          .eq('id', flag.practitioner_id).maybeSingle()
      : Promise.resolve({ data: null }),
    flag.practitioner_id
      ? sb.from('practitioner_referral_fraud_flags')
          .select('id, flag_type, severity, status, created_at')
          .eq('practitioner_id', flag.practitioner_id)
          .neq('id', params.flagId)
          .order('created_at', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    flag,
    attribution: attributionRes.data,
    milestone_event: milestoneRes.data,
    referral_code: codeRes.data,
    referrer: referrerRes.data,
    historic_flags: historicFlagsRes.data ?? [],
  });
}
