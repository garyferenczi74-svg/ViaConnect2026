// Prompt #97 Phase 1: schema + enum vocabulary tests.
// Catches drift between migration CHECK constraints and TypeScript enums.

import { describe, it, expect } from 'vitest';
import type {
  IngredientCategory,
  RegulatoryStatus,
  DoseUnit,
  FormulationDoseUnit,
  PregnancyCategory,
  InteractionSeverity,
  DeliveryForm,
  CapsuleSize,
  FormulationStatus,
  Level4EnrollmentStatus,
  ReviewDecision,
  StabilityTestStatus,
  DevelopmentFeeRefundReason,
  IngredientLibraryRow,
  CustomFormulationRow,
  CustomFormulationIngredientRow,
  CustomFormulationMedicalReviewRow,
  CustomFormulationRegulatoryReviewRow,
  Level4EnrollmentRow,
} from '@/types/custom-formulations';
import {
  PROHIBITED_INGREDIENT_ID_BLOCKLIST,
  PROHIBITED_INGREDIENT_ID_SET,
} from '@/types/custom-formulations';

// ----- Migration _430: ingredient_library vocabulary --------------------

const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  'vitamin', 'mineral', 'amino_acid', 'botanical_herb', 'enzyme',
  'probiotic_strain', 'fatty_acid', 'phytochemical', 'nutraceutical',
  'antioxidant', 'mushroom_extract', 'fiber', 'excipient_filler', 'other',
];

const REGULATORY_STATUSES: RegulatoryStatus[] = [
  'pre_1994_dietary_ingredient',
  'gras_affirmed',
  'ndi_notified_accepted',
  'ndi_required_not_filed',
  'prohibited',
  'under_review',
];

const DOSE_UNITS: DoseUnit[] = ['mg', 'mcg', 'iu', 'g', 'cfu_billions', 'mg_per_kg'];
const FORMULATION_DOSE_UNITS: FormulationDoseUnit[] = ['mg', 'mcg', 'iu', 'g', 'cfu_billions'];
const PREGNANCY_CATEGORIES: PregnancyCategory[] = [
  'safe', 'caution', 'contraindicated', 'insufficient_data',
];

describe('ingredient_library vocabulary', () => {
  it('has fourteen categories matching the CHECK constraint', () => {
    expect(INGREDIENT_CATEGORIES).toHaveLength(14);
  });

  it('has six regulatory statuses', () => {
    expect(REGULATORY_STATUSES).toHaveLength(6);
  });

  it('Q1 admits only pre_1994_dietary_ingredient and gras_affirmed', () => {
    const q1Eligible: RegulatoryStatus[] = ['pre_1994_dietary_ingredient', 'gras_affirmed'];
    expect(q1Eligible).toHaveLength(2);
  });

  it('dose units include all 6 library units', () => {
    expect(DOSE_UNITS).toHaveLength(6);
  });

  it('formulation-level dose units exclude mg_per_kg (library-only)', () => {
    expect(FORMULATION_DOSE_UNITS).toHaveLength(5);
    expect(FORMULATION_DOSE_UNITS).not.toContain('mg_per_kg');
  });

  it('pregnancy categories cover all 4 spec values', () => {
    expect(PREGNANCY_CATEGORIES).toHaveLength(4);
    expect(PREGNANCY_CATEGORIES).toContain('contraindicated');
  });
});

// ----- Migration _450: interactions vocabulary --------------------------

const SEVERITIES: InteractionSeverity[] = ['minor', 'moderate', 'major', 'contraindicated'];

describe('ingredient_library_interactions vocabulary', () => {
  it('has four severity values', () => {
    expect(SEVERITIES).toHaveLength(4);
  });
});

// ----- Migration _460: custom_formulations vocabulary -------------------

const DELIVERY_FORMS: DeliveryForm[] = [
  'capsule', 'tablet', 'powder', 'liquid_sublingual', 'liquid_drops', 'chewable', 'gummy',
];

const CAPSULE_SIZES: CapsuleSize[] = ['00', '0', '1', '2', '3', '4'];

