// Prompt #98 Phase 6: Admin fraud-flag list.
//
// GET /api/admin/practitioner-referrals/fraud-flags
//   ?status=pending_review|confirmed_fraud|cleared_benign|admin_override|all
//   &limit=50
//
// Returns the flag list with linked attribution + referrer name for
// the review queue UI.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const VALID_STATUSES = ['pending_review', 'confirmed_fraud', 'cleared_benign', 'admin_override'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'api.admin.practitioner-referrals.fraud-flags.list.auth',
    );
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const { data: profile } = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.admin.practitioner-referrals.fraud-flags.list.profile',
    );
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status') ?? 'pending_review';
    const limit = Math.max(1, Math.min(500, parseInt(url.searchParams.get('limit') ?? '100', 10)));

    let q = sb
      .from('practitioner_referral_fraud_flags')
      .select(`
        id, flag_type, severity, status, evidence, auto_detected, created_at,
        attribution_id, milestone_event_id, practitioner_id,
        reviewed_at, reviewed_by, review_notes,
        practitioners!practitioner_id (practice_name, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (statusParam !== 'all') {
      if (!VALID_STATUSES.includes(statusParam)) {
        return NextResponse.json({ error: `Unknown status ${statusParam}` }, { status: 400 });
      }
      q = q.eq('status', statusParam);
    }

    const { data, error } = await withTimeout(
      (async () => q)(),
      10000,
      'api.admin.practitioner-referrals.fraud-flags.list.query',
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ flags: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.practitioner-referrals.fraud-flags.list', 'request timed out', { error: err });
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
    safeLog.error('api.admin.practitioner-referrals.fraud-flags.list', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
