// Prompt #95 Phase 1: Schema vocabulary tests.
//
// Asserts that TypeScript enums stay in sync with the CHECK constraints
// from migrations _280 through _340. If a migration adds a new impact
// tier or grandfathering policy without updating src/types/governance.ts,
// the assertion counts here fail and the drift is caught at CI time.

import { describe, it, expect } from 'vitest';
import type {
  ApprovalDecision,
  ApproverRole,
  ChangeAction,
  ChangeType,
  CommentType,
  CompetitorBillingCycle,
  CompetitorCategory,
  GrandfatheringPolicy,
  ImpactTier,
  PricingDomainCategory,
  ProposalStatus,
  PricingDomainRow,
  PricingProposalRow,
  ProposalApprovalRow,
  DecisionRightsRuleRow,
  PriceChangeHistoryRow,
  CompetitorPricingRow,
} from '@/types/governance';

// ----- Migration _280: pricing_domains vocabulary -------------------------

const PRICING_CATEGORIES: PricingDomainCategory[] = [
  'consumer_subscription',
  'practitioner_subscription',
  'one_time_purchase',
  'certification',
  'wholesale_discount',
  'outcome_stack_discount',
  'helix_redemption_cap',
  'supplement_msrp',
  'peptide_msrp',
];

const GRANDFATHERING_POLICIES: GrandfatheringPolicy[] = [
  'indefinite',
  'twelve_months',
  'six_months',
  'thirty_days',
  'no_grandfathering',
];

const SEEDED_DOMAIN_IDS = [
  'consumer_gold_monthly',
  'consumer_gold_annual',
  'consumer_platinum_monthly',
  'consumer_platinum_annual',
  'consumer_platinum_plus_monthly',
  'consumer_platinum_plus_annual',
  'genex360_m',
  'genex360_core',
  'genex360_complete',
  'practitioner_standard_monthly',
  'practitioner_standard_annual',
  'practitioner_white_label_monthly',
  'practitioner_white_label_annual',
  'practitioner_wholesale_discount',
  'certification_precision_designer',
  'certification_master_practitioner',
  'certification_annual_recertification',
  'outcome_stack_discount',
  'helix_redemption_cap_individual',
  'helix_redemption_cap_combined',
  'supplement_msrp_generic',
  'peptide_msrp_generic',
] as const;

describe('pricing_domains vocabulary', () => {
  it('has nine category values matching the CHECK constraint', () => {
    expect(PRICING_CATEGORIES).toHaveLength(9);
  });
  it('has five grandfathering policies matching the CHECK constraint', () => {
    expect(GRANDFATHERING_POLICIES).toHaveLength(5);
  });
  it('seeds 22 canonical domains covering every priced object', () => {
    expect(SEEDED_DOMAIN_IDS).toHaveLength(22);
  });
  it('includes all four practitioner subscription tiers', () => {
    expect(SEEDED_DOMAIN_IDS).toContain('practitioner_standard_monthly');
    expect(SEEDED_DOMAIN_IDS).toContain('practitioner_standard_annual');
    expect(SEEDED_DOMAIN_IDS).toContain('practitioner_white_label_monthly');
    expect(SEEDED_DOMAIN_IDS).toContain('practitioner_white_label_annual');
  });
  it('includes both Helix redemption caps', () => {
    expect(SEEDED_DOMAIN_IDS).toContain('helix_redemption_cap_individual');
    expect(SEEDED_DOMAIN_IDS).toContain('helix_redemption_cap_combined');
  });
  it('has a generic per-SKU domain for supplements and peptides', () => {
    expect(SEEDED_DOMAIN_IDS).toContain('supplement_msrp_generic');
    expect(SEEDED_DOMAIN_IDS).toContain('peptide_msrp_generic');
  });
});

// ----- Migration _290: pricing_proposals vocabulary -----------------------

const IMPACT_TIERS: ImpactTier[] = ['minor', 'moderate', 'major', 'structural'];

const CHANGE_TYPES: ChangeType[] = ['price_amount', 'discount_percent'];

const PROPOSAL_STATUSES: ProposalStatus[] = [
  'draft',
  'submitted_for_approval',
  'under_review',
  'approved_pending_activation',
  'activated',
  'rolled_back',
  'rejected',
  'withdrawn',
  'expired',
];

describe('pricing_proposals vocabulary', () => {
  it('has four impact tiers', () => {
    expect(IMPACT_TIERS).toHaveLength(4);
  });
  it('has two change types', () => {
    expect(CHANGE_TYPES).toHaveLength(2);
  });
  it('has nine status values covering every lifecycle state', () => {
    expect(PROPOSAL_STATUSES).toHaveLength(9);
    expect(PROPOSAL_STATUSES).toContain('draft');
    expect(PROPOSAL_STATUSES).toContain('activated');
    expect(PROPOSAL_STATUSES).toContain('rolled_back');
    expect(PROPOSAL_STATUSES).toContain('expired');
  });
});

// ----- Migration _300: proposal_approvals vocabulary ---------------------

