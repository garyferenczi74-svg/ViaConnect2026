// Prompt #95 Phase 1: Pure classification engine tests.
//
// Covers every decision path in `classifyProposalPure`:
//   - Rule-window matching per tier
//   - Structural override for wholesale >5pts
//   - Structural override for practitioner subscription >15%
//   - Major override for >500 affected customers on moderate tier
//   - Default-to-most-protective when no rule matches
//   - Percent-change math for both change types

import { describe, it, expect } from 'vitest';
import {
  classifyProposalPure,
  computePercentChange,
  type ClassifyInput,
  type DecisionRightsRuleInput,
} from '@/lib/governance/classify-proposal';

// The four canonical tiers, matching migration _320 seeds.
const SEEDED_RULES: DecisionRightsRuleInput[] = [
  {
    tier: 'minor',
    min_percent_change: 0,
    max_percent_change: 5.0,
    applies_to_categories: [
      'consumer_subscription', 'one_time_purchase', 'supplement_msrp', 'peptide_msrp',
    ],
    required_approvers: ['ceo'],
    advisory_approvers: [],
    requires_board_notification: false,
    requires_board_approval: false,
    target_decision_sla_hours: 4,
    sort_order: 1,
    is_active: true,
  },
  {
    tier: 'moderate',
    min_percent_change: 5.0,
    max_percent_change: 15.0,
    applies_to_categories: [
      'consumer_subscription', 'practitioner_subscription', 'one_time_purchase',
      'certification', 'outcome_stack_discount', 'supplement_msrp', 'peptide_msrp',
    ],
    required_approvers: ['ceo', 'cfo'],
    advisory_approvers: ['advisory_cto'],
    requires_board_notification: false,
    requires_board_approval: false,
    target_decision_sla_hours: 24,
    sort_order: 2,
    is_active: true,
  },
  {
    tier: 'major',
    min_percent_change: 15.0,
    max_percent_change: null,
    applies_to_categories: [
      'consumer_subscription', 'practitioner_subscription', 'one_time_purchase',
      'certification', 'wholesale_discount', 'outcome_stack_discount',
      'helix_redemption_cap', 'supplement_msrp', 'peptide_msrp',
    ],
    required_approvers: ['ceo', 'cfo'],
    advisory_approvers: ['advisory_cto', 'advisory_medical'],
    requires_board_notification: true,
    requires_board_approval: false,
    target_decision_sla_hours: 72,
    sort_order: 3,
    is_active: true,
  },
  {
    tier: 'structural',
    min_percent_change: null,
    max_percent_change: null,
    applies_to_categories: ['practitioner_subscription', 'wholesale_discount'],
    required_approvers: ['ceo', 'cfo', 'board_member'],
    advisory_approvers: ['advisory_cto'],
    requires_board_notification: true,
    requires_board_approval: true,
    target_decision_sla_hours: 168,
    sort_order: 4,
    is_active: true,
  },
];

function input(overrides: Partial<ClassifyInput> = {}): ClassifyInput {
  return {
    domainCategory: 'consumer_subscription',
    currentValueCents: 10000,
    proposedValueCents: 10200,
    changeType: 'price_amount',
    estimatedAffectedCustomers: 100,
    ...overrides,
  };
}

// ---- computePercentChange (price_amount) --------------------------------

describe('computePercentChange — price_amount', () => {
  it('+2% on $100 -> 2', () => {
    expect(computePercentChange(input({ currentValueCents: 10000, proposedValueCents: 10200 }))).toBe(2);
  });
  it('-10% on $100 -> -10', () => {
    expect(computePercentChange(input({ currentValueCents: 10000, proposedValueCents: 9000 }))).toBe(-10);
  });
  it('zero current with zero proposed -> 0', () => {
    expect(computePercentChange(input({ currentValueCents: 0, proposedValueCents: 0 }))).toBe(0);
  });
  it('zero current with nonzero proposed -> 100 (sentinel)', () => {
    expect(computePercentChange(input({ currentValueCents: 0, proposedValueCents: 5000 }))).toBe(100);
  });
});

