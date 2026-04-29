import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTierForUser } from '@/lib/pricing/membership-manager';
import { tierIdToLevel } from '@/types/pricing';
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
        'api.pricing.tier.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.pricing.tier', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }

    if (!user) {
      return NextResponse.json({
        tierId: 'free',
        tierLevel: 0,
        authenticated: false,
      });
    }

    try {
      const tierId = await withTimeout(
        getEffectiveTierForUser(supabase, user.id),
        8000,
        'api.pricing.tier.resolve',
      );
      return NextResponse.json({
        tierId,
        tierLevel: tierIdToLevel(tierId),
        authenticated: true,
      });
    } catch (error) {
      if (isTimeoutError(error)) {
        safeLog.error('api.pricing.tier', 'resolve timeout', { requestId, error });
        return NextResponse.json({ error: 'Tier resolution timed out. Please try again.' }, { status: 503 });
      }
      safeLog.error('api.pricing.tier', 'resolve failed', { requestId, error });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to resolve tier' },
        { status: 500 },
      );
    }
  } catch (err) {
    safeLog.error('api.pricing.tier', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
