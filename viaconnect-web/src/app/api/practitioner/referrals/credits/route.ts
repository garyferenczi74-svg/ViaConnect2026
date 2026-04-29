// Prompt #98 Phase 5: Practitioner-facing credit balance + history.
//
// GET /api/practitioner/referrals/credits
// Returns:
//   balance:  { current, lifetime_earned, lifetime_applied, pending_hold }
//   entries:  the last 200 ledger entries newest first
//   holds:    pending milestone events (not yet vested) with expected amounts

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
        'api.practitioner.referrals.credits.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.referrals.credits', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const practitionerRes = await withTimeout(
      (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
      8000,
      'api.practitioner.referrals.credits.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const [balanceRes, entriesRes, holdsRes] = await withTimeout(
      Promise.all([
        sb.from('practitioner_referral_credit_balances')
          .select('current_balance_cents, lifetime_earned_cents, lifetime_applied_cents, pending_hold_cents, last_updated_at')
          .eq('practitioner_id', practitioner.id).maybeSingle(),
        sb.from('practitioner_referral_credit_ledger')
          .select('id, entry_type, amount_cents, running_balance_cents, milestone_event_id, applied_to_reference_type, applied_to_reference_id, tax_year, notes, admin_reason, created_at')
          .eq('practitioner_id', practitioner.id)
          .order('created_at', { ascending: false })
          .limit(200),
        sb.from('practitioner_referral_milestone_events')
          .select(`
            id, milestone_id, hold_expires_at, achieved_at,
            practitioner_referral_attributions!inner (referring_practitioner_id),
            practitioner_referral_milestones!inner (reward_amount_cents, display_name)
          `)
          .eq('vesting_status', 'pending_hold')
          .eq('practitioner_referral_attributions.referring_practitioner_id', practitioner.id),
      ]),
      10000,
      'api.practitioner.referrals.credits.parallel-load',
    );

  const balance = balanceRes.data ?? {
    current_balance_cents: 0,
    lifetime_earned_cents: 0,
    lifetime_applied_cents: 0,
    pending_hold_cents: 0,
    last_updated_at: null,
  };
  const entries = (entriesRes.data ?? []) as Array<Record<string, unknown>>;
  const holds = ((holdsRes.data ?? []) as Array<{
    id: string; milestone_id: string; hold_expires_at: string; achieved_at: string;
    practitioner_referral_milestones: { reward_amount_cents: number; display_name: string };
  }>).map((h) => ({
    id: h.id,
    milestone_id: h.milestone_id,
    milestone_display_name: h.practitioner_referral_milestones.display_name,
    reward_amount_cents: h.practitioner_referral_milestones.reward_amount_cents,
    hold_expires_at: h.hold_expires_at,
    achieved_at: h.achieved_at,
  }));

  const pending_hold_cents_fresh = holds.reduce((s, h) => s + h.reward_amount_cents, 0);

    return NextResponse.json({
      balance: { ...balance, pending_hold_cents: pending_hold_cents_fresh },
      entries,
      holds,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.referrals.credits', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.referrals.credits', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
