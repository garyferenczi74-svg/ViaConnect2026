// Prompt #98 Phase 6: Resolve a fraud flag.
//
// POST /api/admin/practitioner-referrals/fraud-flags/[flagId]/resolve
//   body: { action: 'confirm_fraud'|'clear_benign'|'admin_override', reason }
//
// Delegates to the resolveFraudFlag orchestrator which consults the
// pure decision, then performs (atomically in sequence) the flag
// update, event void, clawback ledger write, systemic attribution
// void, and code deactivation as appropriate.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveFraudFlag } from '@/lib/practitioner-referral/fraud-resolution-orchestrator';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const schema = z.object({
  action: z.enum(['confirm_fraud', 'clear_benign', 'admin_override']),
  reason: z.string().min(20).max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { flagId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'api.admin.practitioner-referrals.fraud-flags.resolve.auth',
    );
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const { data: profile } = await withTimeout(
      (async () => sb.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.admin.practitioner-referrals.fraud-flags.resolve.profile',
    );
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    const result = await resolveFraudFlag(
      { flag_id: params.flagId, action: parsed.data.action, reason: parsed.data.reason },
      { supabase, admin_actor_id: user.id },
    );

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, decision: result.decision }, { status: 400 });
    }

    return NextResponse.json({ ok: true, decision: result.decision });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.practitioner-referrals.fraud-flags.resolve', 'request timed out', { error: err });
      return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
    }
    safeLog.error('api.admin.practitioner-referrals.fraud-flags.resolve', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
