// Prompt #104 Phase 4: Enforcement action detail + transitions.
//
// GET   /api/admin/legal/enforcement-actions/[actionId]
//   -> action row + rendered body
// PATCH /api/admin/legal/enforcement-actions/[actionId]
//   { action: 'submit_for_approval' | 'approve' | 'mark_sent' | 'withdraw' | 'record_response',
//     approval_confirmation_text?, sent_via?, external_reference_id?,
//     response_classification? }
//
// CRITICAL HARD STOPS (spec §15):
//   - 'approve' requires approval_confirmation_text exactly matching
//     `APPROVE LEG-YYYY-NNNNNN` (case-sensitive). DB trigger enforces
//     >= 6 chars but we add the case-label match check here so the API
//     surfaces a clear error.
//   - 'mark_sent' requires the action to already be 'approved_awaiting_send'
//     and requires a sent_via channel. The DB trigger blocks 'sent' if
//     approval columns are missing.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);
const APPROVE_PREFIX = 'APPROVE ';

interface ProfileLite { role: string }

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

interface ActionRow {
  action_id: string;
  case_id: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  approval_confirmation_text: string | null;
  sent_at: string | null;
  metadata_json: { body?: string; signing_officer?: string; missing_fields?: string[]; template_family?: string; template_version?: string } | null;
  legal_investigation_cases: { case_label: string; bucket: string } | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { actionId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOps(supabase);
  if (!ctx.ok) return ctx.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('legal_enforcement_actions')
    .select(`*, legal_investigation_cases ( case_label, bucket )`)
    .eq('action_id', params.actionId)
    .maybeSingle() as { data: ActionRow | null; error: { message: string } | null };
  if (error || !data) return NextResponse.json({ error: 'Enforcement action not found' }, { status: 404 });
  return NextResponse.json({ action: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { actionId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOps(supabase);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) ?? {};
  const action: string | null = typeof body.action === 'string' ? body.action : null;
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: existing } = await sb
    .from('legal_enforcement_actions')
    .select(`action_id, case_id, status, approved_by, approved_at, approval_confirmation_text, sent_at, metadata_json,
             legal_investigation_cases ( case_label, bucket )`)
    .eq('action_id', params.actionId)
    .maybeSingle() as { data: ActionRow | null };
  if (!existing) return NextResponse.json({ error: 'Enforcement action not found' }, { status: 404 });

  const nowIso = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: nowIso };
  let auditVerb = action;

  switch (action) {
    case 'submit_for_approval': {
      if (existing.status !== 'draft') {
        return NextResponse.json({ error: `Cannot submit for approval from status ${existing.status}` }, { status: 409 });
      }
      const missing = existing.metadata_json?.missing_fields ?? [];
      if (Array.isArray(missing) && missing.length > 0) {
        return NextResponse.json({
          error: 'Cannot submit for approval while merge fields are missing',
          missing_fields: missing,
        }, { status: 422 });
      }
      update.status = 'pending_approval';
      break;
    }

    case 'approve': {
      if (existing.status !== 'pending_approval') {
        return NextResponse.json({ error: `Cannot approve from status ${existing.status}` }, { status: 409 });
      }
      // HARD STOP: typed-confirmation must be exactly `APPROVE <case_label>`.
      // Spec §3.2: "send action is a manual confirm-typing step".
      const expected = `${APPROVE_PREFIX}${existing.legal_investigation_cases?.case_label ?? ''}`;
      const provided: string = typeof body.approval_confirmation_text === 'string' ? body.approval_confirmation_text : '';
      if (provided !== expected) {
        return NextResponse.json({
          error: 'approval_confirmation_text mismatch',
          expected,
          hint: 'Type the exact phrase to confirm approval.',
        }, { status: 422 });
      }
      // Defensive: only admin or compliance_officer can approve;
      // legal_ops users can submit but not approve. (Spec §3.2 names
      // Steve Rica as the approver.)
      if (ctx.role !== 'admin' && ctx.role !== 'compliance_officer') {
        return NextResponse.json({ error: 'Only admin or compliance_officer (Steve Rica) can approve' }, { status: 403 });
      }
      update.status = 'approved_awaiting_send';
      update.approved_by = ctx.user_id;
      update.approved_at = nowIso;
      update.approval_confirmation_text = provided;
      break;
    }

    case 'mark_sent': {
      if (existing.status !== 'approved_awaiting_send') {
        return NextResponse.json({ error: `Cannot mark sent from status ${existing.status}` }, { status: 409 });
      }
      const sentVia: string | null = typeof body.sent_via === 'string' && body.sent_via.length >= 3 ? body.sent_via : null;
      if (!sentVia) {
        return NextResponse.json({ error: 'sent_via required (e.g., email, certified_mail, marketplace_form)' }, { status: 400 });
      }
      update.status = 'sent';
      update.sent_at = nowIso;
      update.sent_via = sentVia;
      if (typeof body.external_reference_id === 'string') update.external_reference_id = body.external_reference_id;
      break;
    }

    case 'withdraw': {
      if (existing.status === 'sent' || existing.status === 'complied') {
        return NextResponse.json({ error: `Cannot withdraw an already ${existing.status} action` }, { status: 409 });
      }
      update.status = 'withdrawn';
      break;
    }

    case 'record_response': {
      if (existing.status !== 'sent' && existing.status !== 'acknowledged') {
        return NextResponse.json({ error: `Cannot record response from status ${existing.status}` }, { status: 409 });
      }
      const classification: string | null = typeof body.response_classification === 'string' ? body.response_classification : null;
      if (!classification) return NextResponse.json({ error: 'response_classification required' }, { status: 400 });
      update.status = 'response_received';
      update.response_received_at = nowIso;
      update.response_classification = classification;
      break;
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const { data: updated, error: updErr } = await sb
    .from('legal_enforcement_actions')
    .update(update)
    .eq('action_id', params.actionId)
    .select('action_id, status, approved_at, sent_at, response_received_at')
    .maybeSingle();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id,
    actor_role: ctx.role,
    action_category: 'enforcement_action',
    action_verb: auditVerb,
    target_table: 'legal_enforcement_actions',
    target_id: params.actionId,
    case_id: existing.case_id,
    before_state_json: { status: existing.status },
    after_state_json: update,
  });

  return NextResponse.json({ action: updated });
}
