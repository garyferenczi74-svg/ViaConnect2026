// Prompt #104 Phase 1: Settlement approval-tier resolver.
//
// Spec §6.4:
//   - Settlement < $5,000:           compliance_only (Steve Rica)
//   - Settlement $5,000 - $25,000:   compliance_plus_cfo (Steve + Domenic)
//   - Settlement > $25,000:          compliance_plus_cfo_plus_ceo
//                                    (Steve + Domenic + Gary)
// Boundaries treated identically to budgetApprovalChain: $5K and
// $25K themselves trigger the higher tier.

import type { SettlementApprovalTier, LegalOpsRole } from '../types';
import { CFO_THRESHOLD_CENTS, CEO_THRESHOLD_CENTS } from '../counsel/budgetApprovalChain';

export interface SettlementApprovalRequirement {
  tier: SettlementApprovalTier;
  required_approver_roles: ReadonlyArray<LegalOpsRole>;
}

export function settlementApprovalTierForAmount(amount_cents: number): SettlementApprovalRequirement {
  if (amount_cents < 0) throw new Error('amount_cents must be non-negative');
  if (amount_cents >= CEO_THRESHOLD_CENTS) {
    return {
      tier: 'compliance_plus_cfo_plus_ceo',
      required_approver_roles: ['compliance_officer', 'cfo', 'ceo'],
    };
  }
  if (amount_cents >= CFO_THRESHOLD_CENTS) {
    return {
      tier: 'compliance_plus_cfo',
      required_approver_roles: ['compliance_officer', 'cfo'],
    };
  }
  return {
    tier: 'compliance_only',
    required_approver_roles: ['compliance_officer'],
  };
}
