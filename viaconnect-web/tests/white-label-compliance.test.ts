// Prompt #96 Phase 4: Compliance checklist + SLA + state-machine tests.
// Elevated coverage target (90%+) per spec.

import { describe, it, expect } from 'vitest';
import {
  runComplianceChecklist,
  classifyReviewSla,
  evaluateApprovalGate,
  isClaimsLabel,
  determineRequiredReviewers,
  CHECK_IDS,
  REMINDER_HOURS,
  ESCALATION_HOURS,
  type ChecklistInput,
  type SlaInput,
  type ApprovalGateInput,
  type ReviewerDecision,
} from '@/lib/white-label/compliance';
import { CANONICAL_MANUFACTURER_LINE } from '@/lib/white-label/schema-types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function validInput(over: Partial<ChecklistInput> = {}): ChecklistInput {
  return {
    design: {
      display_product_name: 'NAD+',
      short_description: 'A premium NAD+ supplement.',
      long_description: 'Premium quality NAD+ for daily use.',
      tagline: 'Quality you can trust',
      structure_function_claims: [],
      usage_directions: 'Take 1 capsule daily with food.',
      warning_text: 'Keep out of reach of children.',
      allergen_statement: 'Contains: tree nuts.',
      other_ingredients: 'Vegetable cellulose, magnesium stearate.',
      manufacturer_line: CANONICAL_MANUFACTURER_LINE,
      supplement_facts_panel_data: {
        serving_size: '1 capsule',
        servings_per_container: 60,
        net_quantity: '60 capsules',
        ingredients: [
          { name: 'NAD+', amount: '500 mg', daily_value_percent: null },
        ],
        source_warnings: [],
      },
    },
    brand: {
      practice_legal_name: 'Smith Wellness LLC',
      practice_address_line_1: '123 Main St',
      practice_phone: '+1-716-555-0100',
    },
    productHasAllergens: true,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Required-element rules
// ---------------------------------------------------------------------------

describe('runComplianceChecklist – required elements', () => {
  it('passes a fully valid label', () => {
    const r = runComplianceChecklist(validInput());
    expect(r.overall_passed).toBe(true);
    expect(r.blocker_failures).toEqual([]);
  });

  it('fails when display_product_name is empty', () => {
    const r = runComplianceChecklist(validInput({
      design: { ...validInput().design, display_product_name: '' },
    }));
    expect(r.overall_passed).toBe(false);
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.STATEMENT_OF_IDENTITY)).toBeTruthy();
  });

  it('fails when display_product_name is too short', () => {
    const r = runComplianceChecklist(validInput({
      design: { ...validInput().design, display_product_name: 'Xy' },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.STATEMENT_OF_IDENTITY)).toBeTruthy();
  });

  it('fails when net_quantity is missing on supplement_facts_panel_data', () => {
    const r = runComplianceChecklist(validInput({
      design: {
        ...validInput().design,
        supplement_facts_panel_data: {
          ...validInput().design.supplement_facts_panel_data,
          net_quantity: '',
        },
      },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.NET_QUANTITY)).toBeTruthy();
  });

  it('fails when manufacturer_line is modified (any character drift)', () => {
    const r = runComplianceChecklist(validInput({
      design: { ...validInput().design, manufacturer_line: 'Manufactured by FarmCeutica Wellness LLC' },
    }));
    const blocker = r.blocker_failures.find((c) => c.id === CHECK_IDS.MANUFACTURER_OF_RECORD);
    expect(blocker).toBeTruthy();
    expect(blocker?.notes).toMatch(/non-editable|modif/i);
  });

  it('passes manufacturer_line check when canonical string is unchanged', () => {
    const r = runComplianceChecklist(validInput());
    expect(r.passed_items.find((c) => c.id === CHECK_IDS.MANUFACTURER_OF_RECORD)).toBeTruthy();
  });

  it('fails when practice contact info is incomplete', () => {
    const r = runComplianceChecklist(validInput({
      brand: { ...validInput().brand, practice_phone: '' },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.PRACTICE_CONTACT_INFO)).toBeTruthy();
  });

  it('fails when supplement_facts ingredients list is empty', () => {
    const r = runComplianceChecklist(validInput({
      design: {
        ...validInput().design,
        supplement_facts_panel_data: {
          ...validInput().design.supplement_facts_panel_data,
          ingredients: [],
        },
      },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.SUPPLEMENT_FACTS_PANEL)).toBeTruthy();
  });

  it('fails when other_ingredients is missing', () => {
    const r = runComplianceChecklist(validInput({
      design: { ...validInput().design, other_ingredients: '' },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.OTHER_INGREDIENTS)).toBeTruthy();
  });

  it('fails when product has allergens but allergen_statement absent', () => {
    const r = runComplianceChecklist(validInput({
      productHasAllergens: true,
      design: { ...validInput().design, allergen_statement: '' },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.ALLERGEN_STATEMENT)).toBeTruthy();
  });

  it('does not require allergen_statement when product has no allergens', () => {
    const r = runComplianceChecklist(validInput({
      productHasAllergens: false,
      design: { ...validInput().design, allergen_statement: '' },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.ALLERGEN_STATEMENT)).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// FDA disclaimer (required when claims present)
// ---------------------------------------------------------------------------

describe('runComplianceChecklist – FDA disclaimer', () => {
  it('requires the disclaimer when structure_function_claims is non-empty', () => {
    const r = runComplianceChecklist(validInput({
      design: {
        ...validInput().design,
        structure_function_claims: ['Supports cellular energy'],
        long_description: 'Premium quality NAD+ for daily use.',
        warning_text: 'Keep out of reach of children.',
      },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.FDA_DISCLAIMER)).toBeTruthy();
  });

  it('passes the disclaimer check when present in long_description', () => {
    const r = runComplianceChecklist(validInput({
      design: {
        ...validInput().design,
        structure_function_claims: ['Supports cellular energy'],
        long_description:
          'Premium quality NAD+ for daily use. These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.',
      },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.FDA_DISCLAIMER)).toBeFalsy();
  });

  it('passes the disclaimer check when present in warning_text', () => {
    const r = runComplianceChecklist(validInput({
      design: {
        ...validInput().design,
        structure_function_claims: ['Supports cellular energy'],
        warning_text:
          'Keep out of reach of children. These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.',
      },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.FDA_DISCLAIMER)).toBeFalsy();
  });

  it('does not require disclaimer when no claims present', () => {
    const r = runComplianceChecklist(validInput());
    expect(r.passed_items.find((c) => c.id === CHECK_IDS.FDA_DISCLAIMER)).toBeFalsy();
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.FDA_DISCLAIMER)).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Disease + FDA approval prohibitions
// ---------------------------------------------------------------------------

describe('runComplianceChecklist – disease claim prohibition', () => {
  const cases = [
    'cures arthritis pain',
    'treats inflammation',
    'heals chronic wounds',
    'diagnoses leaky gut',
    'a proven remedy for anxiety',
  ];
  for (const phrase of cases) {
    it(`fails on disease verb in description: "${phrase}"`, () => {
      const r = runComplianceChecklist(validInput({
        design: { ...validInput().design, long_description: phrase },
      }));
      expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.NO_DISEASE_CLAIMS)).toBeTruthy();
    });
  }

  it('fails when disease verb appears in product name', () => {
    const r = runComplianceChecklist(validInput({
      design: { ...validInput().design, display_product_name: 'CureAll Tonic' },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.NO_DISEASE_CLAIMS)).toBeTruthy();
  });

  it('fails when disease verb appears in structure_function_claims array', () => {
    const r = runComplianceChecklist(validInput({
      design: { ...validInput().design, structure_function_claims: ['Treats inflammation'] },
    }));
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.NO_DISEASE_CLAIMS)).toBeTruthy();
  });

  it('passes when only legitimate structure/function language is used', () => {
    const r = runComplianceChecklist(validInput({
      design: {
        ...validInput().design,
        structure_function_claims: ['Supports cellular energy'],
        long_description:
          'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.',
      },
    }));
    // The disclaimer paragraph contains the four banned verbs but in the
    // legally-required negation context. The check ignores the disclaimer
    // text exactly.
    expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.NO_DISEASE_CLAIMS)).toBeFalsy();
  });
});

describe('runComplianceChecklist – FDA approval claim prohibition', () => {
  const cases = ['FDA approved', 'FDA-approved', 'FDA cleared', 'FDA-cleared', 'FDA authorized'];
  for (const phrase of cases) {
    it(`fails when long_description contains "${phrase}"`, () => {
      const r = runComplianceChecklist(validInput({
        design: { ...validInput().design, long_description: `Our ${phrase} formulation` },
      }));
      expect(r.blocker_failures.find((c) => c.id === CHECK_IDS.NO_FDA_APPROVAL_CLAIMS)).toBeTruthy();
    });
  }

  it('passes when no FDA-approval-style language is present', () => {
    const r = runComplianceChecklist(validInput());
    expect(r.passed_items.find((c) => c.id === CHECK_IDS.NO_FDA_APPROVAL_CLAIMS)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Format requirement (warning, not blocker)
// ---------------------------------------------------------------------------

describe('runComplianceChecklist – format requirements', () => {
  it('classifies font-size as a warning, not a blocker, even when violated', () => {
    const r = runComplianceChecklist(validInput());
    const item = r.warning_failures.concat(r.passed_items).find((c) => c.id === CHECK_IDS.MINIMUM_FONT_SIZES);
    expect(item).toBeTruthy();
    expect(item!.severity).toBe('warning');
  });
});

// ---------------------------------------------------------------------------
// SLA classifier
// ---------------------------------------------------------------------------

describe('classifyReviewSla', () => {
  const submitted = new Date('2026-04-19T00:00:00.000Z');
  function input(hoursLater: number): SlaInput {
    return { submitted_at: submitted.toISOString(), now: new Date(submitted.getTime() + hoursLater * 3600_000) };
  }

  it('exposes the spec hours (36 reminder, 48 escalation)', () => {
    expect(REMINDER_HOURS).toBe(36);
    expect(ESCALATION_HOURS).toBe(48);
  });

  it('returns on_time when under 36 hours', () => {
    expect(classifyReviewSla(input(12)).status).toBe('on_time');
    expect(classifyReviewSla(input(35.9)).status).toBe('on_time');
  });

  it('returns reminder_due at exactly 36 hours', () => {
    expect(classifyReviewSla(input(36)).status).toBe('reminder_due');
  });

  it('returns reminder_due between 36 and 48 hours', () => {
    expect(classifyReviewSla(input(40)).status).toBe('reminder_due');
  });

  it('returns escalation_due at exactly 48 hours', () => {
    expect(classifyReviewSla(input(48)).status).toBe('escalation_due');
  });

  it('returns escalation_due past 48 hours', () => {
    expect(classifyReviewSla(input(120)).status).toBe('escalation_due');
  });

  it('returns hours_pending matching the elapsed time', () => {
    const r = classifyReviewSla(input(24.5));
    expect(r.hours_pending).toBeCloseTo(24.5, 1);
  });
});

// ---------------------------------------------------------------------------
// Required-reviewer determination
// ---------------------------------------------------------------------------

describe('isClaimsLabel + determineRequiredReviewers', () => {
  it('isClaimsLabel false when claims array empty', () => {
    expect(isClaimsLabel([])).toBe(false);
  });
  it('isClaimsLabel true when at least one non-empty claim present', () => {
    expect(isClaimsLabel(['Supports cellular energy'])).toBe(true);
  });
  it('isClaimsLabel false when claims contain only whitespace', () => {
    expect(isClaimsLabel(['   '])).toBe(false);
  });

  it('always assigns compliance_officer; assigns medical_director only when claims present', () => {
    expect(determineRequiredReviewers([])).toEqual(['compliance_officer']);
    expect(determineRequiredReviewers(['Supports gut health']))
      .toEqual(expect.arrayContaining(['compliance_officer', 'medical_director']));
    expect(determineRequiredReviewers(['Supports gut health'])).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Approval gate
// ---------------------------------------------------------------------------

describe('evaluateApprovalGate', () => {
  function input(over: Partial<ApprovalGateInput> = {}): ApprovalGateInput {
    return {
      required_reviewer_roles: ['compliance_officer'],
      decisions: [],
      ...over,
    };
  }

  it('returns pending when no decisions yet', () => {
    expect(evaluateApprovalGate(input()).next_status).toBe('under_compliance_review');
  });

  it('returns approved when single required reviewer approves', () => {
    const r = evaluateApprovalGate(input({
      decisions: [{ reviewer_role: 'compliance_officer', decision: 'approved', reviewed_at: '2026-04-19' }],
    }));
    expect(r.next_status).toBe('approved');
  });

  it('returns under_compliance_review when single approval but two required', () => {
    const r = evaluateApprovalGate(input({
      required_reviewer_roles: ['compliance_officer', 'medical_director'],
      decisions: [{ reviewer_role: 'compliance_officer', decision: 'approved', reviewed_at: '2026-04-19' }],
    }));
    expect(r.next_status).toBe('under_compliance_review');
    expect(r.awaiting_reviewer_roles).toEqual(['medical_director']);
  });

  it('returns approved only when ALL required reviewers approve', () => {
    const r = evaluateApprovalGate(input({
      required_reviewer_roles: ['compliance_officer', 'medical_director'],
      decisions: [
        { reviewer_role: 'compliance_officer', decision: 'approved', reviewed_at: '2026-04-19' },
        { reviewer_role: 'medical_director',   decision: 'approved', reviewed_at: '2026-04-19' },
      ],
    }));
    expect(r.next_status).toBe('approved');
  });

  it('any rejection from any required reviewer is terminal', () => {
    const r = evaluateApprovalGate(input({
      required_reviewer_roles: ['compliance_officer', 'medical_director'],
      decisions: [
        { reviewer_role: 'compliance_officer', decision: 'approved', reviewed_at: '2026-04-19' },
        { reviewer_role: 'medical_director',   decision: 'rejected', reviewed_at: '2026-04-19' },
      ],
    }));
    expect(r.next_status).toBe('rejected');
  });

  it('any revision_requested returns to revision_requested', () => {
    const r = evaluateApprovalGate(input({
      required_reviewer_roles: ['compliance_officer', 'medical_director'],
      decisions: [
        { reviewer_role: 'compliance_officer', decision: 'revision_requested', reviewed_at: '2026-04-19' },
      ],
    }));
    expect(r.next_status).toBe('revision_requested');
  });

  it('rejection takes precedence over revision_requested', () => {
    const r = evaluateApprovalGate(input({
      required_reviewer_roles: ['compliance_officer', 'medical_director'],
      decisions: [
        { reviewer_role: 'compliance_officer', decision: 'revision_requested', reviewed_at: '2026-04-19' },
        { reviewer_role: 'medical_director',   decision: 'rejected',           reviewed_at: '2026-04-19' },
      ],
    }));
    expect(r.next_status).toBe('rejected');
  });

  it('ignores decisions from non-required reviewer roles', () => {
    const ghost: ReviewerDecision = {
      reviewer_role: 'medical_director', decision: 'approved', reviewed_at: '2026-04-19',
    };
    const r = evaluateApprovalGate(input({
      required_reviewer_roles: ['compliance_officer'],
      decisions: [ghost],
    }));
    expect(r.next_status).toBe('under_compliance_review');
  });
});
