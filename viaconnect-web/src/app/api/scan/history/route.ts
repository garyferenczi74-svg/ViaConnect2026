// Prompt 231: read-only transport boundary the scan history list (a client
// component) calls to render every 4-pose scan for the signed-in user. The
// actual query lives in scanReadsShared.listScans (condition 17 single
// source, shared with /api/scan/latest's getLatestScan) - this route only
// resolves the authenticated user and forwards the result. It mints
// nothing, deletes nothing, and never re-derives scan status from a raw
// table read.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listScans } from '@/lib/scan/scanReadsShared';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

const SCOPE = 'api.scan.history';
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { data: userData } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      `${SCOPE}.auth`,
    );
    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!inMemoryRateLimit(`scan-history:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const scans = await listScans(user.id);
    return NextResponse.json({ ok: true, scans });
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error(SCOPE, 'timeout', { error });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'unexpected error', { error });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
