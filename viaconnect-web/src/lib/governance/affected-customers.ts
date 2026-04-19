// Prompt #95 Phase 3: affected-customer count estimator.
//
// Each pricing domain has an affected_customer_query_template column with
// an example SQL query, but executing arbitrary seeded SQL through the
// Supabase client is risky. Instead, this module hard-codes the per-domain
// count query so the expression tree is reviewable in TypeScript, not
// dynamically composed at runtime.

import { createClient } from '@/lib/supabase/server';
import type { PricingSupabaseClient } from '@/lib/pricing/supabase-types';

export interface AffectedCustomersResult {
  count: number;
  method: string;
  notes: string[];
}

export async function estimateAffectedCustomers(
  pricingDomainId: string,
  targetObjectIds: string[],
): Promise<AffectedCustomersResult> {
  const supabase = createClient() as unknown as PricingSupabaseClient;
  const notes: string[] = [];

  // ---- Consumer subscription tiers --------------------------------------
  if (pricingDomainId === 'consumer_gold_monthly' || pricingDomainId === 'consumer_gold_annual') {
    return countActiveMemberships(supabase, 'gold',
      pricingDomainId.endsWith('monthly') ? 'monthly' : 'annual');
  }
  if (pricingDomainId === 'consumer_platinum_monthly' || pricingDomainId === 'consumer_platinum_annual') {
    return countActiveMemberships(supabase, 'platinum',
      pricingDomainId.endsWith('monthly') ? 'monthly' : 'annual');
  }
  if (
    pricingDomainId === 'consumer_platinum_plus_monthly' ||
    pricingDomainId === 'consumer_platinum_plus_annual'
  ) {
    return countActiveMemberships(supabase, 'platinum_family',
      pricingDomainId.endsWith('monthly') ? 'monthly' : 'annual');
  }

  // ---- GeneX360 one-time purchases (future buyers, not existing) --------
  if (pricingDomainId.startsWith('genex360_')) {
    notes.push('One-time purchase: change applies to future buyers only, not past purchasers');
    return { count: 0, method: 'one_time_no_grandfathering', notes };
  }

  // ---- Supplement / peptide MSRP (count recent purchasers per SKU) ------
  if (pricingDomainId === 'supplement_msrp_generic' || pricingDomainId === 'peptide_msrp_generic') {
    if (targetObjectIds.length === 0) {
      return { count: 0, method: 'no_target_skus_specified', notes: ['Specify target SKU(s) to estimate'] };
    }
    const { count, error } = await supabase
      .from('orders')
      .select('user_id', { count: 'exact', head: true })
      .in('status', ['complete', 'delivered', 'shipped']);
    if (error) {
      notes.push(`orders query failed: ${error.message}`);
    }
    notes.push(
      `Counted recent purchasers across all statuses as a proxy; per-SKU filtering requires joining order_line_items (not in current schema).`,
    );
    return { count: count ?? 0, method: 'recent_purchaser_proxy', notes };
  }

  // ---- Outcome stack discount (affects all active stack customers) ------
  if (pricingDomainId === 'outcome_stack_discount') {
    notes.push(
      'Outcome stack discount change affects every customer who purchases a stack in the future. Past-purchaser impact is zero because one-time purchases do not grandfather.',
    );
    return { count: 0, method: 'future_impact_only', notes };
  }

  // ---- Practitioner / certification / Helix cap domains (pending) -------
  if (
    pricingDomainId.startsWith('practitioner_') ||
    pricingDomainId.startsWith('certification_') ||
    pricingDomainId.startsWith('helix_redemption_cap_')
  ) {
    notes.push(
      'This domain is pending its target table dependency. Estimation will be available once the dependency ships.',
    );
    return { count: 0, method: 'dependency_pending', notes };
  }

  notes.push(`No estimator configured for pricing_domain_id=${pricingDomainId}`);
  return { count: 0, method: 'unknown_domain', notes };
}

async function countActiveMemberships(
  supabase: PricingSupabaseClient,
  tierId: string,
  billingCycle: 'monthly' | 'annual',
): Promise<AffectedCustomersResult> {
  const notes: string[] = [];
  const { count, error } = await supabase
    .from('memberships')
    .select('user_id', { count: 'exact', head: true })
    .eq('tier_id', tierId)
    .eq('billing_cycle', billingCycle)
    .eq('status', 'active');
  if (error) {
    notes.push(`memberships query failed: ${error.message}`);
    return { count: 0, method: 'active_membership_count', notes };
  }
  return {
    count: count ?? 0,
    method: 'active_membership_count',
    notes,
  };
}
