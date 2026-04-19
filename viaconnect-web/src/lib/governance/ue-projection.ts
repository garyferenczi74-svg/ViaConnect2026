// Prompt #95 Phase 3: Unit Economics projection integration.
//
// The full projection integrates with the Prompt #94 forecast engine +
// unit_economics_snapshots table, neither of which is live yet in this
// database. Until they land, this module returns a stub with clear
// "projection unavailable" flags so the proposal builder UI can render a
// disabled state instead of showing bogus numbers.
//
// When Prompt #94 applies, replace the stub body with real calls into
// `src/lib/analytics/ltv-engine.ts` and `src/lib/analytics/variable-costs.ts`.

import type { PricingDomainCategory } from '@/types/governance';

export interface UeProjectionInput {
  domainCategory: PricingDomainCategory;
  currentValueCents?: number | null;
  proposedValueCents?: number | null;
  currentValuePercent?: number | null;
  proposedValuePercent?: number | null;
  estimatedAffectedCustomers: number;
}

export interface UeProjectionResult {
  available: boolean;
  reason?: string;
  projected_ltv_change_percent?: number;
  projected_churn_change_percent?: number;
  projected_ltv_cac_ratio_24mo_before?: number;
  projected_ltv_cac_ratio_24mo_after?: number;
  raw_calculation_inputs: Record<string, unknown>;
  confidence: 'low' | 'medium' | 'high';
  notes: string[];
}

export async function computeUeProjection(
  input: UeProjectionInput,
): Promise<UeProjectionResult> {
  // Stub: return unavailable until Prompt #94 forecast infrastructure
  // (unit_economics_snapshots + LTV engine + variable-cost model) is live.
  return {
    available: false,
    reason:
      'Unit economics projection requires the Prompt #94 unit_economics_snapshots table and LTV engine. Both are pending application. The proposal form will accept an override percent change if the initiator has an exogenous projection to cite.',
    raw_calculation_inputs: {
      domain_category: input.domainCategory,
      current_value_cents: input.currentValueCents ?? null,
      proposed_value_cents: input.proposedValueCents ?? null,
      current_value_percent: input.currentValuePercent ?? null,
      proposed_value_percent: input.proposedValuePercent ?? null,
      estimated_affected_customers: input.estimatedAffectedCustomers,
      stub: true,
    },
    confidence: 'low',
    notes: [
      'Projection engine not yet live; values shown are placeholders.',
      'Do not use stub projections as approval evidence.',
    ],
  };
}
