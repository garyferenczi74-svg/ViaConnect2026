// Prompt #95 Phase 5: proposal activation.
//
// Applies an approved proposal:
//   1. If grandfathering enabled, snapshot existing customers with
//      their current price (pre-change value) into customer_price_bindings.
//   2. Update the target table (e.g., membership_tiers.monthly_price_cents)
//      with the new value.
//   3. Write an immutable row to price_change_history.
//   4. Transition proposal.status to 'activated'.
//
// Per-domain snapshot logic is dispatched from snapshotSubscribers. Only
// active-in-DB domains are implemented; pending-dependency domains (e.g.,
// practitioner_subscription) throw with a clear message.

import { createClient } from '@/lib/supabase/server';
import { applyTransition } from '@/lib/governance/state-machine';
import { computeExpirationDate } from '@/lib/governance/grandfathering';
import type {
  GrandfatheringPolicy,
  ProposalStatus,
} from '@/types/governance';

export interface ActivateResult {
  ok: boolean;
  error?: string;
  target_rows_updated?: number;
  bindings_created?: number;
  history_id?: string;
  new_status?: ProposalStatus;
}

export async function activateProposal(
  proposalId: string,
  activatedBy: string,
): Promise<ActivateResult> {
  const supabase = createClient();

  const { data: proposalData } = await supabase
    .from('pricing_proposals')
    .select('*')
    .eq('id', proposalId)
    .maybeSingle();
  const proposal = proposalData as Record<string, unknown> | null;
  if (!proposal) return { ok: false, error: 'Proposal not found' };

  const currentStatus = proposal.status as ProposalStatus;
  const transition = applyTransition(currentStatus, 'activate');
  if (!transition.ok) {
    return { ok: false, error: transition.error };
  }

  const { data: domainData } = await supabase
    .from('pricing_domains')
    .select('id, category, target_table, target_column, is_active')
    .eq('id', proposal.pricing_domain_id as string)
    .maybeSingle();
  const domain = domainData as
    | {
        id: string;
        category: string;
        target_table: string;
        target_column: string;
        is_active: boolean;
      }
    | null;
  if (!domain) return { ok: false, error: 'Pricing domain not found' };
  if (!domain.is_active) {
    return {
      ok: false,
      error: `Pricing domain ${domain.id} is pending a dependency and cannot be activated yet`,
    };
  }

  const grandfathering = proposal.grandfathering_policy as GrandfatheringPolicy;
  const now = new Date();

  // 1. Snapshot existing customers (if grandfathering applies).
  let bindingsCreated = 0;
  if (grandfathering !== 'no_grandfathering') {
    bindingsCreated = await snapshotSubscribers({
      supabase,
      proposalId: proposal.id as string,
      pricingDomainId: domain.id,
      domainCategory: domain.category,
      targetObjectIds: (proposal.target_object_ids as string[]) ?? [],
      boundValueCents: proposal.current_value_cents as number | null,
      boundValuePercent: proposal.current_value_percent as number | null,
      grandfathering,
      expiresAt: computeExpirationDate(grandfathering, now),
    });
  }

  // 2. Update the target table with the new value.
  const updatePayload: Record<string, unknown> = {};
  if (proposal.change_type === 'price_amount') {
    updatePayload[domain.target_column] = proposal.proposed_value_cents;
  } else if (proposal.change_type === 'discount_percent') {
    updatePayload[domain.target_column] = proposal.proposed_value_percent;
  }

  const targetIds = (proposal.target_object_ids as string[]) ?? [];
  if (targetIds.length === 0) {
    return { ok: false, error: 'Proposal has no target_object_ids; cannot activate' };
  }

  // domain.target_table is a runtime string; cast the client so TypeScript
  // doesn't try to resolve the exact Row type across every table union.
  const dynamicClient = supabase as unknown as {
    from(table: string): {
      update(
        values: Record<string, unknown>,
        options: { count: 'exact' },
      ): { in(col: string, values: string[]): Promise<{ error: { message: string } | null; count: number | null }> };
    };
  };
  const { error: targetErr, count: targetCount } = await dynamicClient
    .from(domain.target_table)
    .update(updatePayload, { count: 'exact' })
    .in('id', targetIds);
  if (targetErr) {
    return { ok: false, error: `Target update failed: ${targetErr.message}` };
  }

  // 3. Write to price_change_history.
  const { data: historyData, error: historyErr } = await supabase
    .from('price_change_history')
    .insert({
      proposal_id: proposal.id as string,
      pricing_domain_id: domain.id,
      target_object_id: targetIds[0],
      previous_value_cents: proposal.current_value_cents as number | null,
      new_value_cents: proposal.proposed_value_cents as number | null,
      previous_value_percent: proposal.current_value_percent as number | null,
      new_value_percent: proposal.proposed_value_percent as number | null,
      change_action: 'activation',
      applied_by_user_id: activatedBy,
    } as never)
    .select('id')
    .single();
  if (historyErr) {
    return { ok: false, error: `Audit insert failed: ${historyErr.message}` };
  }

  // 4. Transition proposal status.
  const { error: proposalErr } = await supabase
    .from('pricing_proposals')
    .update({
      status: transition.nextStatus,
      activated_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as never)
    .eq('id', proposal.id as string);
  if (proposalErr) {
    return { ok: false, error: `Proposal transition failed: ${proposalErr.message}` };
  }

  return {
    ok: true,
    target_rows_updated: targetCount ?? 0,
    bindings_created: bindingsCreated,
    history_id: (historyData as { id: string }).id,
    new_status: transition.nextStatus,
  };
}

interface SnapshotArgs {
  supabase: ReturnType<typeof createClient>;
  proposalId: string;
  pricingDomainId: string;
  domainCategory: string;
  targetObjectIds: string[];
  boundValueCents: number | null;
  boundValuePercent: number | null;
  grandfathering: Exclude<GrandfatheringPolicy, 'no_grandfathering'>;
  expiresAt: Date | null;
}

/** Per-domain snapshot dispatcher. Only implemented for domains with live
 *  target tables. Returns count of bindings inserted. */
async function snapshotSubscribers(args: SnapshotArgs): Promise<number> {
  const { supabase, domainCategory } = args;

  if (domainCategory === 'consumer_subscription') {
    // Consumer subscription: snapshot every user currently on the given
    // tier id + billing cycle combo.
    const billingCycle = args.pricingDomainId.endsWith('monthly') ? 'monthly' : 'annual';
    const tierId = args.targetObjectIds[0];
    if (!tierId) return 0;

    const { data: members } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('tier_id', tierId)
      .eq('billing_cycle', billingCycle)
      .eq('status', 'active');

    const rows = ((members ?? []) as Array<{ user_id: string }>).map((m) => ({
      user_id: m.user_id,
      pricing_domain_id: args.pricingDomainId,
      target_object_id: tierId,
      bound_value_cents: args.boundValueCents,
      bound_value_percent: args.boundValuePercent,
      authorized_by_proposal_id: args.proposalId,
      grandfathering_policy: args.grandfathering,
      binding_expires_at: args.expiresAt?.toISOString() ?? null,
    }));
    if (rows.length === 0) return 0;

    const { error } = await supabase.from('customer_price_bindings').insert(rows as never);
    if (error) throw new Error(`Customer snapshot failed: ${error.message}`);
    return rows.length;
  }

  // One-time purchases do not grandfather; no bindings needed.
  if (domainCategory === 'one_time_purchase' || domainCategory === 'outcome_stack_discount') {
    return 0;
  }

  // Practitioner / certification / helix_redemption_cap domains are
  // pending dependency; their snapshot logic will wire up when those
  // target tables ship.
  throw new Error(
    `Activation snapshot for category ${domainCategory} is not yet implemented; dependency pending`,
  );
}
