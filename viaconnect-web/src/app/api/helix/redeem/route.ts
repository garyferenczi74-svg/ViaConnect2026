import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { redeemCatalogItem } from '@/lib/helix/redemption-engine';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

interface Body {
  catalogItemId: string;
  applicationContext?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body?.catalogItemId) {
    return NextResponse.json({ error: 'catalogItemId is required' }, { status: 400 });
  }

  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.helix.redeem.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.helix.redeem', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let result;
    try {
      result = await withTimeout(
        redeemCatalogItem(supabase, {
          userId: user.id,
          catalogItemId: body.catalogItemId,
          applicationContext: body.applicationContext,
        }),
        15000,
        'api.helix.redeem.engine',
      );
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.helix.redeem', 'engine timeout', { requestId, userId: user.id, catalogItemId: body.catalogItemId, error: err });
        return NextResponse.json({ error: 'Redemption took too long. Please try again.' }, { status: 504 });
      }
      throw err;
    }

    if (!result.success) {
      safeLog.warn('api.helix.redeem', 'engine rejected', { requestId, userId: user.id, catalogItemId: body.catalogItemId, reason: result.error });
      return NextResponse.json({ error: result.error ?? 'Redemption failed' }, { status: 400 });
    }
    safeLog.info('api.helix.redeem', 'redemption succeeded', { requestId, userId: user.id, catalogItemId: body.catalogItemId });
    return NextResponse.json(result);
  } catch (err) {
    safeLog.error('api.helix.redeem', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
