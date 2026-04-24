// Prompt #122 P7: Collector config toggle.
// Admin/superadmin-only (matches RLS on soc2_collector_config.admin_write policy).

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ADMIN_ROLES = new Set(['admin', 'superadmin']);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
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
  const { error } = await sb
    .from('soc2_collector_config')
    .update({ enabled: body.enabled })
    .eq('collector_id', params.id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[soc2 collector toggle] update failed', { id: params.id, message: error.message });
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
