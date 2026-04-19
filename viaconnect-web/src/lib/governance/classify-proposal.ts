// Prompt #95 Phase 1: Proposal classification engine (pure).
//
// Takes proposed change parameters + the current decision_rights_rules +
// returns the impact tier and the approver routing. The function is pure;
// the caller loads the rules from the database (or a mock for tests).
//
// Classification order:
//   1. Compute percent change (absolute).
//   2. Structural override: wholesale discount change > 5pts OR
//      practitioner subscription change > 15% -> structural.
//   3. Iterate rules in sort_order, find the first whose category list
//      includes the domain category AND whose min/max percent window
//      admits the change.
//   4. Major override: >500 affected customers on a moderate tier
//      escalates to major.
//
// If no rule matches, fall back to the broadest matching tier (structural
// if defined, else major) so the proposal never silently classifies as
// minor by default.

import type {
  ApproverRole,
  ChangeType,
  ClassificationResult,
  DecisionRightsRuleRow,
  ImpactTier,
  PricingDomainCategory,
} from '@/types/governance';

export interface ClassifyInput {
  domainCategory: PricingDomainCategory;
  currentValueCents?: number | null;
  proposedValueCents?: number | null;
  currentValuePercent?: number | null;
  proposedValuePercent?: number | null;
  changeType: ChangeType;
  estimatedAffectedCustomers: number;
}

// A normalized subset of DecisionRightsRuleRow. Makes unit tests easier
// than constructing full Row objects with every column.
export interface DecisionRightsRuleInput {
  tier: ImpactTier;
  min_percent_change: number | null;
  max_percent_change: number | null;
  applies_to_categories: string[];
  required_approvers: string[];
  advisory_approvers: string[];
  requires_board_notification: boolean;
  requires_board_approval: boolean;
  target_decision_sla_hours: number | null;
  sort_order: number;
  is_active: boolean;
}

export function classifyProposalPure(
  input: ClassifyInput,
  rules: DecisionRightsRuleInput[],
): ClassificationResult {
  const percentChange = computePercentChange(input);
  const absPct = Math.abs(percentChange);
  const reasons: string[] = [];

  const activeRules = rules
    .filter((r) => r.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const byTier = (t: ImpactTier): DecisionRightsRuleInput | undefined =>
    activeRules.find((r) => r.tier === t);

  // Start with rule-match pass (first window that fits the category).
  let matched: DecisionRightsRuleInput | undefined;
  for (const rule of activeRules) {
    if (!rule.applies_to_categories.includes(input.domainCategory)) continue;
    if (rule.min_percent_change !== null && absPct < rule.min_percent_change) continue;
    if (rule.max_percent_change !== null && absPct > rule.max_percent_change) continue;
    matched = rule;
    break;
  }

  // Structural override: wholesale >5pts or practitioner subscription >15%.
  const isWholesaleOver5 =
    input.domainCategory === 'wholesale_discount' && absPct > 5;
  const isPractitionerOver15 =
    input.domainCategory === 'practitioner_subscription' && absPct > 15;
  if (isWholesaleOver5 || isPractitionerOver15) {
    const structural = byTier('structural');
    if (structural) {
      matched = structural;
      reasons.push(
        isWholesaleOver5
          ? `Classified as structural because wholesale discount change exceeds 5pts (${absPct.toFixed(2)}pts)`
          : `Classified as structural because practitioner subscription change exceeds 15% (${absPct.toFixed(2)}%)`,
      );
    }
  }

  // Major override on affected-customer count.
  if (
    matched?.tier === 'moderate' &&
    input.estimatedAffectedCustomers > 500
  ) {
    const major = byTier('major');
    if (major) {
      matched = major;
      reasons.push(
        `Escalated to major because ${input.estimatedAffectedCustomers} customers affected (>500 threshold)`,
      );
    }
  }

  // If no rule matched, default to the most-protective tier the rule set
  // defines (structural > major > moderate > minor).
  if (!matched) {
    matched = byTier('structural') ?? byTier('major') ?? byTier('moderate') ?? byTier('minor');
    if (matched) {
      reasons.push(
        `No explicit tier matched the ${input.domainCategory} category at ${absPct.toFixed(2)}% change; defaulting to ${matched.tier} for safety`,
      );
    }
  }

  if (!matched) {
    throw new Error('No decision_rights_rules configured; classification impossible');
  }

  return {
    tier: matched.tier,
    percentChange,
    reasons,
    requiredApprovers: matched.required_approvers as ApproverRole[],
    advisoryApprovers: matched.advisory_approvers as ApproverRole[],
    requiresBoardNotification: matched.requires_board_notification,
    requiresBoardApproval: matched.requires_board_approval,
    slaHours: matched.target_decision_sla_hours,
  };
}

/** Pure percent-change calculator. Price amount: (new - old) / old * 100.
 *  Discount percent: new - old (in pts). */
export function computePercentChange(input: ClassifyInput): number {
  if (input.changeType === 'price_amount') {
    const current = input.currentValueCents ?? 0;
    const proposed = input.proposedValueCents ?? 0;
    if (current === 0) return proposed === 0 ? 0 : 100;
    return ((proposed - current) / current) * 100;
  }
  const currentPct = input.currentValuePercent ?? 0;
  const proposedPct = input.proposedValuePercent ?? 0;
  return proposedPct - currentPct;
}

/** Narrow cast helper for consumers with full DecisionRightsRuleRow. */
export function asClassifierRule(row: DecisionRightsRuleRow): DecisionRightsRuleInput {
  return {
    tier: row.tier as ImpactTier,
    min_percent_change: row.min_percent_change as number | null,
    max_percent_change: row.max_percent_change as number | null,
    applies_to_categories: row.applies_to_categories as string[],
    required_approvers: row.required_approvers as string[],
    advisory_approvers: row.advisory_approvers as string[],
    requires_board_notification: row.requires_board_notification,
    requires_board_approval: row.requires_board_approval,
    target_decision_sla_hours: row.target_decision_sla_hours,
    sort_order: row.sort_order,
    is_active: row.is_active,
  };
}
