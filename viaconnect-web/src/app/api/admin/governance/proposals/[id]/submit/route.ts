// Prompt #95 Phase 3 + 4: submit a proposal for approval.
// POST /api/admin/governance/proposals/[id]/submit
//
// Phase 3 transitioned draft -> submitted_for_approval. Phase 4 wires the
// full flow: classify, resolve active approver_assignments, insert
// proposal_approvals rows (required + advisory), and persist the
// classification outcome on the proposal.

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
import type {
  ChangeType,
  PricingDomainCategory,
  ProposalStatus,
} from '@/types/governance';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireGovernanceAdmin();
  if (auth.kind === 'error') return auth.response;

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('pricing_proposals')
    .select('*, pricing_domains(default_grandfathering_policy)')
    .eq('id', params.id)
    .maybeSingle();
  const row = existing as
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

  // Confirm state-machine permits the transition.
  const transition = applyTransition(row.status as ProposalStatus, 'submit');
  if (!transition.ok) {
    return NextResponse.json({ error: transition.error }, { status: 409 });
  }

  // Classify with live decision_rights_rules + resolve approvers.
  const { data: domainRow } = await supabase
    .from('pricing_domains')
    .select('category')
    .eq('id', row.pricing_domain_id as string)
    .maybeSingle();
  const domainCategory = (domainRow as { category: PricingDomainCategory } | null)?.category;
  if (!domainCategory) {
    return NextResponse.json({ error: 'Pricing domain not found' }, { status: 500 });
  }

  const classification = await classifyWithRules({
    domainCategory,
    currentValueCents: row.current_value_cents as number | null,
    proposedValueCents: row.proposed_value_cents as number | null,
    currentValuePercent: row.current_value_percent as number | null,
    proposedValuePercent: row.proposed_value_percent as number | null,
    changeType: row.change_type as ChangeType,
    estimatedAffectedCustomers: (row.estimated_affected_customers as number | null) ?? 0,
  });

  const assignments = await loadActiveAssignmentsForClassification(classification);
  const approvalRows = buildApprovalRows({
    proposalId: params.id,
    classification,
    activeAssignments: assignments,
  });

  // Warn if any required role has zero assigned approvers: we still let the
  // proposal transition, but surface the gap in the response so the admin
  // knows to assign approvers before decisions can land.
  const assignedRoles = new Set(assignments.map((a) => a.approver_role));
  const missingRequired = classification.requiredApprovers.filter(
    (role) => !assignedRoles.has(role),
  );

  // Emergency override: bypass the approval workflow. Transition straight
  // to approved_pending_activation; post-hoc Domenic notification is
  // delegated to Phase 7. The is_emergency flag + emergency_justification
  // already live on the proposal, so the audit surface is complete.
  const finalStatus = row.is_emergency
    ? 'approved_pending_activation'
    : transition.nextStatus;

  // Persist classification + transition in a single update.
  const { error: updateErr } = await supabase
    .from('pricing_proposals')
    .update({
      status: finalStatus,
      submitted_at: new Date().toISOString(),
      impact_tier: classification.tier,
      auto_classified_tier: classification.tier,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', params.id);
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Skip approval-row creation for emergency submissions; they bypass the
  // workflow and will be activated by Gary / cron on their effective date.
  let approvalRecordsCreated = 0;
  if (!row.is_emergency && approvalRows.length > 0) {
    const { error: insertErr } = await supabase
      .from('proposal_approvals')
      .insert(approvalRows as never);
    if (insertErr) {
      return NextResponse.json(
        { error: `Failed to create approval rows: ${insertErr.message}` },
        { status: 500 },
      );
    }
    approvalRecordsCreated = approvalRows.length;
  }

  return NextResponse.json({
    ok: true,
    tier: classification.tier,
    approval_records: approvalRecordsCreated,
    missing_required_roles: missingRequired,
    is_emergency: !!row.is_emergency,
    final_status: finalStatus,
  });
}