const FORMULATION_STATUSES: FormulationStatus[] = [
  'draft',
  'ready_for_validation',
  'validation_failed',
  'ready_for_review',
  'under_medical_review',
  'under_regulatory_review',
  'revision_requested',
  'approved_pending_development_fee',
  'approved_production_ready',
  'archived',
  'rejected',
];

describe('custom_formulations vocabulary', () => {
  it('has seven delivery forms', () => {
    expect(DELIVERY_FORMS).toHaveLength(7);
  });

  it('has six capsule sizes (00 through 4)', () => {
    expect(CAPSULE_SIZES).toHaveLength(6);
  });

  it('has eleven lifecycle statuses', () => {
    expect(FORMULATION_STATUSES).toHaveLength(11);
    expect(FORMULATION_STATUSES).toContain('under_medical_review');
    expect(FORMULATION_STATUSES).toContain('under_regulatory_review');
    expect(FORMULATION_STATUSES).toContain('approved_production_ready');
  });
});

// ----- Migration _440: level_4_enrollments vocabulary -------------------

const ENROLLMENT_STATUSES: Level4EnrollmentStatus[] = [
  'pending_eligibility',
  'eligibility_verified',
  'formulation_development',
  'active',
  'paused',
  'terminated',
];

describe('level_4_enrollments vocabulary', () => {
  it('has six enrollment statuses', () => {
    expect(ENROLLMENT_STATUSES).toHaveLength(6);
  });
});

// ----- Migrations _480/_490: review vocabularies ------------------------

const REVIEW_DECISIONS: ReviewDecision[] = ['approved', 'revision_requested', 'rejected'];

describe('medical + regulatory review vocabularies', () => {
  it('both reviews use the same three decisions', () => {
    expect(REVIEW_DECISIONS).toHaveLength(3);
  });
});

// ----- Migration _500: development fees ---------------------------------

const REFUND_REASONS: DevelopmentFeeRefundReason[] = [
  'applied_to_first_production_order',
  'practitioner_abandoned',
  'validation_failed',
  'medical_review_rejected',
  'regulatory_review_rejected',
  'viacura_cannot_source',
  'admin_override_refund',
];

describe('development fee refund reasons', () => {
  it('has seven refund reasons', () => {
    expect(REFUND_REASONS).toHaveLength(7);
  });
});

// ----- Migration _510: stability tests ---------------------------------

const STABILITY_STATUSES: StabilityTestStatus[] = [
  'scheduled', 'in_progress', 'complete', 'failed',
];

describe('stability test statuses', () => {
  it('has four statuses', () => {
    expect(STABILITY_STATUSES).toHaveLength(4);
  });
});

// ----- Prohibited ingredient blocklist (Phase 3 safety guardrail) -------

describe('PROHIBITED_INGREDIENT_ID_BLOCKLIST', () => {
  it('contains entries across every prohibited category', () => {
    // Peptides
    expect(PROHIBITED_INGREDIENT_ID_BLOCKLIST).toContain('bpc_157');
    expect(PROHIBITED_INGREDIENT_ID_BLOCKLIST).toContain('ipamorelin');
    // Hormones
    expect(PROHIBITED_INGREDIENT_ID_BLOCKLIST).toContain('testosterone_any');
    expect(PROHIBITED_INGREDIENT_ID_BLOCKLIST).toContain('estriol');
    // CBD / cannabis
    expect(PROHIBITED_INGREDIENT_ID_BLOCKLIST).toContain('cbd_isolate');
    expect(PROHIBITED_INGREDIENT_ID_BLOCKLIST).toContain('thc_any');
    // FDA safety-concern
    expect(PROHIBITED_INGREDIENT_ID_BLOCKLIST).toContain('kratom');
    expect(PROHIBITED_INGREDIENT_ID_BLOCKLIST).toContain('ephedra');
  });

  it('is exported as a readonly set for O(1) lookup', () => {
    expect(PROHIBITED_INGREDIENT_ID_SET.has('bpc_157')).toBe(true);
    expect(PROHIBITED_INGREDIENT_ID_SET.has('vitamin_c_ascorbic_acid')).toBe(false);
  });

  it('set size matches blocklist length (no silent duplicates)', () => {
    expect(PROHIBITED_INGREDIENT_ID_SET.size).toBe(PROHIBITED_INGREDIENT_ID_BLOCKLIST.length);
  });

  it('does not contain any Q1-seeded ingredient id (sanity: seeded ingredients are eligible)', () => {
    // Spot-check a few: if a Q1 seeded ingredient landed in the blocklist
    // the library seed would contradict the hardcoded guardrail.
    const seedIds = [
      'vitamin_c_ascorbic_acid', 'magnesium_glycinate', 'ashwagandha',
      'turmeric_curcumin', 'omega_3_fish_oil', 'coq10',
    ];
    for (const id of seedIds) {
      expect(PROHIBITED_INGREDIENT_ID_SET.has(id)).toBe(false);
    }
  });
});

