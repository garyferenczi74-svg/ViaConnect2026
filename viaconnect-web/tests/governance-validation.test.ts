// Prompt #95 Phase 3: pure proposal-completeness validation tests.

import { describe, it, expect } from 'vitest';
import {
  validateProposalForSubmit,
  type ValidateProposalInput,
} from '@/lib/governance/validate-proposal';

function complete(overrides: Partial<ValidateProposalInput> = {}): ValidateProposalInput {
  const future = new Date();
  future.setDate(future.getDate() + 30);
  return {
    title: 'Gold monthly price adjustment for inflation compensation',
    summary:
      'Raising the Gold tier monthly subscription from $49 to $54 to offset rising supplement COGS and to align with the revised margin guidance from the Q4 finance review. Existing customers grandfathered indefinitely.',
    pricing_domain_id: 'consumer_gold_monthly',
    target_object_ids: ['gold'],
    change_type: 'price_amount',
    current_value_cents: 4900,
    proposed_value_cents: 5400,
    current_value_percent: null,
    proposed_value_percent: null,
    rationale: 'Lorem ipsum '.repeat(30),
    competitive_analysis: 'Comparable offerings from Thorne Advantage and Rootine benchmark $55 to $65 monthly for similar genetics-informed precision wellness.',
    stakeholder_communication_plan:
      'Email existing Gold members 45 days before activation explaining the change and the grandfathering policy, with a link to the full rationale.',
    proposed_effective_date: future.toISOString().slice(0, 10),
    grandfathering_policy: 'indefinite',
    grandfathering_override_justification: null,
    default_grandfathering_policy: 'indefinite',
    impact_tier: 'moderate',
    is_emergency: false,
    emergency_justification: null,
    ...overrides,
  };
}

describe('validateProposalForSubmit — happy path', () => {
  it('complete moderate proposal returns empty error list', () => {
    expect(validateProposalForSubmit(complete())).toEqual([]);
  });

  it('complete minor proposal does not require competitive analysis', () => {
    const errors = validateProposalForSubmit(
      complete({ impact_tier: 'minor', competitive_analysis: null, stakeholder_communication_plan: null }),
    );
    expect(errors).toEqual([]);
  });
});

describe('validateProposalForSubmit — basics', () => {
  it('rejects title shorter than 20 chars', () => {
    const errors = validateProposalForSubmit(complete({ title: 'too short' }));
    expect(errors.some((e) => e.includes('Title'))).toBe(true);
  });

  it('rejects title longer than 120 chars', () => {
    const errors = validateProposalForSubmit(complete({ title: 'x'.repeat(121) }));
    expect(errors.some((e) => e.includes('Title'))).toBe(true);
  });

  it('rejects summary shorter than 100 chars', () => {
    const errors = validateProposalForSubmit(complete({ summary: 'short summary' }));
    expect(errors.some((e) => e.includes('Summary'))).toBe(true);
  });

  it('rejects summary longer than 500 chars', () => {
    const errors = validateProposalForSubmit(complete({ summary: 'x'.repeat(501) }));
    expect(errors.some((e) => e.includes('Summary'))).toBe(true);
  });

  it('rejects missing pricing_domain_id', () => {
    const errors = validateProposalForSubmit(complete({ pricing_domain_id: null }));
    expect(errors.some((e) => e.includes('domain'))).toBe(true);
  });

  it('rejects empty target_object_ids', () => {
    const errors = validateProposalForSubmit(complete({ target_object_ids: [] }));
    expect(errors.some((e) => e.includes('target'))).toBe(true);
  });
});

describe('validateProposalForSubmit — the change', () => {
  it('rejects missing proposed_value_cents for price_amount', () => {
    const errors = validateProposalForSubmit(complete({ proposed_value_cents: null }));
    expect(errors.some((e) => e.includes('Proposed value'))).toBe(true);
  });

  it('rejects negative proposed_value_cents', () => {
    const errors = validateProposalForSubmit(complete({ proposed_value_cents: -100 }));
    expect(errors.some((e) => e.includes('negative'))).toBe(true);
  });

  it('rejects discount percent out of range', () => {
    const errors = validateProposalForSubmit(
      complete({
        change_type: 'discount_percent',
        current_value_cents: null,
        proposed_value_cents: null,
        current_value_percent: 10,
        proposed_value_percent: 150,
      }),
    );
    expect(errors.some((e) => e.includes('0..100'))).toBe(true);
  });

  it('accepts 0 percent discount', () => {
    const errors = validateProposalForSubmit(
      complete({
        change_type: 'discount_percent',
        current_value_cents: null,
        proposed_value_cents: null,
        current_value_percent: 10,
        proposed_value_percent: 0,
      }),
    );
    expect(errors.filter((e) => e.includes('percent'))).toEqual([]);
  });
});

