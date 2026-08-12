// Prompt 213a: event-driven off-cycle recompile for one user.
// Auth: user session. Call after genetics/scan/lab landings.

import { createClient } from '@/lib/supabase/server';
import { runHannahCompilation } from '@/lib/hannah/compilation/runCompilation';
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

    const result = await runHannahCompilation({ userId: user.id });
    return Response.json(
      {
        ok: true,
        runId: result.runId,
        status: result.status,
        insights: result.insights.length,
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