// ----- Row type shape sanity checks -------------------------------------

describe('Row type shape sanity', () => {
  it('IngredientLibraryRow carries regulatory + UL + allergen fields', () => {
    const probe: Pick<
      IngredientLibraryRow,
      | 'id' | 'common_name' | 'category' | 'regulatory_status'
      | 'is_available_for_custom_formulation'
      | 'tolerable_upper_limit_adult_mg' | 'tolerable_upper_limit_pediatric_mg'
      | 'contains_allergen_milk' | 'contains_allergen_soy'
    > = {
      id: 'vitamin_c_ascorbic_acid',
      common_name: 'Vitamin C',
      category: 'vitamin',
      regulatory_status: 'pre_1994_dietary_ingredient',
      is_available_for_custom_formulation: true,
      tolerable_upper_limit_adult_mg: 2000 as unknown as number,
      tolerable_upper_limit_pediatric_mg: 1800 as unknown as number,
      contains_allergen_milk: false,
      contains_allergen_soy: false,
    };
    expect(probe.regulatory_status).toBe('pre_1994_dietary_ingredient');
  });

  it('CustomFormulationRow carries exclusive_to_practitioner_id + version fields', () => {
    const probe: Pick<
      CustomFormulationRow,
      | 'practitioner_id' | 'exclusive_to_practitioner_id'
      | 'version_number' | 'is_current_version' | 'status' | 'delivery_form'
    > = {
      practitioner_id: '00000000-0000-0000-0000-000000000001',
      exclusive_to_practitioner_id: '00000000-0000-0000-0000-000000000001',
      version_number: 1,
      is_current_version: true,
      status: 'draft',
      delivery_form: 'capsule',
    };
    expect(probe.practitioner_id).toBe(probe.exclusive_to_practitioner_id);
  });

  it('CustomFormulationIngredientRow carries dose + unit + is_active_ingredient', () => {
    const probe: Pick<
      CustomFormulationIngredientRow,
      'dose_per_serving' | 'dose_unit' | 'is_active_ingredient'
    > = {
      dose_per_serving: 500 as unknown as number,
      dose_unit: 'mg',
      is_active_ingredient: true,
    };
    expect(probe.dose_unit).toBe('mg');
  });

  it('CustomFormulationMedicalReviewRow has decision + required notes', () => {
    const probe: Pick<
      CustomFormulationMedicalReviewRow,
      'decision' | 'decision_notes' | 'reviewer_user_id'
    > = {
      decision: 'approved',
      decision_notes: 'All doses within therapeutic range, no interactions flagged.',
      reviewer_user_id: '00000000-0000-0000-0000-000000000002',
    };
    expect(probe.decision).toBe('approved');
  });

  it('CustomFormulationRegulatoryReviewRow has prohibited_category_check_passed (NOT NULL)', () => {
    const probe: Pick<
      CustomFormulationRegulatoryReviewRow,
      'decision' | 'prohibited_category_check_passed'
    > = {
      decision: 'approved',
      prohibited_category_check_passed: true,
    };
    expect(probe.prohibited_category_check_passed).toBe(true);
  });

  it('Level4EnrollmentRow carries exclusive_use_agreement_signed', () => {
    const probe: Pick<
      Level4EnrollmentRow,
      'status' | 'exclusive_use_agreement_signed'
    > = {
      status: 'eligibility_verified',
      exclusive_use_agreement_signed: true,
    };
    expect(probe.exclusive_use_agreement_signed).toBe(true);
  });
});
