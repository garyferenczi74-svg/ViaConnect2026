// Prompt #95 Phase 3: update a draft pricing proposal.
// PATCH /api/admin/governance/proposals/[id]
// Body: Partial<PricingProposalRow> (whitelisted fields only).
// Only drafts can be edited; submitted / approved / activated proposals
// are read-only.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const ALLOWED_FIELDS = new Set([
  'title',
  'summary',
  'pricing_domain_id',
  'target_object_ids',
  'current_value_cents',
  'proposed_value_cents',
  'current_value_percent',
  'proposed_value_percent',
  'change_type',
  'impact_tier',
  'auto_classified_tier',
  'tier_override_justification',
  'estimated_affected_customers',
  'estimated_annual_revenue_impact_cents',
  'projected_ltv_change_percent',
  'projected_churn_change_percent',
  'projected_ltv_cac_ratio_24mo_before',
  'projected_ltv_cac_ratio_24mo_after',
  'unit_economics_snapshot_id',
  'raw_calculation_inputs',
  'rationale',
  'competitive_analysis',
  'stakeholder_communication_plan',
  'risks_and_mitigations',
  'proposed_effective_date',
  'grandfathering_policy',
  'grandfathering_override_justification',
  'is_emergency',
  'emergency_justification',
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Body required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(k)) patch[k] = v;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No allowed fields in patch' }, { status: 400 });
  }

  const supabase = createClient();

  try {
    const existingRes = await withTimeout(
      (async () => supabase
        .from('pricing_proposals')
        .select('id, status, initiated_by')
        .eq('id', params.id)
        .maybeSingle())(),
      8000,
      'api.admin.governance.proposals.patch.load',
    );
    const row = existingRes.data as
      | { id: string; status: string; initiated_by: string }
      | null;
    if (!row) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

    if (row.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot edit proposal in status ${row.status}` },
        { status: 409 },
      );
    }
    if (row.initiated_by !== auth.userId) {
      return NextResponse.json({ error: 'Only initiator may edit this draft' }, { status: 403 });
    }

    const updateRes = await withTimeout(
      (async () => supabase
        .from('pricing_proposals')
        .update({ ...patch, updated_at: new Date().toISOString() } as never)
        .eq('id', params.id))(),
      8000,
      'api.admin.governance.proposals.patch.update',
    );

    if (updateRes.error) {
      safeLog.error('api.admin.governance.proposals.patch', 'update failed', { proposalId: params.id, error: updateRes.error });
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, fields_updated: Object.keys(patch).length });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.admin.governance.proposals.patch', 'timeout', { proposalId: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out.' }, { status: 503 });
    }
    safeLog.error('api.admin.governance.proposals.patch', 'unexpected error', { proposalId: params.id, error: err });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
