// Prompt #122 P6: Archive a manual-evidence row.
//
// Archival marks the row as out-of-current-scope but preserves it for
// historical packet replay. Not a hard delete — spec §5.2 governance says
// "manual evidence is archived, not deleted."

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const COMPLIANCE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!COMPLIANCE_ROLES.has(role)) {
    return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { error } = await sb
    .from('soc2_manual_evidence')
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq('id', params.id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[soc2 manual-evidence archive] update failed', { id: params.id, message: error.message });
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