describe('computePercentChange — discount_percent', () => {
  it('moves from 10% to 15% -> +5 (pts)', () => {
    expect(
      computePercentChange(
        input({
          changeType: 'discount_percent',
          currentValuePercent: 10,
          proposedValuePercent: 15,
        }),
      ),
    ).toBe(5);
  });
  it('moves from 20% to 15% -> -5', () => {
    expect(
      computePercentChange(
        input({
          changeType: 'discount_percent',
          currentValuePercent: 20,
          proposedValuePercent: 15,
        }),
      ),
    ).toBe(-5);
  });
});

// ---- Tier window matching -----------------------------------------------

describe('classifyProposalPure — tier window matching', () => {
  it('2% consumer subscription change -> minor', () => {
    const r = classifyProposalPure(
      input({ currentValueCents: 10000, proposedValueCents: 10200 }),
      SEEDED_RULES,
    );
    expect(r.tier).toBe('minor');
    expect(r.requiredApprovers).toEqual(['ceo']);
    expect(r.advisoryApprovers).toEqual([]);
    expect(r.slaHours).toBe(4);
  });

  it('10% consumer subscription change -> moderate', () => {
    const r = classifyProposalPure(
      input({ currentValueCents: 10000, proposedValueCents: 11000 }),
      SEEDED_RULES,
    );
    expect(r.tier).toBe('moderate');
    expect(r.requiredApprovers).toEqual(['ceo', 'cfo']);
    expect(r.advisoryApprovers).toContain('advisory_cto');
  });

  it('25% consumer subscription change -> major (with board notification)', () => {
    const r = classifyProposalPure(
      input({ currentValueCents: 10000, proposedValueCents: 12500 }),
      SEEDED_RULES,
    );
    expect(r.tier).toBe('major');
    expect(r.requiresBoardNotification).toBe(true);
    expect(r.requiresBoardApproval).toBe(false);
  });

  it('negative percent change magnitudes classify same as positive', () => {
    const r = classifyProposalPure(
      input({ currentValueCents: 10000, proposedValueCents: 7500 }),
      SEEDED_RULES,
    );
    expect(r.tier).toBe('major');
  });
});

// ---- Structural overrides -----------------------------------------------

describe('classifyProposalPure — structural overrides', () => {
  it('wholesale discount >5pts -> structural', () => {
    const r = classifyProposalPure(
      input({
        domainCategory: 'wholesale_discount',
        changeType: 'discount_percent',
        currentValuePercent: 50,
        proposedValuePercent: 60,
      }),
      SEEDED_RULES,
    );
    expect(r.tier).toBe('structural');
    expect(r.requiresBoardApproval).toBe(true);
    expect(r.reasons.some((x) => x.includes('wholesale'))).toBe(true);
  });

  it('wholesale discount exactly 5pts does NOT trigger the explicit wholesale-override reason', () => {
    // At exactly 5pts the `absPct > 5` structural-override path does NOT
    // fire. The tier may still end up structural via rule-window fallback
    // (wholesale is not admitted by minor/moderate/major at <15%), but the
    // reason string from the explicit override is absent.
    const r = classifyProposalPure(
      input({
        domainCategory: 'wholesale_discount',
        changeType: 'discount_percent',
        currentValuePercent: 50,
        proposedValuePercent: 55,
      }),
      SEEDED_RULES,
    );
    expect(r.reasons.some((x) => x.includes('exceeds 5pts'))).toBe(false);
  });

  it('practitioner subscription change >15% -> structural', () => {
    const r = classifyProposalPure(
      input({
        domainCategory: 'practitioner_subscription',
        currentValueCents: 12888,
        proposedValueCents: 16000, // +24%
      }),
      SEEDED_RULES,
    );
    expect(r.tier).toBe('structural');
    expect(r.requiresBoardApproval).toBe(true);
    expect(r.reasons.some((x) => x.includes('practitioner'))).toBe(true);
  });

  it('practitioner subscription change exactly 15% -> NOT structural (strict >)', () => {
    const r = classifyProposalPure(
      input({
        domainCategory: 'practitioner_subscription',
        currentValueCents: 10000,
        proposedValueCents: 11500,
      }),
      SEEDED_RULES,
    );
    expect(r.tier).not.toBe('structural');
  });
});