describe('validateProposalForSubmit — rationale', () => {
  it('rejects rationale shorter than 200 chars', () => {
    const errors = validateProposalForSubmit(complete({ rationale: 'short' }));
    expect(errors.some((e) => e.includes('Rationale'))).toBe(true);
  });

  it('accepts exactly 200 character rationale', () => {
    const errors = validateProposalForSubmit(complete({ rationale: 'x'.repeat(200) }));
    expect(errors.filter((e) => e.includes('Rationale'))).toEqual([]);
  });
});

describe('validateProposalForSubmit — effective date', () => {
  it('rejects effective date less than 7 days away (non-emergency)', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const errors = validateProposalForSubmit(
      complete({ proposed_effective_date: soon.toISOString().slice(0, 10) }),
    );
    expect(errors.some((e) => e.includes('7 days'))).toBe(true);
  });

  it('allows effective date less than 7 days away when emergency', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 1);
    const errors = validateProposalForSubmit(
      complete({
        proposed_effective_date: soon.toISOString().slice(0, 10),
        is_emergency: true,
        emergency_justification: 'Critical payment processing bug requires immediate price adjustment',
      }),
    );
    expect(errors.filter((e) => e.includes('7 days'))).toEqual([]);
  });

  it('rejects missing effective date', () => {
    const errors = validateProposalForSubmit(complete({ proposed_effective_date: null }));
    expect(errors.some((e) => e.includes('effective date'))).toBe(true);
  });
});

describe('validateProposalForSubmit — grandfathering', () => {
  it('does not require override justification when policy matches default', () => {
    const errors = validateProposalForSubmit(complete({
      grandfathering_policy: 'indefinite',
      default_grandfathering_policy: 'indefinite',
      grandfathering_override_justification: null,
    }));
    expect(errors.filter((e) => e.includes('override'))).toEqual([]);
  });

  it('requires override justification when departing from default', () => {
    const errors = validateProposalForSubmit(complete({
      grandfathering_policy: 'thirty_days',
      default_grandfathering_policy: 'indefinite',
      grandfathering_override_justification: null,
    }));
    expect(errors.some((e) => e.includes('override'))).toBe(true);
  });

  it('accepts override justification when long enough', () => {
    const errors = validateProposalForSubmit(complete({
      grandfathering_policy: 'thirty_days',
      default_grandfathering_policy: 'indefinite',
      grandfathering_override_justification:
        'Shortening grandfathering because the prior price was loss-making and cannot be sustained for existing subscribers.',
    }));
    expect(errors.filter((e) => e.includes('override'))).toEqual([]);
  });
});

describe('validateProposalForSubmit — emergency', () => {
  it('requires emergency_justification when is_emergency is true', () => {
    const errors = validateProposalForSubmit(complete({
      is_emergency: true,
      emergency_justification: null,
    }));
    expect(errors.some((e) => e.includes('Emergency justification'))).toBe(true);
  });

  it('accepts emergency with long-enough justification', () => {
    const errors = validateProposalForSubmit(complete({
      is_emergency: true,
      emergency_justification: 'Critical payment flow regression requires immediate rollback',
    }));
    expect(errors.filter((e) => e.includes('Emergency'))).toEqual([]);
  });
});

describe('validateProposalForSubmit — tier-specific requirements', () => {
  it('moderate requires competitive analysis', () => {
    const errors = validateProposalForSubmit(
      complete({ impact_tier: 'moderate', competitive_analysis: null }),
    );
    expect(errors.some((e) => e.includes('Competitive analysis'))).toBe(true);
  });

  it('major requires communication plan', () => {
    const errors = validateProposalForSubmit(
      complete({ impact_tier: 'major', stakeholder_communication_plan: null }),
    );
    expect(errors.some((e) => e.includes('communication'))).toBe(true);
  });

  it('structural requires both competitive analysis and communication plan', () => {
    const errors = validateProposalForSubmit(complete({
      impact_tier: 'structural',
      competitive_analysis: null,
      stakeholder_communication_plan: null,
    }));
    expect(errors.some((e) => e.includes('Competitive'))).toBe(true);
    expect(errors.some((e) => e.includes('communication'))).toBe(true);
  });

  it('minor requires neither', () => {
    const errors = validateProposalForSubmit(complete({
      impact_tier: 'minor',
      competitive_analysis: null,
      stakeholder_communication_plan: null,
    }));
    expect(errors.filter((e) => e.includes('Competitive'))).toEqual([]);
    expect(errors.filter((e) => e.includes('communication'))).toEqual([]);
  });
});
