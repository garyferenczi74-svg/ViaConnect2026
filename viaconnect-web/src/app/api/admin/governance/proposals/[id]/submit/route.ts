// Prompt #95 Phase 3 + 4: submit a proposal for approval.
// POST /api/admin/governance/proposals/[id]/submit
//
// Phase 3 transitioned draft -> submitted_for_approval. Phase 4 wires the
// full flow: classify, resolve active approver_assignments, insert
// proposal_approvals rows (required + advisory), and persist the
// classification outcome on the proposal.
//
// Prompt #140b Layer 3 hardening: every Supabase + classifier call wrapped
// with withTimeout, outer try/catch with safeLog.

import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireGovernanceAdmin } from '@/lib/governance/admin-guard';
import { validateProposalForSubmit } from '@/lib/governance/validate-proposal';
import { classifyWithRules } from '@/lib/governance/classify-with-rules';
import { applyTransition } from '@/lib/governance/state-machine';
import {
  buildApprovalRows,
  loadActiveAssignmentsForClassification,
} from '@/lib/governance/submit-wiring';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type {
  ChangeType,
  PricingDomainCategory,
  ProposalStatus,
} from '@/types/governance';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const auth = await requireGovernanceAdmin();
    if (auth.kind === 'error') return auth.response;

    const supabase = createClient();

    const existingRes = await withTimeout(
      (async () => supabase
        .from('pricing_proposals')
        .select('*, pricing_domains(default_grandfathering_policy)')
        .eq('id', params.id)
        .maybeSingle())(),
      8000,
      'api.governance.submit.load-proposal',
    );
    const row = existingRes.data as
      | (Record<string, unknown> & {
          status: string;
          initiated_by: string;
          pricing_domains: { default_grandfathering_policy: string } | null;
        })
      | null;
    if (!row) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    if (row.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot submit proposal in status ${row.status}` },
        { status: 409 },
      );
    }
    if (row.initiated_by !== auth.userId) {
      return NextResponse.json({ error: 'Only initiator may submit this draft' }, { status: 403 });
    }

    const errors = validateProposalForSubmit({
      title: row.title as string,
      summary: row.summary as string,
      pricing_domain_id: row.pricing_domain_id as string,
      target_object_ids: row.target_object_ids as string[],
      change_type: row.change_type as 'price_amount' | 'discount_percent',
      current_value_cents: row.current_value_cents as number | null,
      proposed_value_cents: row.proposed_value_cents as number | null,
      current_value_percent: row.current_value_percent as number | null,
      proposed_value_percent: row.proposed_value_percent as number | null,
      rationale: row.rationale as string,
      competitive_analysis: row.competitive_analysis as string | null,
      stakeholder_communication_plan: row.stakeholder_communication_plan as string | null,
      proposed_effective_date: row.proposed_effective_date as string,
      grandfathering_policy: row.grandfathering_policy as string,
      grandfathering_override_justification: row.grandfathering_override_justification as string | null,
      default_grandfathering_policy: row.pricing_domains?.default_grandfathering_policy ?? null,
      impact_tier: row.impact_tier as 'minor' | 'moderate' | 'major' | 'structural',
      is_emergency: row.is_emergency as boolean,
      emergency_justification: row.emergency_justification as string | null,
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Proposal incomplete', errors }, { status: 400 });
    }

    const transition = applyTransition(row.status as ProposalStatus, 'submit');
    if (!transition.ok) {
      return NextResponse.json({ error: transition.error }, { status: 409 });
    }

    const domainRes = await withTimeout(
      (async () => supabase
        .from('pricing_domains')
        .select('category')
        .eq('id', row.pricing_domain_id as string)
        .maybeSingle())(),
      8000,
      'api.governance.submit.load-domain',
    );
    const domainCategory = (domainRes.data as { category: PricingDomainCategory } | null)?.category;
    if (!domainCategory) {
      return NextResponse.json({ error: 'Pricing domain not found' }, { status: 500 });
    }

    const classification = await withTimeout(
      classifyWithRules({
        domainCategory,
        currentValueCents: row.current_value_cents as number | null,
        proposedValueCents: row.proposed_value_cents as number | null,
        currentValuePercent: row.current_value_percent as number | null,
        proposedValuePercent: row.proposed_value_percent as number | null,
        changeType: row.change_type as ChangeType,
        estimatedAffectedCustomers: (row.estimated_affected_customers as number | null) ?? 0,
      }),
      10000,
      'api.governance.submit.classify',
    );

    const assignments = await withTimeout(
      loadActiveAssignmentsForClassification(classification),
      10000,
      'api.governance.submit.load-assignments',
    );
    const approvalRows = buildApprovalRows({
      proposalId: params.id,
      classification,
      activeAssignments: assignments,
    });

    const assignedRoles = new Set(assignments.map((a) => a.approver_role));
    const missingRequired = classification.requiredApprovers.filter(
      (role) => !assignedRoles.has(role),
    );

    const finalStatus = row.is_emergency
      ? 'approved_pending_activation'
      : transition.nextStatus;

    const updateRes = await withTimeout(
      (async () => supabase
        .from('pricing_proposals')
        .update({
          status: finalStatus,
          submitted_at: new Date().toISOString(),
          impact_tier: classification.tier,
          auto_classified_tier: classification.tier,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', params.id))(),
      8000,
      'api.governance.submit.update-proposal',
    );
    if (updateRes.error) {
      safeLog.error('api.governance.submit', 'proposal update failed', { requestId, proposalId: params.id, error: updateRes.error });
      return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
    }

    let approvalRecordsCreated = 0;
    if (!row.is_emergency && approvalRows.length > 0) {
      const insertRes = await withTimeout(
        (async () => supabase
          .from('proposal_approvals')
          .insert(approvalRows as never))(),
        10000,
        'api.governance.submit.insert-approvals',
      );
      if (insertRes.error) {
        safeLog.error('api.governance.submit', 'approvals insert failed', { requestId, proposalId: params.id, error: insertRes.error });
        return NextResponse.json(
          { error: `Failed to create approval rows: ${insertRes.error.message}` },
          { status: 500 },
        );
      }
      approvalRecordsCreated = approvalRows.length;
    }

    safeLog.info('api.governance.submit', 'proposal submitted', {
      requestId, proposalId: params.id, tier: classification.tier, approvalRecordsCreated, finalStatus,
    });

    return NextResponse.json({
      ok: true,
      tier: classification.tier,
      approval_records: approvalRecordsCreated,
      missing_required_roles: missingRequired,
      is_emergency: !!row.is_emergency,
      final_status: finalStatus,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.governance.submit', 'database timeout', { requestId, proposalId: params.id, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.governance.submit', 'unexpected error', { requestId, proposalId: params.id, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
