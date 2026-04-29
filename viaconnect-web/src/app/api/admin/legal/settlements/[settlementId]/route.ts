// Prompt #104 Phase 7: Settlement transitions.
//
// PATCH /api/admin/legal/settlements/[settlementId]
//   { action: 'compliance_approve' | 'cfo_approve' | 'ceo_approve' | 'execute' | 'mark_paid' }
//
// HARD STOP: 'execute' refuses without the approval tier satisfied.
// DB trigger enforce_settlement_approval_tier double-checks.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { settlementApprovalTierForAmount } from '@/lib/legal/settlement/approvalTierResolver';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const READ_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops', 'cfo', 'ceo']);

interface ProfileLite { role: string }

async function requireRole(supabase: ReturnType<typeof createClient>, allowed: ReadonlySet<string>) {
  const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.admin.legal.settlements.detail.auth');
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !allowed.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Insufficient role' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

interface SettlementRow {
  settlement_id: string;
  case_id: string;
  monetary_amount_cents: number;
  approval_tier: string;
  approved_by: string | null;
  approved_at: string | null;
  cfo_approved_by: string | null;
  cfo_approved_at: string | null;
  ceo_approved_by: string | null;
  ceo_approved_at: string | null;
  executed_at: string | null;
  payment_received_at: string | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { settlementId: string } },
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const ctx = await requireRole(supabase, READ_ROLES);
    if (!ctx.ok) return ctx.response;

    const body = (await request.json().catch(() => null)) ?? {};
    const action: string | null = typeof body.action === 'string' ? body.action : null;
    if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data: existing } = await sb
      .from('legal_case_settlements')
      .select('settlement_id, case_id, monetary_amount_cents, approval_tier, approved_by, approved_at, cfo_approved_by, cfo_approved_at, ceo_approved_by, ceo_approved_at, executed_at, payment_received_at')
      .eq('settlement_id', params.settlementId)
      .maybeSingle() as { data: SettlementRow | null };
    if (!existing) return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });

    const requirement = settlementApprovalTierForAmount(existing.monetary_amount_cents);
    const nowIso = new Date().toISOString();
    const update: Record<string, unknown> = {};

    switch (action) {
      case 'compliance_approve': {
        if (ctx.role !== 'admin' && ctx.role !== 'compliance_officer') {
          return NextResponse.json({ error: 'Only admin or compliance_officer can record compliance approval' }, { status: 403 });
        }
        update.approved_by = ctx.user_id;
        update.approved_at = nowIso;
        break;
      }
      case 'cfo_approve': {
        if (ctx.role !== 'cfo' && ctx.role !== 'admin') {
          return NextResponse.json({ error: 'Only CFO or admin can record CFO approval' }, { status: 403 });
        }
        if (!requirement.required_approver_roles.includes('cfo')) {
          return NextResponse.json({ error: 'CFO approval not required at this tier' }, { status: 422 });
        }
        update.cfo_approved_by = ctx.user_id;
        update.cfo_approved_at = nowIso;
        break;
      }
      case 'ceo_approve': {
        if (ctx.role !== 'ceo' && ctx.role !== 'admin') {
          return NextResponse.json({ error: 'Only CEO or admin can record CEO approval' }, { status: 403 });
        }
        if (!requirement.required_approver_roles.includes('ceo')) {
          return NextResponse.json({ error: 'CEO approval not required at this tier' }, { status: 422 });
        }
        update.ceo_approved_by = ctx.user_id;
        update.ceo_approved_at = nowIso;
        break;
      }
      case 'execute': {
        // Verify the full approval chain BEFORE the DB trigger fires.
        const needs = new Set(requirement.required_approver_roles);
        if (needs.has('compliance_officer') && (!existing.approved_by || !existing.approved_at)) {
          return NextResponse.json({ error: 'Compliance approval required first' }, { status: 422 });
        }
        if (needs.has('cfo') && (!existing.cfo_approved_by || !existing.cfo_approved_at)) {
          return NextResponse.json({ error: 'CFO approval required first' }, { status: 422 });
        }
        if (needs.has('ceo') && (!existing.ceo_approved_by || !existing.ceo_approved_at)) {
          return NextResponse.json({ error: 'CEO approval required first' }, { status: 422 });
        }
        update.executed_at = nowIso;
        break;
      }
      case 'mark_paid': {
        if (!existing.executed_at) {
          return NextResponse.json({ error: 'Cannot mark paid until settlement executed' }, { status: 409 });
        }
        update.payment_received_at = nowIso;
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const { data: updated, error } = await sb
      .from('legal_case_settlements')
      .update(update)
      .eq('settlement_id', params.settlementId)
      .select('settlement_id, monetary_amount_cents, approval_tier, approved_at, cfo_approved_at, ceo_approved_at, executed_at, payment_received_at')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await writeLegalAudit(sb, {
      actor_user_id: ctx.user_id, actor_role: ctx.role,
      action_category: 'settlement', action_verb: action,
      target_table: 'legal_case_settlements', target_id: params.settlementId, case_id: existing.case_id,
      after_state_json: update,
    });

    return NextResponse.json({ settlement: updated });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.admin.legal.settlements.detail', 'PATCH timeout', { error: err });
      return NextResponse.json({ error: 'Request timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.legal.settlements.detail', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
