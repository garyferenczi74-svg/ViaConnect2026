// Prompt #122 P9: Deny a pseudonym-resolve request. Any Steve or Thomas
// approver may deny (single denial is terminal).

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  canApproveAsSteve,
  canApproveAsThomas,
  snapshotApproval,
} from '@/lib/soc2/auditor/pseudonymApprovals';

export const runtime = 'nodejs';

interface Body {
  reason?: string;
}

export async function POST(req: NextRequest, { params }: { params: { logId: string } }) {
  const logId = Number.parseInt(params.logId, 10);
  if (!Number.isFinite(logId)) {
    return NextResponse.json({ error: 'invalid_log_id' }, { status: 400 });
  }

  const session = createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: profile } = await session.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role ?? '';
  if (!canApproveAsSteve(role) && !canApproveAsThomas(role)) {
    return NextResponse.json({ error: 'role_cannot_deny' }, { status: 403 });
  }

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { body = {}; }

  const reason = (body.reason ?? '').trim();
  if (reason.length < 10) {
    return NextResponse.json({ error: 'reason_required', minLength: 10 }, { status: 400 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  const snapshot = await snapshotApproval(admin, logId);
  if (!snapshot) {
    return NextResponse.json({ error: 'request_not_found' }, { status: 404 });
  }
  if (snapshot.state === 'denied' || snapshot.state === 'resolved') {
    return NextResponse.json({ error: `already_${snapshot.state}` }, { status: 409 });
  }

  const req_row = snapshot.requestRow;
  const { error } = await sb.from('soc2_auditor_access_log').insert({
    grant_id: req_row.grant_id,
    packet_id: req_row.packet_id,
    action: 'pseudonym_resolve_denied',
    target_path: null,
    resolved_pseudonym: req_row.resolved_pseudonym,
    justification: `Denied: ${reason}`,
    approver_steve: canApproveAsSteve(role) ? user.id : null,
    approver_thomas: canApproveAsThomas(role) ? user.id : null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[pseudonym-requests deny] insert failed', { logId, message: error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: 'denied' });
}
