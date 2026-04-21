// Prompt #104 Phase 7: Per-case settlement create + list.
//
// POST /api/admin/legal/cases/[caseId]/settlements
//   { settlement_date, monetary_amount_cents, currency?, payment_method?,
//     nda_required?, nda_vault_ref?, future_conduct_obligations?,
//     release_scope?, drafted_by_counsel_id?, notes? }
//   -> approval_tier is computed server-side from amount; the row is
//      inserted with the correct tier so the DB trigger
//      enforce_settlement_approval_tier accepts it.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { settlementApprovalTierForAmount } from '@/lib/legal/settlement/approvalTierResolver';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops', 'cfo', 'ceo']);

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
    .from('legal_case_settlements')
    .select('settlement_id, settlement_date, monetary_amount_cents, currency, payment_method, payment_received_at, nda_required, future_conduct_obligations_json, release_scope, approval_tier, approved_at, cfo_approved_at, ceo_approved_at, executed_at')
    .eq('case_id', params.caseId)
    .order('settlement_date', { ascending: false });
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
  const settlementDate: string | null = typeof body.settlement_date === 'string' ? body.settlement_date : null;
  const amount: number | null = Number.isFinite(body.monetary_amount_cents) && body.monetary_amount_cents >= 0 ? Number(body.monetary_amount_cents) : null;
  if (!settlementDate) return NextResponse.json({ error: 'settlement_date required (YYYY-MM-DD)' }, { status: 400 });
  if (amount === null) return NextResponse.json({ error: 'monetary_amount_cents required (non-negative integer)' }, { status: 400 });

  const tier = settlementApprovalTierForAmount(amount);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: created, error } = await sb
    .from('legal_case_settlements')
    .insert({
      case_id: params.caseId,
      settlement_date: settlementDate,
      monetary_amount_cents: amount,
      currency: typeof body.currency === 'string' ? body.currency : 'USD',
      payment_method: typeof body.payment_method === 'string' ? body.payment_method : null,
      nda_required: body.nda_required === true,
      nda_vault_ref: typeof body.nda_vault_ref === 'string' ? body.nda_vault_ref : null,
      future_conduct_obligations_json: body.future_conduct_obligations_json ?? {},
      release_scope: typeof body.release_scope === 'string' ? body.release_scope : 'specific_claim',
      drafted_by_counsel_id: typeof body.drafted_by_counsel_id === 'string' ? body.drafted_by_counsel_id : null,
      approval_tier: tier.tier,
      notes: typeof body.notes === 'string' ? body.notes : null,
    })
    .select('settlement_id, monetary_amount_cents, approval_tier')
    .maybeSingle();
  if (error || !created) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id, actor_role: ctx.role,
    action_category: 'settlement', action_verb: 'drafted',
    target_table: 'legal_case_settlements', target_id: created.settlement_id, case_id: params.caseId,
    after_state_json: { monetary_amount_cents: amount, approval_tier: tier.tier },
  });

  return NextResponse.json({ settlement: created, required_approver_roles: tier.required_approver_roles }, { status: 201 });
}
