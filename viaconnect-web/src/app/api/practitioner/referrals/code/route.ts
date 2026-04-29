// Prompt #98 Phase 2: Practitioner referral code (get-or-create).
//
// GET /api/practitioner/referrals/code
// Returns the calling practitioner's persistent referral code, creating
// it on first call. Refused unless practitioner.account_status='active'.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateReferralCode, buildReferralUrl } from '@/lib/practitioner-referral/code-generation';
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
        'api.practitioner.referrals.code.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.referrals.code', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const sb = supabase as any;
    const practitionerRes = await withTimeout(
      (async () => sb
        .from('practitioners')
        .select('id, practice_name, account_status')
        .eq('user_id', user.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.referrals.code.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    try {
      const result = await withTimeout(
        getOrCreateReferralCode({
          practitioner_id: practitioner.id,
          practice_name: practitioner.practice_name,
          account_status: practitioner.account_status,
          supabase,
        }),
        10000,
        'api.practitioner.referrals.code.get-or-create',
      );
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      return NextResponse.json({
        code: result.code,
        full_url: buildReferralUrl(result.code.code_slug, baseUrl),
        was_existing: result.was_existing,
      });
    } catch (e) {
      if (isTimeoutError(e)) {
        safeLog.error('api.practitioner.referrals.code', 'get-or-create timeout', { requestId, error: e });
        return NextResponse.json({ error: 'Operation timed out. Please try again.' }, { status: 503 });
      }
      safeLog.warn('api.practitioner.referrals.code', 'get-or-create rejected', { requestId, error: e });
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.referrals.code', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.referrals.code', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
