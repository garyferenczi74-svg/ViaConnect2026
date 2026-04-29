// Prompt #122 P9: Record an approval from Steve or Thomas on a pending
// pseudonym-resolve request. After the SECOND approval, run resolution
// and record the result in a final log row.
//
// Role scoping:
//   - { compliance_officer, compliance_admin, admin, superadmin } can sign Steve's slot.
//   - { legal_counsel, superadmin } can sign Thomas's slot.
//   - superadmin can fill EITHER slot (break-glass), but NOT both
//     simultaneously — one user cannot dual-approve themselves.

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  canApproveAsSteve,
  canApproveAsThomas,
  snapshotApproval,
} from '@/lib/soc2/auditor/pseudonymApprovals';
import { CONTEXT_TO_TABLE, resolvePseudonym } from '@/lib/soc2/auditor/resolvePseudonym';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

type ApprovalSlot = 'steve' | 'thomas';

interface Body {
  slot: ApprovalSlot;
  /** Optional context hint. Required on the SECOND approval so resolution can run. */
  context?: string;
}

export async function POST(req: NextRequest, { params }: { params: { logId: string } }) {
  const logId = Number.parseInt(params.logId, 10);
  try {
  if (!Number.isFinite(logId)) {
    return NextResponse.json({ error: 'invalid_log_id' }, { status: 400 });
  }

  const session = createServerClient();
  const { data: { user } } = await withTimeout(session.auth.getUser(), 5000, 'api.soc2.pseudonym-requests.approve.auth');
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const profileRes = await withTimeout(
    (async () => session.from('profiles').select('role').eq('id', user.id).maybeSingle())(),
    5000,
    'api.soc2.pseudonym-requests.approve.load-profile',
  );
  const role = (profileRes.data as { role?: string } | null)?.role ?? '';

  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const slot = body.slot;
  if (slot !== 'steve' && slot !== 'thomas') {
    return NextResponse.json({ error: 'invalid_slot' }, { status: 400 });
  }
  if (slot === 'steve' && !canApproveAsSteve(role)) {
    return NextResponse.json({ error: 'role_cannot_approve_as_steve' }, { status: 403 });
  }
  if (slot === 'thomas' && !canApproveAsThomas(role)) {
    return NextResponse.json({ error: 'role_cannot_approve_as_thomas' }, { status: 403 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = admin as any;

  const snapshot = await snapshotApproval(admin, logId);
  if (!snapshot) {
    return NextResponse.json({ error: 'request_not_found' }, { status: 404 });
  }
  if (snapshot.state === 'denied') {
    return NextResponse.json({ error: 'already_denied' }, { status: 409 });
  }
  if (snapshot.state === 'resolved') {
    return NextResponse.json({ error: 'already_resolved' }, { status: 409 });
  }
  const req_row = snapshot.requestRow;

  // Block self-dual-approval: if the other slot is signed by this same user,
  // refuse even if the role technically permits it.
  const otherSlotApprover =
    slot === 'steve'
      ? snapshot.thomasApprovalRow?.approver_thomas
      : snapshot.steveApprovalRow?.approver_steve;
  if (otherSlotApprover === user.id) {
    return NextResponse.json({ error: 'cannot_dual_sign_as_same_user' }, { status: 403 });
  }

  // Idempotent: if the slot is already signed, return the current state.
  const slotAlreadySigned = slot === 'steve' ? snapshot.steveApprovalRow : snapshot.thomasApprovalRow;
  if (slotAlreadySigned) {
    return NextResponse.json({
      ok: true,
      state: snapshot.state,
      note: `${slot} slot already signed`,
    });
  }

  // Record this approver's signature.
  const approvalInsert: Record<string, unknown> = {
    grant_id: req_row.grant_id,
    packet_id: req_row.packet_id,
    action: 'pseudonym_resolve_granted',
    target_path: null,
    resolved_pseudonym: req_row.resolved_pseudonym,
    justification: `Approval by ${slot}`,
  };
  if (slot === 'steve') approvalInsert.approver_steve = user.id;
  else                  approvalInsert.approver_thomas = user.id;

  const insertRes = await withTimeout(
    (async () => sb.from('soc2_auditor_access_log').insert(approvalInsert))(),
    8000,
    'api.soc2.pseudonym-requests.approve.insert',
  );
  if (insertRes.error) {
    safeLog.error('api.soc2.pseudonym-requests.approve', 'approval insert failed', { logId, message: insertRes.error.message });
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  // Re-snapshot to see if this was the second approval.
  const after = await snapshotApproval(admin, logId);
  if (!after) {
    return NextResponse.json({ ok: true, state: 'pending' });
  }

  if (after.state !== 'both_approved') {
    return NextResponse.json({ ok: true, state: after.state });
  }

  // Dual approved. Need a context to run resolution.
  const context = (body.context ?? '').trim();
  if (!context) {
    return NextResponse.json({
      ok: true,
      state: 'both_approved',
      needsContext: true,
      knownContexts: Object.keys(CONTEXT_TO_TABLE).sort(),
      message: 'Both approvers have signed. Call this endpoint once more with {"slot":"…","context":"…"} to trigger resolution.',
    });
  }
  if (!(context in CONTEXT_TO_TABLE)) {
    return NextResponse.json({ error: 'unknown_context', knownContexts: Object.keys(CONTEXT_TO_TABLE).sort() }, { status: 400 });
  }

  // Load the per-packet HMAC key from Vault (via P5 vault_read RPC).
  const { data: pseudoRow, error: pseudoErr } = await sb
    .from('soc2_pseudonym_keys')
    .select('key_ref, packet_id')
    .eq('packet_id', req_row.packet_id)
    .maybeSingle();
  if (pseudoErr || !pseudoRow) {
    return NextResponse.json({ error: 'pseudonym_key_not_found' }, { status: 500 });
  }
  const { data: vaultSecret } = await sb.rpc('vault_read', { p_ref: (pseudoRow as { key_ref: string }).key_ref });
  if (!vaultSecret) {
    // Vault stub returns NULL until wired. Record a "pending resolution" event
    // so the audit trail reflects the state; the secure-email delivery is
    // operational and happens out-of-band.
    await sb.from('soc2_auditor_access_log').insert({
      grant_id: req_row.grant_id,
      packet_id: req_row.packet_id,
      action: 'pseudonym_resolve_granted',
      target_path: 'VAULT_KEY_UNAVAILABLE',
      resolved_pseudonym: req_row.resolved_pseudonym,
      justification: `Both approvers signed; Vault key unavailable. Resolution deferred to Steve for manual lookup. Context=${context}.`,
      approver_steve: after.steveApprovalRow?.approver_steve ?? null,
      approver_thomas: after.thomasApprovalRow?.approver_thomas ?? null,
    });
    return NextResponse.json({
      ok: true,
      state: 'both_approved',
      resolutionDeferred: true,
      reason: 'vault_key_unavailable',
    });
  }

  // Fetch candidate IDs from the context's table.
  const tableInfo = CONTEXT_TO_TABLE[context];
  const { data: candidateRows } = await sb
    .from(tableInfo.table)
    .select(tableInfo.idColumn)
    .limit(50_000);
  const candidateIds = ((candidateRows as Array<Record<string, unknown>> | null) ?? [])
    .map((r) => String(r[tableInfo.idColumn]))
    .filter((s) => s.length > 0);

  const keyBuf = Buffer.isBuffer(vaultSecret)
    ? vaultSecret
    : Buffer.from(String(vaultSecret), 'hex');
  const resolverResult = resolvePseudonym({
    packetUuid: (req_row.packet_id as string),
    context,
    pseudonym: req_row.resolved_pseudonym ?? '',
    hmacKey: keyBuf,
    candidateIds,
  });

  // Record the resolution event (terminal for this request).
  const resolved = resolverResult.matched.length === 0
    ? 'NO_MATCH'
    : resolverResult.matched.join(',');
  await sb.from('soc2_auditor_access_log').insert({
    grant_id: req_row.grant_id,
    packet_id: req_row.packet_id,
    action: 'pseudonym_resolve_granted',
    target_path: resolved,
    resolved_pseudonym: req_row.resolved_pseudonym,
    justification: `Resolution: context=${context} candidates=${resolverResult.candidatesChecked} matches=${resolverResult.matched.length}${resolverResult.collision ? ' collision=true' : ''}.`,
    approver_steve: after.steveApprovalRow?.approver_steve ?? null,
    approver_thomas: after.thomasApprovalRow?.approver_thomas ?? null,
  });

  return NextResponse.json({
    ok: true,
    state: 'resolved',
    matchCount: resolverResult.matched.length,
    candidatesChecked: resolverResult.candidatesChecked,
    collision: resolverResult.collision,
  });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.soc2.pseudonym-requests.approve', 'database timeout', { logId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.soc2.pseudonym-requests.approve', 'unexpected error', { logId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
