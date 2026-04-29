// Prompt #98 Phase 6: Admin fraud-flag detail (for review UI).
//
// GET /api/admin/practitioner-referrals/fraud-flags/[flagId]

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { flagId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'api.admin.practitioner-referrals.fraud-flags.detail.auth',
    );
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const { data: profile } = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.admin.practitioner-referrals.fraud-flags.detail.profile',
    );
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { data: flag } = await withTimeout(
      (async () =>
        sb
          .from('practitioner_referral_fraud_flags')
          .select('*')
          .eq('id', params.flagId)
          .maybeSingle())(),
      8000,
      'api.admin.practitioner-referrals.fraud-flags.detail.flag',
    );
    if (!flag) return NextResponse.json({ error: 'Flag not found' }, { status: 404 });

    // Load linked entities in parallel.
    const [attributionRes, milestoneRes, codeRes, referrerRes, historicFlagsRes] = await withTimeout(
      Promise.all([
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
      ]),
      10000,
      'api.admin.practitioner-referrals.fraud-flags.detail.linked',
    );

    return NextResponse.json({
      flag,
      attribution: attributionRes.data,
      milestone_event: milestoneRes.data,
      referral_code: codeRes.data,
      referrer: referrerRes.data,
      historic_flags: historicFlagsRes.data ?? [],
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.practitioner-referrals.fraud-flags.detail', 'request timed out', { error: err });
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
    safeLog.error('api.admin.practitioner-referrals.fraud-flags.detail', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
