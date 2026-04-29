import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loadCatalog } from '@/lib/helix/redemption-engine';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export async function GET(request: Request) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();
    let userData;
    try {
      userData = (await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.helix.redemption-catalog.auth',
      )).data;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.helix.redemption-catalog', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const items = await withTimeout(
        loadCatalog(supabase),
        10000,
        'api.helix.redemption-catalog.load',
      );
      return NextResponse.json({ items });
    } catch (e) {
      if (isTimeoutError(e)) {
        safeLog.error('api.helix.redemption-catalog', 'load timeout', { requestId, error: e });
        return NextResponse.json({ error: 'Catalog load timed out. Please try again.' }, { status: 504 });
      }
      safeLog.error('api.helix.redemption-catalog', 'load failed', { requestId, error: e });
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Failed to load catalog' },
        { status: 500 },
      );
    }
  } catch (err) {
    safeLog.error('api.helix.redemption-catalog', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
