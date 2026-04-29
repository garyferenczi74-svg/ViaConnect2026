// Prompt #104 Phase 2: Case detail + state transition.
//
// GET   /api/admin/legal/cases/[caseId]
//   -> case + counterparty + evidence count
// PATCH /api/admin/legal/cases/[caseId]
//   { state?, bucket?, bucket_confidence_score?, priority?,
//     counterparty_id?, assigned_reviewer_id?, estimated_damages_cents?,
//     has_medical_claim_flag?, notes? }
//   -> state transitions are gated by the DB trigger
//      enforce_legal_case_state_transition.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { canTransition } from '@/lib/legal/caseStateMachine';
import type { LegalCaseState } from '@/lib/legal/types';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);

const PATCHABLE_KEYS = [
  'state',
  'bucket',
  'bucket_confidence_score',
  'priority',
  'counterparty_id',
  'assigned_reviewer_id',
  'estimated_damages_cents',
  'has_medical_claim_flag',
  'notes',
] as const;

interface ProfileLite { role: string }

async function requireLegalOps(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.cases.detail.auth');
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !LEGAL_OPS_ROLES.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Legal-ops access required' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { caseId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: caseRow, error } = await sb
      .from('legal_investigation_cases')
      .select(`
        *,
        legal_counterparties ( counterparty_id, display_label, counterparty_type, primary_jurisdiction, identity_confidence, disputed_identity )
      `)
      .eq('case_id', params.caseId)
      .maybeSingle();
    if (error || !caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    const { count: evidenceCount } = await sb
      .from('legal_investigation_evidence')
      .select('evidence_id', { count: 'exact', head: true })
      .eq('case_id', params.caseId);

    return NextResponse.json({ case: caseRow, evidence_count: evidenceCount ?? 0 });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.cases.detail', 'GET timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.cases.detail', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { caseId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireLegalOps(supabase);
    if (!ctx.ok) return ctx.response;

    const body = (await request.json().catch(() => null)) ?? {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    const { data: existing } = await sb
      .from('legal_investigation_cases')
      .select('case_id, state, bucket, priority, counterparty_id, has_medical_claim_flag')
      .eq('case_id', params.caseId)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

    // Defense in depth: validate the proposed state transition in TS
    // BEFORE the DB trigger gets a chance, so we surface a clean 409
    // instead of a generic 500.
    if (typeof body.state === 'string' && body.state !== existing.state) {
      const r = canTransition({ from: existing.state as LegalCaseState, to: body.state as LegalCaseState });
      if (!r.ok) {
        return NextResponse.json({
          error: `Invalid state transition ${existing.state} -> ${body.state}`,
          reason: r.reason,
        }, { status: 409 });
      }
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of PATCHABLE_KEYS) {
      if (body[k] !== undefined) update[k] = body[k];
    }
    if (typeof body.state === 'string' && body.state === 'classified' && !existing.bucket) {
      return NextResponse.json({ error: 'Cannot classify without setting bucket first' }, { status: 400 });
    }
    if (typeof body.state === 'string' && body.state === 'classified') {
      update.classified_at = new Date().toISOString();
    }
    if (typeof body.state === 'string' && (body.state === 'resolved_successful' || body.state === 'resolved_unsuccessful')) {
      update.resolved_at = new Date().toISOString();
    }
    if (typeof body.state === 'string' && body.state === 'closed_no_action') {
      update.closed_at = new Date().toISOString();
    }

    const { data: updated, error } = await sb
      .from('legal_investigation_cases')
      .update(update)
      .eq('case_id', params.caseId)
      .select('*')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id,
      actor_role: ctx.role,
      action_category: 'case',
      action_verb: 'updated',
      target_table: 'legal_investigation_cases',
      target_id: params.caseId,
      case_id: params.caseId,
      before_state_json: existing,
      after_state_json: update,
    });

    return NextResponse.json({ case: updated });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.cases.detail', 'PATCH timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.cases.detail', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
