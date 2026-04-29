// Prompt #122 P7: Collector config toggle.
// Admin/superadmin-only (matches RLS on soc2_collector_config.admin_write policy).

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['admin', 'superadmin']);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.soc2.collectors.toggle.auth');
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const profileRes = await withTimeout(
      (async () => supabase.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      5000,
      'api.soc2.collectors.toggle.load-profile',
    );
    const role = (profileRes.data as { role?: string } | null)?.role ?? '';
    if (!ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }

    let body: { enabled?: boolean };
    try { body = (await req.json()) as { enabled?: boolean }; }
    catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled_required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { error } = await withTimeout(
      (async () => sb
        .from('soc2_collector_config')
        .update({ enabled: body.enabled })
        .eq('collector_id', params.id))(),
      8000,
      'api.soc2.collectors.toggle.update',
    );
    if (error) {
      safeLog.error('api.soc2.collectors.toggle', 'update failed', { id: params.id, message: error.message });
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.soc2.collectors.toggle', 'database timeout', { id: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.soc2.collectors.toggle', 'unexpected error', { id: params.id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