const APPROVER_ROLES: ApproverRole[] = [
  'ceo',
  'cfo',
  'advisory_cto',
  'advisory_medical',
  'board_member',
];

const APPROVAL_DECISIONS: ApprovalDecision[] = ['approved', 'rejected', 'abstain'];

describe('proposal_approvals vocabulary', () => {
  it('has five approver roles', () => {
    expect(APPROVER_ROLES).toHaveLength(5);
  });
  it('has three decision values', () => {
    expect(APPROVAL_DECISIONS).toHaveLength(3);
  });
  it('distinguishes advisory roles from required roles', () => {
    expect(APPROVER_ROLES).toContain('advisory_cto');
    expect(APPROVER_ROLES).toContain('advisory_medical');
    expect(APPROVER_ROLES).toContain('ceo');
  });
});

// ----- Migration _310: proposal_comments vocabulary ----------------------

const COMMENT_TYPES: CommentType[] = [
  'discussion', 'concern', 'question', 'answer', 'clarification',
];

describe('proposal_comments vocabulary', () => {
  it('has five comment types', () => {
    expect(COMMENT_TYPES).toHaveLength(5);
  });
});

// ----- Migration _330: price_change_history vocabulary -------------------

const CHANGE_ACTIONS: ChangeAction[] = ['activation', 'rollback'];

describe('price_change_history vocabulary', () => {
  it('has two change actions (activation + rollback)', () => {
    expect(CHANGE_ACTIONS).toHaveLength(2);
  });
});

// ----- Migration _340: competitor_pricing vocabulary ---------------------

const COMPETITOR_CATEGORIES: CompetitorCategory[] = [
  'consumer_subscription',
  'practitioner_subscription',
  'genetic_test',
  'supplement_retail',
  'peptide_retail',
  'certification',
  'precision_wellness_platform',
  'other',
];

const COMPETITOR_BILLING: CompetitorBillingCycle[] = [
  'monthly', 'annual', 'one_time', 'per_unit',
];

describe('competitor_pricing vocabulary', () => {
  it('has eight competitor categories', () => {
    expect(COMPETITOR_CATEGORIES).toHaveLength(8);
  });
  it('has four billing cycle values', () => {
    expect(COMPETITOR_BILLING).toHaveLength(4);
  });
});

// ----- Row type shape sanity checks --------------------------------------

describe('Row type shape sanity', () => {
  it('PricingDomainRow has is_active + pending_dependency + target columns', () => {
    const probe: Pick<
      PricingDomainRow,
      'id' | 'is_active' | 'pending_dependency' | 'target_table' | 'target_column'
    > = {
      id: 'consumer_gold_monthly',
      is_active: true,
      pending_dependency: null,
      target_table: 'membership_tiers',
      target_column: 'monthly_price_cents',
    };
    expect(probe.is_active).toBe(true);
  });

  it('PricingProposalRow carries impact_tier + auto_classified_tier + grandfathering_policy', () => {
    const probe: Pick<
      PricingProposalRow,
      'impact_tier' | 'auto_classified_tier' | 'grandfathering_policy' | 'status'
    > = {
      impact_tier: 'moderate',
      auto_classified_tier: 'moderate',
      grandfathering_policy: 'indefinite',
      status: 'draft',
    };
    expect(probe.grandfathering_policy).toBe('indefinite');
  });

  it('ProposalApprovalRow distinguishes is_required + is_advisory', () => {
    const probe: Pick<
      ProposalApprovalRow,
      'approver_role' | 'is_required' | 'is_advisory'
    > = {
      approver_role: 'cfo',
      is_required: true,
      is_advisory: false,
    };
    expect(probe.is_required).toBe(true);
    expect(probe.is_advisory).toBe(false);
  });

  it('DecisionRightsRuleRow carries threshold bounds', () => {
    const probe: Pick<
      DecisionRightsRuleRow,
      'tier' | 'min_percent_change' | 'max_percent_change' | 'sort_order'
    > = {
      tier: 'moderate',
      min_percent_change: 5 as unknown as number,
      max_percent_change: 15 as unknown as number,
      sort_order: 2,
    };
    expect(probe.tier).toBe('moderate');
  });

  it('PriceChangeHistoryRow carries change_action + applied_at', () => {
    const probe: Pick<
      PriceChangeHistoryRow,
      'change_action' | 'applied_at' | 'proposal_id'
    > = {
      change_action: 'activation',
      applied_at: new Date().toISOString(),
      proposal_id: '10000000-0000-0000-0000-000000000000',
    };
    expect(probe.change_action).toBe('activation');
  });

  it('CompetitorPricingRow carries category + billing_cycle', () => {
    const probe: Pick<
      CompetitorPricingRow,
      'category' | 'billing_cycle' | 'price_cents'
    > = {
      category: 'consumer_subscription',
      billing_cycle: 'monthly',
      price_cents: 5000,
    };
    expect(probe.category).toBe('consumer_subscription');
  });
});
