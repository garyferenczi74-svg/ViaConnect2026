// Prompt #104 Phase 6: Propose outside-counsel engagement on a case.
//
// POST /api/admin/legal/cases/[caseId]/engagements
//   { counsel_id, scope_description, estimated_budget_cents, notes? }
//   -> creates a row in 'proposed' or 'pending_cfo_approval' /
//      'pending_ceo_approval' status based on the budget threshold.
//      The DB trigger enforce_counsel_engagement_approvals blocks
//      transition to 'approved' / 'active' without the right approvers.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { approversForEngagementBudget } from '@/lib/legal/counsel/budgetApprovalChain';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { caseId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOps(supabase);
  if (!ctx.ok) return ctx.response;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('legal_counsel_engagements')
    .select('engagement_id, counsel_id, status, scope_description, estimated_budget_cents, approved_budget_cents, proposed_at, cfo_approved_at, ceo_approved_at, activated_at, completed_at, total_invoiced_cents, legal_outside_counsel ( firm_name, attorney_name )')
    .eq('case_id', params.caseId)
    .order('proposed_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { caseId: string } },
): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOps(supabase);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) ?? {};
  const counselId: string | null = typeof body.counsel_id === 'string' ? body.counsel_id : null;
  const scope: string | null = typeof body.scope_description === 'string' && body.scope_description.length >= 30 ? body.scope_description : null;
  const budget: number | null = Number.isFinite(body.estimated_budget_cents) && body.estimated_budget_cents >= 0 ? Number(body.estimated_budget_cents) : null;

  if (!counselId) return NextResponse.json({ error: 'counsel_id required' }, { status: 400 });
  if (!scope) return NextResponse.json({ error: 'scope_description required (>= 30 chars)' }, { status: 400 });
  if (budget === null) return NextResponse.json({ error: 'estimated_budget_cents required (non-negative integer)' }, { status: 400 });

  const requirement = approversForEngagementBudget(budget);
  const initialStatus = requirement.cfo_required
    ? (requirement.ceo_required ? 'pending_ceo_approval' : 'pending_cfo_approval')
    : 'proposed';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: created, error } = await sb
    .from('legal_counsel_engagements')
    .insert({
      case_id: params.caseId,
      counsel_id: counselId,
      status: initialStatus,
      scope_description: scope,
      estimated_budget_cents: budget,
      proposed_by: ctx.user_id,
      notes: typeof body.notes === 'string' ? body.notes : null,
    })
    .select('engagement_id, status, estimated_budget_cents')
    .maybeSingle();
  if (error || !created) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id, actor_role: ctx.role,
    action_category: 'counsel_engagement', action_verb: 'proposed',
    target_table: 'legal_counsel_engagements', target_id: created.engagement_id, case_id: params.caseId,
    after_state_json: { status: initialStatus, estimated_budget_cents: budget, counsel_id: counselId, required_approvers: requirement.required_approver_roles },
  });

  return NextResponse.json({ engagement: created, required_approvers: requirement.required_approver_roles }, { status: 201 });
}
