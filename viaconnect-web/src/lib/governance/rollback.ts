// Prompt #95 Phase 6: rollback engine.
//
// Eligibility rules (pure):
//   * Proposal must be in 'activated' status.
//   * <= 30 days since activation. After 30 days, a new reversing proposal
//     is required.
//   * Within 24 hours of activation, any admin may trigger unilateral
//     "instant" rollback for any tier. Beyond 24 hours, moderate+ tiers
//     SHOULD go through a new approval proposal; this engine enforces the
//     24-hour fast-path + 30-day window only. Moderate+ rollback approval
//     is deferred to a follow-up workflow.

import { createClient } from '@/lib/supabase/server';
import { applyTransition } from '@/lib/governance/state-machine';
import type { ImpactTier, ProposalStatus } from '@/types/governance';

export interface RollbackEligibility {
  eligible: boolean;
  reason?: string;
  daysSinceActivation: number;
  isInstantWindow: boolean;
  requiresNewProposal: boolean;
}

/** Pure: can this proposal be rolled back given its status + activation time? */
export function checkRollbackEligibility(params: {
  status: ProposalStatus;
  activatedAt: Date | null;
  now?: Date;
}): RollbackEligibility {
  const now = params.now ?? new Date();
  const msSince =
    params.activatedAt !== null ? now.getTime() - params.activatedAt.getTime() : 0;
  const daysSince = msSince / 86_400_000;

  if (params.status !== 'activated') {
    return {
      eligible: false,
      reason: `Can only rollback from activated status, current status is ${params.status}`,
      daysSinceActivation: 0,
      isInstantWindow: false,
      requiresNewProposal: false,
    };
  }
  if (params.activatedAt === null) {
    return {
      eligible: false,
      reason: 'Proposal has no activated_at timestamp',
      daysSinceActivation: 0,
      isInstantWindow: false,
      requiresNewProposal: false,
    };
  }
  if (daysSince > 30) {
    return {
      eligible: false,
      reason: `More than 30 days since activation (${daysSince.toFixed(1)} days); create a new reversing proposal instead`,
      daysSinceActivation: daysSince,
      isInstantWindow: false,
      requiresNewProposal: true,
    };
  }

  const isInstantWindow = daysSince < 1;
  return {
    eligible: true,
    daysSinceActivation: daysSince,
    isInstantWindow,
    requiresNewProposal: false,
  };
}

export interface RollbackResult {
  ok: boolean;
  error?: string;
  target_rows_updated?: number;
  bindings_superseded?: number;
  history_id?: string;
  new_status?: ProposalStatus;
  instant_window_used?: boolean;
}

export async function rollbackProposal(params: {
  proposalId: string;
  actorUserId: string;
  justification: string;
}): Promise<RollbackResult> {
  if (!params.justification || params.justification.trim().length < 50) {
    return { ok: false, error: 'Rollback justification must be at least 50 characters' };
  }

  const supabase = createClient();

  const { data: proposalData } = await supabase
    .from('pricing_proposals')
    .select('*')
    .eq('id', params.proposalId)
    .maybeSingle();
  const proposal = proposalData as Record<string, unknown> | null;
  if (!proposal) return { ok: false, error: 'Proposal not found' };

  const activatedAt = proposal.activated_at
    ? new Date(proposal.activated_at as string)
    : null;
  const eligibility = checkRollbackEligibility({
    status: proposal.status as ProposalStatus,
    activatedAt,
  });

  if (!eligibility.eligible) {
    return { ok: false, error: eligibility.reason };
  }

  // For Q1 scope: non-instant rollback for moderate+ tiers should go through
  // a new reversing proposal. This engine rejects that path with a clear
  // message so the admin knows to create a new proposal.
  if (
    !eligibility.isInstantWindow &&
    (proposal.impact_tier as ImpactTier) !== 'minor'
  ) {
    return {
      ok: false,
      error: `Rollback of ${proposal.impact_tier} proposals beyond 24 hours requires a new reversing proposal that follows the normal approval workflow. The in-place rollback fast path is available only for minor proposals or within 24 hours of activation.`,
    };
  }

  const transition = applyTransition(proposal.status as ProposalStatus, 'rollback');
  if (!transition.ok) {
    return { ok: false, error: transition.error };
  }

  // Load domain so we know which target table to flip back.
  const { data: domainData } = await supabase
    .from('pricing_domains')
    .select('id, target_table, target_column')
    .eq('id', proposal.pricing_domain_id as string)
    .maybeSingle();
  const domain = domainData as
    | { id: string; target_table: string; target_column: string }
    | null;
  if (!domain) return { ok: false, error: 'Pricing domain not found' };

  // Revert target table to the pre-change value.
  const revertPayload: Record<string, unknown> = {};
  if (proposal.change_type === 'price_amount') {
    revertPayload[domain.target_column] = proposal.current_value_cents;
  } else if (proposal.change_type === 'discount_percent') {
    revertPayload[domain.target_column] = proposal.current_value_percent;
  }

  const targetIds = (proposal.target_object_ids as string[]) ?? [];
  const dynamicClient = supabase as unknown as {
    from(table: string): {
      update(
        values: Record<string, unknown>,
        options: { count: 'exact' },
      ): { in(col: string, values: string[]): Promise<{ error: { message: string } | null; count: number | null }> };
    };
  };
  const { error: revertErr, count: revertCount } = await dynamicClient
    .from(domain.target_table)
    .update(revertPayload, { count: 'exact' })
    .in('id', targetIds);
  if (revertErr) {
    return { ok: false, error: `Target revert failed: ${revertErr.message}` };
  }

  // Supersede all customer_price_bindings authorized by this proposal.
  const { error: supersedeErr, count: supersededCount } = await supabase
    .from('customer_price_bindings')
    .update({ status: 'superseded', updated_at: new Date().toISOString() } as never, {
      count: 'exact',
    })
    .eq('authorized_by_proposal_id', params.proposalId)
    .eq('status', 'active');
  if (supersedeErr) {
    return { ok: false, error: `Binding supersede failed: ${supersedeErr.message}` };
  }

  // Write rollback row to price_change_history (immutable).
  const { data: historyData, error: historyErr } = await supabase
    .from('price_change_history')
    .insert({
      proposal_id: params.proposalId,
      pricing_domain_id: domain.id,
      target_object_id: targetIds[0],
      previous_value_cents: proposal.proposed_value_cents as number | null,
      new_value_cents: proposal.current_value_cents as number | null,
      previous_value_percent: proposal.proposed_value_percent as number | null,
      new_value_percent: proposal.current_value_percent as number | null,
      change_action: 'rollback',
      applied_by_user_id: params.actorUserId,
    } as never)
    .select('id')
    .single();
  if (historyErr) {
    return { ok: false, error: `History insert failed: ${historyErr.message}` };
  }

  // Transition proposal status to rolled_back.
  const nowIso = new Date().toISOString();
  const { error: proposalErr } = await supabase
    .from('pricing_proposals')
    .update({
      status: transition.nextStatus,
      rolled_back_at: nowIso,
      rolled_back_by: params.actorUserId,
      rollback_justification: params.justification.trim(),
      updated_at: nowIso,
    } as never)
    .eq('id', params.proposalId);
  if (proposalErr) {
    return { ok: false, error: `Proposal rollback transition failed: ${proposalErr.message}` };
  }

  return {
    ok: true,
    target_rows_updated: revertCount ?? 0,
    bindings_superseded: supersededCount ?? 0,
    history_id: (historyData as { id: string }).id,
    new_status: transition.nextStatus,
    instant_window_used: eligibility.isInstantWindow,
  };
}