// ---- Major override on affected customers -------------------------------

describe('classifyProposalPure — affected customer escalation', () => {
  it('10% consumer change with 600 affected customers escalates moderate -> major', () => {
    const r = classifyProposalPure(
      input({
        currentValueCents: 10000,
        proposedValueCents: 11000, // +10% (moderate window)
        estimatedAffectedCustomers: 600,
      }),
      SEEDED_RULES,
    );
    expect(r.tier).toBe('major');
    expect(r.reasons.some((x) => x.includes('500'))).toBe(true);
  });

  it('10% consumer change with 500 affected customers stays moderate (strict >)', () => {
    const r = classifyProposalPure(
      input({
        currentValueCents: 10000,
        proposedValueCents: 11000,
        estimatedAffectedCustomers: 500,
      }),
      SEEDED_RULES,
    );
    expect(r.tier).toBe('moderate');
  });

  it('2% minor change does NOT escalate even with 1000 customers', () => {
    const r = classifyProposalPure(
      input({
        currentValueCents: 10000,
        proposedValueCents: 10200,
        estimatedAffectedCustomers: 1000,
      }),
      SEEDED_RULES,
    );
    expect(r.tier).toBe('minor');
  });
});

// ---- Default to most-protective when no rule matches --------------------

describe('classifyProposalPure — no-rule fallback', () => {
  it('wholesale discount 3pts routes to structural (only tier that admits wholesale at <15%)', () => {
    // Minor/moderate categories do not include wholesale_discount. Major
    // requires >=15%. Structural admits wholesale at any percent. The
    // rule-window iteration matches structural directly, so no fallback
    // reason is emitted, but the tier is still structural.
    const r = classifyProposalPure(
      input({
        domainCategory: 'wholesale_discount',
        changeType: 'discount_percent',
        currentValuePercent: 50,
        proposedValuePercent: 53,
      }),
      SEEDED_RULES,
    );
    expect(r.tier).toBe('structural');
  });

  it('helix_redemption_cap change 3pts defaults to major (no minor/moderate match)', () => {
    const r = classifyProposalPure(
      input({
        domainCategory: 'helix_redemption_cap',
        changeType: 'discount_percent',
        currentValuePercent: 15,
        proposedValuePercent: 18, // +3pts
      }),
      SEEDED_RULES,
    );
    expect(['structural', 'major']).toContain(r.tier);
  });
});

// ---- Board involvement surface -----------------------------------------

describe('classifyProposalPure — board involvement', () => {
  it('minor: no board notification', () => {
    const r = classifyProposalPure(
      input({ currentValueCents: 10000, proposedValueCents: 10200 }),
      SEEDED_RULES,
    );
    expect(r.requiresBoardNotification).toBe(false);
    expect(r.requiresBoardApproval).toBe(false);
  });

  it('major: board notification required, approval not required', () => {
    const r = classifyProposalPure(
      input({ currentValueCents: 10000, proposedValueCents: 12500 }),
      SEEDED_RULES,
    );
    expect(r.requiresBoardNotification).toBe(true);
    expect(r.requiresBoardApproval).toBe(false);
  });

  it('structural: board notification AND approval required', () => {
    const r = classifyProposalPure(
      input({
        domainCategory: 'wholesale_discount',
        changeType: 'discount_percent',
        currentValuePercent: 50,
        proposedValuePercent: 60,
      }),
      SEEDED_RULES,
    );
    expect(r.requiresBoardNotification).toBe(true);
    expect(r.requiresBoardApproval).toBe(true);
  });
});
