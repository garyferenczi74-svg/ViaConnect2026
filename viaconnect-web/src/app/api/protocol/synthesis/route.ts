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
import { getLatestUserProtocolSynthesis } from '@/lib/protocol/readSynthesis';
import { safeLog } from '@/lib/utils/safe-log';

export async function GET(): Promise<NextResponse> {
  // Resolve the authenticated user from the server session.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Read the synthesis row, fail-open on any error.
  try {
    const synthesis = await getLatestUserProtocolSynthesis(user.id);
    return NextResponse.json({ synthesis });
  } catch (err) {
    safeLog.error('api.protocol.synthesis', 'Unexpected error reading synthesis; returning null', {
      userId: user.id,
      err,
    });
    return NextResponse.json({ synthesis: null });
  }
}
