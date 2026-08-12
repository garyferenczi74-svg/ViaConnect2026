// Prompt 213a: event-driven off-cycle recompile for one user.
// Auth: user session. Call after genetics/scan/lab landings.

import { createClient } from '@/lib/supabase/server';
import { compileViaChain } from '@/lib/hannah/compilation/chainEntry';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), 5000, 'hannah.recompile.auth');
    if (!user) {
      return Response.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
    }

    // 214d: event-driven recompile routes through chain entry only
    const result = await compileViaChain({ userId: user.id, reason: 'event_manual' });
    return Response.json(
      {
        ok: true,
        runId: result.runId,
        status: result.status,
        insights: result.insights.length,
        chain_entry: true,
      },
      { status: 200 },
    );
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('hannah.recompile', 'timeout', { error: err });
      return Response.json({ ok: false, error: 'timeout' }, { status: 200 });
    }
    safeLog.error('hannah.recompile', 'failed', { error: err });
    return Response.json({ ok: false, error: 'server' }, { status: 200 });
  }
}
