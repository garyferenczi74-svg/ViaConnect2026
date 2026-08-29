// Prompt 231: read-only transport boundary the 224 dashboard tile (a client
// component) calls to render the latest 4-pose scan date + status. The
// actual query lives in scanReadsShared.getLatestScan (condition 17 single
// source) - this route only resolves the authenticated user and forwards
// the result. It mints nothing, deletes nothing, and never re-derives scan
// status from a raw table read.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getLatestScan } from '@/lib/scan/scanReadsShared';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { inMemoryRateLimit } from '@/lib/utils/inMemoryRateLimit';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

const SCOPE = 'api.scan.latest';
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

    if (!inMemoryRateLimit(`scan-latest:${user.id}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    }

    const scan = await getLatestScan(user.id);
    return NextResponse.json({ ok: true, scan });
  } catch (error) {
    if (isTimeoutError(error)) {
      safeLog.error(SCOPE, 'timeout', { error });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error(SCOPE, 'unexpected error', { error });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
