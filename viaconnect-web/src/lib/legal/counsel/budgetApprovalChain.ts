// Prompt #104 Phase 1: Outside-counsel budget approval chain.
//
// Spec §6.4 + §3.2:
//   - Engagement < $5,000:        compliance approver (Steve Rica) only
//   - Engagement $5,000 - $25,000: compliance + CFO (Domenic Romeo)
//   - Engagement > $25,000:        compliance + CFO + CEO (Gary Ferenczi)
// Boundary semantics: "$5,000" itself triggers CFO (>= 5_000 dollars
// = 500_000 cents); "$25,000" itself triggers CEO. Strict `>` means
// these tier boundaries themselves require the higher tier.

import type { LegalOpsRole } from '../types';

export const CFO_THRESHOLD_CENTS = 500_000;     // $5,000
export const CEO_THRESHOLD_CENTS = 2_500_000;   // $25,000

export interface BudgetApprovalRequirement {
  required_approver_roles: ReadonlyArray<LegalOpsRole>;
  cfo_required: boolean;
  ceo_required: boolean;
}

export function approversForEngagementBudget(estimated_cents: number): BudgetApprovalRequirement {
  if (estimated_cents < 0) throw new Error('estimated_cents must be non-negative');
  const cfoRequired = estimated_cents >= CFO_THRESHOLD_CENTS;
  const ceoRequired = estimated_cents >= CEO_THRESHOLD_CENTS;
  const roles: LegalOpsRole[] = ['compliance_officer'];
  if (cfoRequired) roles.push('cfo');
  if (ceoRequired) roles.push('ceo');
  return { required_approver_roles: roles, cfo_required: cfoRequired, ceo_required: ceoRequired };
}
