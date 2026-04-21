// Prompt #104 Phase 6: Engagement approval transitions.
//
// PATCH /api/admin/legal/engagements/[engagementId]
//   { action: 'cfo_approve' | 'ceo_approve' | 'activate' | 'mark_completed' | 'reject' | 'withdraw' }
//
// Hard stops:
//   - cfo_approve requires actor.role == 'cfo' OR 'admin'
//   - ceo_approve requires actor.role == 'ceo' OR 'admin'
//   - activate requires the budget approval chain to be satisfied
//     (DB trigger blocks if not; we validate here for clean errors)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { approversForEngagementBudget } from '@/lib/legal/counsel/budgetApprovalChain';

export const runtime = 'nodejs';

const READ_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops', 'cfo', 'ceo']);

interface ProfileLite { role: string }

async function requireRole(supabase: ReturnType<typeof createClient>, allowed: ReadonlySet<string>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: ProfileLite | null }> } } } };
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || !allowed.has(profile.role)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Insufficient role for this action' }, { status: 403 }) };
  }
  return { ok: true as const, user_id: user.id, role: profile.role };
}

interface EngagementRow {
  engagement_id: string;
  case_id: string;
  status: string;
  estimated_budget_cents: number;
  cfo_approved_by: string | null;
  cfo_approved_at: string | null;
  ceo_approved_by: string | null;
  ceo_approved_at: string | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { engagementId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  // Require any of the read-eligible roles to even hit this endpoint;
  // each branch then checks the role required for the specific action.
  const ctx = await requireRole(supabase, READ_ROLES);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) ?? {};
  const action: string | null = typeof body.action === 'string' ? body.action : null;
  if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: existing } = await sb
    .from('legal_counsel_engagements')
    .select('engagement_id, case_id, status, estimated_budget_cents, cfo_approved_by, cfo_approved_at, ceo_approved_by, ceo_approved_at')
    .eq('engagement_id', params.engagementId)
    .maybeSingle() as { data: EngagementRow | null };
  if (!existing) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });

  const requirement = approversForEngagementBudget(existing.estimated_budget_cents);
  const nowIso = new Date().toISOString();
  const update: Record<string, unknown> = {};

  switch (action) {
    case 'cfo_approve': {
      if (ctx.role !== 'cfo' && ctx.role !== 'admin') {
        return NextResponse.json({ error: 'Only CFO or admin can record CFO approval' }, { status: 403 });
      }
      if (existing.status !== 'pending_cfo_approval' && existing.status !== 'pending_ceo_approval') {
        return NextResponse.json({ error: `Cannot CFO-approve from status ${existing.status}` }, { status: 409 });
      }
      update.cfo_approved_by = ctx.user_id;
      update.cfo_approved_at = nowIso;
      // If CEO approval also needed, advance to pending_ceo_approval; else 'approved'.
      update.status = requirement.ceo_required ? 'pending_ceo_approval' : 'approved';
      if (requirement.ceo_required && existing.status === 'pending_cfo_approval') {
        // already advancing
      }
      break;
    }
    case 'ceo_approve': {
      if (ctx.role !== 'ceo' && ctx.role !== 'admin') {
        return NextResponse.json({ error: 'Only CEO or admin can record CEO approval' }, { status: 403 });
      }
      if (existing.status !== 'pending_ceo_approval') {
        return NextResponse.json({ error: `Cannot CEO-approve from status ${existing.status}` }, { status: 409 });
      }
      if (requirement.cfo_required && (!existing.cfo_approved_by || !existing.cfo_approved_at)) {
        return NextResponse.json({ error: 'CFO approval required first' }, { status: 422 });
      }
      update.ceo_approved_by = ctx.user_id;
      update.ceo_approved_at = nowIso;
      update.status = 'approved';
      break;
    }
    case 'activate': {
      if (existing.status !== 'approved') {
        return NextResponse.json({ error: `Cannot activate from status ${existing.status}` }, { status: 409 });
      }
      update.status = 'active';
      update.activated_at = nowIso;
      break;
    }
    case 'mark_completed': {
      if (existing.status !== 'active') {
        return NextResponse.json({ error: `Cannot mark completed from status ${existing.status}` }, { status: 409 });
      }
      update.status = 'completed';
      update.completed_at = nowIso;
      break;
    }
    case 'reject': {
      if (!['proposed', 'pending_cfo_approval', 'pending_ceo_approval'].includes(existing.status)) {
        return NextResponse.json({ error: `Cannot reject from status ${existing.status}` }, { status: 409 });
      }
      update.status = 'rejected';
      break;
    }
    case 'withdraw': {
      if (existing.status === 'completed' || existing.status === 'active') {
        return NextResponse.json({ error: `Cannot withdraw from status ${existing.status}` }, { status: 409 });
      }
      update.status = 'withdrawn';
      break;
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const { data: updated, error } = await sb
    .from('legal_counsel_engagements')
    .update(update)
    .eq('engagement_id', params.engagementId)
    .select('engagement_id, status, cfo_approved_at, ceo_approved_at, activated_at, completed_at')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id, actor_role: ctx.role,
    action_category: 'counsel_engagement', action_verb: action,
    target_table: 'legal_counsel_engagements', target_id: params.engagementId, case_id: existing.case_id,
    before_state_json: { status: existing.status },
    after_state_json: update,
  });

  return NextResponse.json({ engagement: updated });
}
