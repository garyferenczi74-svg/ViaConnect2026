import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateReferralCode } from '@/lib/helix/referrals';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();
    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.helix.referral-code.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.helix.referral-code', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      const code = await withTimeout(
        getOrCreateReferralCode(supabase, user.id),
        10000,
        'api.helix.referral-code.get-or-create',
      );
      return NextResponse.json({ code });
    } catch (e) {
      if (isTimeoutError(e)) {
        safeLog.error('api.helix.referral-code', 'get-or-create timeout', { requestId, error: e });
        return NextResponse.json({ error: 'Operation timed out. Please try again.' }, { status: 504 });
      }
      safeLog.error('api.helix.referral-code', 'get-or-create failed', { requestId, error: e });
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Failed to create referral code' },
        { status: 500 },
      );
    }
  } catch (err) {
    safeLog.error('api.helix.referral-code', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
