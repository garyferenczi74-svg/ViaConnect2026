// Prompt #104 Phase 2: Case list + create.
//
// GET  /api/admin/legal/cases?state=&bucket=&priority=
//   -> rows for the queue, newest first
// POST /api/admin/legal/cases
//   { source_violation_id?, priority?, notes? }
//   -> manually opens a case in the 'intake' state. The next case
//      label is computed server-side (LEG-YYYY-NNNNNN).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nextCaseLabel } from '@/lib/legal/caseLabel';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';

export const runtime = 'nodejs';

const LEGAL_OPS_ROLES = new Set(['admin', 'compliance_officer', 'legal_ops']);

interface ProfileLite { role: string }
interface CaseQueueRow {
  case_id: string;
  case_label: string;
  state: string;
  bucket: string;
  priority: string;
  has_medical_claim_flag: boolean;
  intake_at: string;
  estimated_damages_cents: number | null;
  counterparty_id: string | null;
  legal_counterparties: { display_label: string | null } | null;
}

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOps(supabase);
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const bucket = url.searchParams.get('bucket');
  const priority = url.searchParams.get('priority');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let q = sb.from('legal_investigation_cases')
    .select(`
      case_id, case_label, state, bucket, priority, has_medical_claim_flag,
      intake_at, estimated_damages_cents, counterparty_id,
      legal_counterparties ( display_label )
    `)
    .order('intake_at', { ascending: false })
    .limit(200);
  if (state) q = q.eq('state', state);
  if (bucket) q = q.eq('bucket', bucket);
  if (priority) q = q.eq('priority', priority);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = ((data ?? []) as CaseQueueRow[]).map((r) => ({
    case_id: r.case_id,
    case_label: r.case_label,
    state: r.state,
    bucket: r.bucket,
    priority: r.priority,
    has_medical_claim_flag: r.has_medical_claim_flag,
    intake_at: r.intake_at,
    estimated_damages_cents: r.estimated_damages_cents,
    counterparty_id: r.counterparty_id,
    counterparty_label: r.legal_counterparties?.display_label ?? null,
  }));

  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const ctx = await requireLegalOps(supabase);
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) ?? {};
  const sourceViolationId: string | null = typeof body.source_violation_id === 'string' ? body.source_violation_id : null;
  const priority: string = typeof body.priority === 'string' ? body.priority : 'p3_normal';
  const notes: string | null = typeof body.notes === 'string' ? body.notes : null;
  const hasMedicalClaim: boolean = body.has_medical_claim_flag === true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const year = new Date().getUTCFullYear();
  const { data: existingLabels } = await sb
    .from('legal_investigation_cases')
    .select('case_label')
    .like('case_label', `LEG-${year}-%`);
  const labels = ((existingLabels ?? []) as Array<{ case_label: string }>).map((r) => r.case_label);
  const newLabel = nextCaseLabel({ year, existing_labels_for_year: labels });

  const { data: created, error } = await sb
    .from('legal_investigation_cases')
    .insert({
      case_label: newLabel,
      source_violation_id: sourceViolationId,
      priority,
      has_medical_claim_flag: hasMedicalClaim,
      notes,
    })
    .select('case_id, case_label, state')
    .maybeSingle();
  if (error || !created) return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id,
    actor_role: ctx.role,
    action_category: 'case',
    action_verb: 'opened',
    target_table: 'legal_investigation_cases',
    target_id: created.case_id,
    case_id: created.case_id,
    after_state_json: { case_label: created.case_label, state: created.state, priority, has_medical_claim_flag: hasMedicalClaim },
    context_json: { source_violation_id: sourceViolationId },
  });

  return NextResponse.json({ case: created }, { status: 201 });
}
