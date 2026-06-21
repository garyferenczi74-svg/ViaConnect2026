/**
 * src/app/api/protocol/synthesis/route.ts
 *
 * GET /api/protocol/synthesis
 *
 * Owner-scoped endpoint: resolves the authenticated user from the server
 * session, reads their latest user_protocol_synthesis row via
 * getLatestUserProtocolSynthesis, and returns { synthesis: row | null }.
 *
 * Fail-open: any exception from the read returns 200 { synthesis: null } so
 * the panel always renders its empty state rather than showing an error to
 * the member.
 *
 * Prompt 208, Phase 8, Task 23 (2026-06-21).
 * No em/en-dashes. No emojis.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrComputeUserProtocolSynthesis } from '@/lib/protocol/readSynthesis';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';

export async function GET(): Promise<NextResponse> {
  // Resolve the authenticated user from the server session.
  // Auth timeout fails CLOSED: a timeout is treated as unauthenticated (401).
  const supabase = createClient();
  let user: { id: string } | null = null;
  try {
    const { data } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'api.protocol.synthesis.auth',
    );
    user = data.user;
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.protocol.synthesis', 'auth.getUser timed out; returning 401', {
        error: err.message,
      });
    } else {
      safeLog.error('api.protocol.synthesis', 'auth.getUser threw; returning 401', { err });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Lazy compute-on-read: returns cached row if fresh, triggers synthesizeForUser
  // when absent or stale, then returns the freshly-written row. Fail-open.
  try {
    const synthesis = await getOrComputeUserProtocolSynthesis(user.id);
    return NextResponse.json({ synthesis });
  } catch (err) {
    safeLog.error('api.protocol.synthesis', 'Unexpected error reading synthesis; returning null', {
      userId: user.id,
      err,
    });
    return NextResponse.json({ synthesis: null });
  }
}
