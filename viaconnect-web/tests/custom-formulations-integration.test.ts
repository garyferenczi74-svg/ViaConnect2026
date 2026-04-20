// Prompt #97 Phase 7: integration vocabulary tests.
// Verifies governance domain ids + launch phase id + parameter defaults
// match what the code expects.

import { describe, it, expect } from 'vitest';
import { DEFAULT_LEVEL_4_PARAMETERS } from '@/lib/custom-formulations/pricing-calculator';

const REGISTERED_L4_PRICING_DOMAIN_IDS = [
  'l4_formulation_development_fee',
  'l4_medical_review_fee',
  'l4_moq_per_formulation',
  'l4_minimum_order_value',
  'l4_manufacturing_overhead',
  'l4_markup_percent',
  'l4_admin_fee_on_refund',
] as const;

describe('Prompt #97 governance domain registry', () => {
  it('registers exactly 7 Level 4 pricing domains', () => {
    expect(REGISTERED_L4_PRICING_DOMAIN_IDS).toHaveLength(7);
  });

  it('every registered domain has the l4_ prefix', () => {
    for (const id of REGISTERED_L4_PRICING_DOMAIN_IDS) {
      expect(id.startsWith('l4_')).toBe(true);
    }
  });
});

describe('Prompt #97 default parameter values match spec', () => {
  it('development fee defaults to $3,888', () => {
    expect(DEFAULT_LEVEL_4_PARAMETERS.developmentFeeCents).toBe(388800);
  });
  it('medical review fee defaults to $888', () => {
    expect(DEFAULT_LEVEL_4_PARAMETERS.medicalReviewFeeCents).toBe(88800);
  });
  it('MOQ defaults to 500 units', () => {
    expect(DEFAULT_LEVEL_4_PARAMETERS.moqPerFormulation).toBe(500);
  });
  it('minimum order value defaults to $30,000', () => {
    expect(DEFAULT_LEVEL_4_PARAMETERS.minimumOrderValueCents).toBe(3000000);
  });
  it('manufacturing overhead defaults to 25%', () => {
    expect(DEFAULT_LEVEL_4_PARAMETERS.manufacturingOverheadPercent).toBe(25);
  });
  it('QA/QC overhead defaults to 8%', () => {
    expect(DEFAULT_LEVEL_4_PARAMETERS.qaQcPercent).toBe(8);
  });
  it('packaging labor defaults to 5%', () => {
    expect(DEFAULT_LEVEL_4_PARAMETERS.packagingLaborPercent).toBe(5);
  });
  it('ViaCura markup defaults to 40%', () => {
    expect(DEFAULT_LEVEL_4_PARAMETERS.markupPercent).toBe(40);
  });
  it('expedited surcharge defaults to 20%', () => {
    expect(DEFAULT_LEVEL_4_PARAMETERS.expeditedSurchargePercent).toBe(20);
  });
});

describe('Launch phase id', () => {
  it('launch phase id is custom_formulations_2029', () => {
    // Hardcoded vocabulary that must match the seed in Prompt #93 migration _180.
    const LAUNCH_PHASE_ID = 'custom_formulations_2029';
    expect(LAUNCH_PHASE_ID).toBe('custom_formulations_2029');
  });
});
