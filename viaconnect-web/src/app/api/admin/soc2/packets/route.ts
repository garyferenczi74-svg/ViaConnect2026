// Prompt #122 P5: GET /api/admin/soc2/packets — list generated packets.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'compliance_officer', 'compliance_admin']);

export async function GET(_req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.soc2.packets.list.auth');
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const profileRes = await withTimeout(
      (async () => supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle())(),
      5000,
      'api.soc2.packets.list.load-profile',
    );
    const role = (profileRes.data as { role?: string } | null)?.role ?? '';
    if (!ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data, error } = await withTimeout(
      (async () => sb
        .from('soc2_packets')
        .select(
          'id, packet_uuid, period_start, period_end, attestation_type, status, generated_at, root_hash, size_bytes, tsc_in_scope, signing_key_id, legal_hold, retention_until',
        )
        .order('generated_at', { ascending: false })
        .limit(200))(),
      10000,
      'api.soc2.packets.list',
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, packets: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.soc2.packets.list', 'database timeout', { error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.soc2.packets.list', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
