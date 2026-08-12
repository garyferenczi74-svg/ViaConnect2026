// Prompt 214d Gap 4: read-only dual-registry reconciliation API.
import { createClient } from '@/lib/supabase/server';
import { runRegistryDriftGuard, REGISTRY_END_STATE_RECOMMENDATION } from '@/lib/agents/registryDrift';
import { safeLog } from '@/lib/utils/safe-log';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

    const drift = await runRegistryDriftGuard();
    return Response.json(
      { ...drift, recommendation: REGISTRY_END_STATE_RECOMMENDATION },
      { status: 200 },
    );
  } catch (err) {
    safeLog.error('admin.registry-reconcile', 'threw', { error: err });
    return Response.json({ checked: false, flagged: false, side_by_side: [] }, { status: 200 });
  }
}
