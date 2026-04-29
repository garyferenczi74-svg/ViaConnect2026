// Prompt #127 P7: Resolve a registry consistency flag.
//
// Writes resolved_by + resolved_at + resolution_note. Resolution is
// compliance-admin only per the fcf_admin_update-style policy on
// framework_registry_flags. Auto-resolved flags reopen themselves on the
// next scan if the underlying issue persists.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const RESOLVE_ROLES = new Set(['compliance_officer', 'compliance_admin', 'admin', 'superadmin']);

interface Body {
  resolutionNote?: string;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = createServerClient();
    const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.compliance.consistency.resolve.auth');
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (session as any).from('profiles').select('role').eq('id', user.id).maybeSingle())(),
      8000,
      'api.compliance.consistency.resolve.profile',
    );
    const role = (profile as { role?: string } | null)?.role ?? '';
    if (!RESOLVE_ROLES.has(role)) return NextResponse.json({ error: 'Compliance role required' }, { status: 403 });

    const id = (params.id ?? '').trim();
    if (!id) return NextResponse.json({ error: 'flag_id_required' }, { status: 400 });

    let body: Body;
    try { body = (await req.json()) as Body; }
    catch { body = {}; }
    const resolutionNote = (body.resolutionNote ?? '').trim();
    if (resolutionNote.length < 10) {
      return NextResponse.json({ error: 'resolution_note_too_short', minLength: 10 }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = session as any;
    const { error } = await withTimeout(
      (async () => sb
        .from('framework_registry_flags')
        .update({
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_note: resolutionNote,
        })
        .eq('id', id)
        .is('resolved_at', null))(),
      8000,
      'api.compliance.consistency.resolve.update',
    );
    if (error) {
      safeLog.error('api.compliance.consistency.resolve', 'update failed', { id, message: error.message });
      return NextResponse.json({ error: 'update_failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.compliance.consistency.resolve', 'timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.compliance.consistency.resolve', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'unexpected_error' }, { status: 500 });
  }
}
