// Prompt #104 Phase 6: Briefing packet generator.
//
// GET /api/admin/legal/cases/[caseId]/briefing-packet
//   -> assembles a Markdown briefing packet for outside counsel.
//      Privileged content; read-restricted to admin / compliance /
//      legal_ops. Aggregate-only PII; never individual customer rows.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeLegalAudit } from '@/lib/legalAudit/operationsAuditLog';
import { buildBriefingPacketMarkdown } from '@/lib/legal/counsel/briefingPacketBuilder';

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

interface CaseRow {
  case_id: string;
  case_label: string;
  bucket: string;
  bucket_confidence_score: number | null;
  estimated_damages_cents: number | null;
  metadata_json: { triage_ai?: { suggested_template_family?: string | null; rationale?: string } } | null;
  legal_counterparties: {
    display_label: string;
    counterparty_type: string;
    primary_jurisdiction: string | null;
    verified_business_reg_id: string | null;
    verified_domain: string | null;
    total_cases_count: number;
    total_settlement_cents: number;
  } | null;
}

interface TimelineRow { event_at: string; event_description: string }
interface EvidenceLite {
  artifact_type: string;
  captured_at: string;
  content_sha256: string;
  description: string | null;
}
interface EngagementBudgetRow {
  approved_budget_cents: number | null;
  cfo_approved_at: string | null;
  ceo_approved_at: string | null;
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

  const { data: caseRow } = await sb
    .from('legal_investigation_cases')
    .select(`case_id, case_label, bucket, bucket_confidence_score, estimated_damages_cents, metadata_json,
             legal_counterparties ( display_label, counterparty_type, primary_jurisdiction, verified_business_reg_id, verified_domain, total_cases_count, total_settlement_cents )`)
    .eq('case_id', params.caseId)
    .maybeSingle() as { data: CaseRow | null };
  if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const { data: timeline } = await sb
    .from('legal_case_timeline')
    .select('event_at, event_description')
    .eq('case_id', params.caseId)
    .order('event_at', { ascending: true })
    .limit(50) as { data: TimelineRow[] | null };

  const { data: evidence } = await sb
    .from('legal_investigation_evidence')
    .select('artifact_type, captured_at, content_sha256, description')
    .eq('case_id', params.caseId)
    .order('captured_at', { ascending: true })
    .limit(50) as { data: EvidenceLite[] | null };

  const { data: latestEngagement } = await sb
    .from('legal_counsel_engagements')
    .select('approved_budget_cents, cfo_approved_at, ceo_approved_at')
    .eq('case_id', params.caseId)
    .order('proposed_at', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: EngagementBudgetRow | null };

  const triageBlock = caseRow.metadata_json?.triage_ai;
  const suggestedActionPlan: string[] = [];
  if (triageBlock?.suggested_template_family) {
    suggestedActionPlan.push(`Begin enforcement with template family ${triageBlock.suggested_template_family}.`);
  }
  if (caseRow.bucket === 'counterfeit') {
    suggestedActionPlan.push('Issue Amazon Brand Registry counterfeit complaint in parallel with C&D.');
    suggestedActionPlan.push('Consider customs e-Recordation / CBP referral.');
  } else if (caseRow.bucket === 'gray_market_material_differences') {
    suggestedActionPlan.push('File marketplace IP complaints (Amazon, eBay, Etsy as applicable).');
    suggestedActionPlan.push('Prepare Lanham §32 filing if no compliance within 30 days.');
  }

  const md = buildBriefingPacketMarkdown({
    case_label: caseRow.case_label,
    prepared_at_iso: new Date().toISOString(),
    bucket: caseRow.bucket,
    bucket_confidence_score: caseRow.bucket_confidence_score,
    estimated_damages_cents: caseRow.estimated_damages_cents,
    counterparty: caseRow.legal_counterparties,
    enforcement_history: (timeline ?? []).map((t) => ({ occurred_at_iso: t.event_at, description: t.event_description })),
    evidence_summary: (evidence ?? []).map((e) => ({
      artifact_type: e.artifact_type,
      captured_at_iso: e.captured_at,
      sha256: e.content_sha256,
      description: e.description,
    })),
    affected_orders_count_aggregate: null,
    affected_revenue_cents_aggregate: null,
    approved_budget_cents: latestEngagement?.approved_budget_cents ?? null,
    cfo_approver_label: latestEngagement?.cfo_approved_at ? 'CFO approval recorded' : null,
    ceo_approver_label: latestEngagement?.ceo_approved_at ? 'CEO approval recorded' : null,
    suggested_action_plan: suggestedActionPlan,
  });

  await writeLegalAudit(sb, {
    actor_user_id: ctx.user_id, actor_role: ctx.role,
    action_category: 'privileged_access', action_verb: 'briefing_packet_generated',
    target_table: 'legal_investigation_cases', target_id: params.caseId, case_id: params.caseId,
  });

  return new NextResponse(md, {
    status: 200,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
