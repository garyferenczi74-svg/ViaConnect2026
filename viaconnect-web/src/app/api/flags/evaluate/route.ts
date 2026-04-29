// Prompt #93 Phase 3: client flag evaluation endpoint.
//
// GET /api/flags/evaluate?feature=<featureId>
// Returns a FlagEvaluationResult. Routes through the cached evaluation
// engine so client and server see identical state within the 60s TTL.
// Never returns Helix internals — the flag system intentionally knows
// nothing about Helix balances, tiers, or rewards.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluateFlagCached } from '@/lib/flags/cache';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const featureId = request.nextUrl.searchParams.get('feature');
    if (!featureId) {
      return NextResponse.json({ error: 'Missing feature query parameter' }, { status: 400 });
    }

    const supabase = createClient();
    let userData;
    try {
      userData = (await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.flags.evaluate.auth',
      )).data;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.flags.evaluate', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    const userId = userData.user?.id ?? null;

    const result = await withTimeout(
      evaluateFlagCached(userId, featureId),
      8000,
      'api.flags.evaluate.cached',
    );
    return NextResponse.json(result);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.flags.evaluate', 'evaluation timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Evaluation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.flags.evaluate', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
