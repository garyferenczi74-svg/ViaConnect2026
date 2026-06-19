// Prompt 204c (2026-06-18): the My Lab Results read endpoint. Returns the
// member's saved biomarkers, each grouped by panel with its printed range, a
// genetically-adjusted optimal range where a variant applies, and a deterministic
// optimal/monitor/consult/unknown tier (critical values force consult). All of
// that comes from the shared loadLabResults loader. Owner-scoped, fail-open.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { loadLabResults } from '@/lib/labs/loadLabResults';

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await loadLabResults(supabase, user.id);
    return NextResponse.json({ results, totalBiomarkers: results.length });
  } catch (err) {
    safeLog.error('api.labs.results', 'read failed (returning empty)', {
      user_id: user.id, error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ results: [], totalBiomarkers: 0 });
  }
}
