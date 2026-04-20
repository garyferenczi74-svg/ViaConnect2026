// Prompt #103 Phase 2: MAP auto-enrollment gating tests.
//
// Asserts the decision the DB trigger makes for each
// (pricing_tier, category_slug) combination.

import { describe, it, expect } from 'vitest';
import { shouldAutoEnrollMap } from '@/lib/categories/map-gating';

describe('shouldAutoEnrollMap', () => {
  it('enrolls new L1 Base Formulas SKU', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L1', category_slug: 'base_formulas',
    })).toEqual({ enroll: true, tier: 'L1' });
  });

  it('enrolls new L2 Advanced Formulas SKU', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L2', category_slug: 'advanced_formulas',
    })).toEqual({ enroll: true, tier: 'L2' });
  });

  it('skips L3 white-label SKU', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L3', category_slug: 'advanced_formulas',
    })).toEqual({ enroll: false, reason: 'tier_exempt' });
  });

  it('skips L4 custom formulation SKU', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L4', category_slug: 'advanced_formulas',
    })).toEqual({ enroll: false, reason: 'tier_exempt' });
  });

  it('skips GeneX360 Testing SKU regardless of tier', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L1', category_slug: 'genex360_testing',
    })).toEqual({ enroll: false, reason: 'genex360_testing' });
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L2', category_slug: 'genex360_testing',
    })).toEqual({ enroll: false, reason: 'genex360_testing' });
  });

  it('skips SKU with no pricing_tier set', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: null, category_slug: 'base_formulas',
    })).toEqual({ enroll: false, reason: 'no_tier' });
  });

  it('skips SKU with no category set', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L1', category_slug: null,
    })).toEqual({ enroll: false, reason: 'no_category' });
  });

  it('enrolls SNP Support L1 SKU', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L1', category_slug: 'snp_support',
    })).toEqual({ enroll: true, tier: 'L1' });
  });

  it('enrolls Childrens Methylated L2 SKU (Sproutables sub-brand)', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L2', category_slug: 'childrens_methylated',
    })).toEqual({ enroll: true, tier: 'L2' });
  });

  it('enrolls Functional Mushrooms L1 SKU', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L1', category_slug: 'functional_mushrooms',
    })).toEqual({ enroll: true, tier: 'L1' });
  });

  it('enrolls Womens Health L1 SKU', () => {
    expect(shouldAutoEnrollMap({
      pricing_tier: 'L1', category_slug: 'womens_health',
    })).toEqual({ enroll: true, tier: 'L1' });
  });
});
