// Prompt 214a: Admin Command Center pipeline_runs reader.
// Auth: admin session via server supabase; fail-open empty list.

import { createClient } from '@/lib/supabase/server';
import { fetchLatestPipelineRuns } from '@/lib/agents/synchronism/persist';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const runs = await fetchLatestPipelineRuns(7);
    return Response.json({ run: runs[0] ?? null, runs }, { status: 200 });
  } catch (err) {
    safeLog.error('api.admin.jeffery.pipeline', 'failed open', { error: err });
    return Response.json({ run: null, runs: [] }, { status: 200 });
  }
}
