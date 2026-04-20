// Prompt #103 Phase 1: Product category taxonomy tests.
//
// Pure-TypeScript coverage of the category + palette + identity-mark
// rules that the SQL triggers enforce at the DB level. The SQL truth
// lives in 20260422000040_extend_products.sql; this file tests the
// in-memory runtime helpers that mirror those rules for form
// validation and compliance checks.

import { describe, it, expect } from 'vitest';
import {
  CANONICAL_CATEGORY_COUNT,
  CATEGORY_SLUGS,
  CATEGORY_IDENTITY_MARK,
  CATEGORY_PALETTE_RULE,
  isValidHex,
  validateSkuPaletteAgainstCategory,
  identityMarkAllowedForCategory,
} from '@/lib/categories/types';
import {
  expectedTaglineForBrand,
  MASTER_TAGLINE,
  SNP_TAGLINE,
  SPROUTABLES_TAGLINE,
  isSproutablesBrand,
  isSnpSubLine,
} from '@/lib/brands/types';

describe('category catalog constants', () => {
  it('declares exactly seven canonical categories', () => {
    expect(CATEGORY_SLUGS.length).toBe(CANONICAL_CATEGORY_COUNT);
    expect(new Set(CATEGORY_SLUGS).size).toBe(CANONICAL_CATEGORY_COUNT);
  });

  it('includes every category the spec requires and no extras', () => {
    expect(new Set(CATEGORY_SLUGS)).toEqual(new Set([
      'base_formulas',
      'advanced_formulas',
      'womens_health',
      'childrens_methylated',
      'snp_support',
      'functional_mushrooms',
      'genex360_testing',
    ]));
  });
});

describe('identity mark <-> category association', () => {
  it('applies Methylated Formula badge only to Base + Childrens', () => {
    expect(CATEGORY_IDENTITY_MARK.base_formulas).toBe('methylated_formula');
    expect(CATEGORY_IDENTITY_MARK.childrens_methylated).toBe('methylated_formula');
    expect(CATEGORY_IDENTITY_MARK.advanced_formulas).not.toBe('methylated_formula');
    expect(CATEGORY_IDENTITY_MARK.womens_health).not.toBe('methylated_formula');
    expect(CATEGORY_IDENTITY_MARK.snp_support).not.toBe('methylated_formula');
    expect(CATEGORY_IDENTITY_MARK.functional_mushrooms).not.toBe('methylated_formula');
  });

  it('applies Dual Delivery to Advanced, Womens, SNP, Mushrooms', () => {
    expect(CATEGORY_IDENTITY_MARK.advanced_formulas).toBe('dual_delivery_technology');
    expect(CATEGORY_IDENTITY_MARK.womens_health).toBe('dual_delivery_technology');
    expect(CATEGORY_IDENTITY_MARK.snp_support).toBe('dual_delivery_technology');
    expect(CATEGORY_IDENTITY_MARK.functional_mushrooms).toBe('dual_delivery_technology');
  });

  it('exempts GeneX360 Testing from any identity mark', () => {
    expect(CATEGORY_IDENTITY_MARK.genex360_testing).toBe('none');
  });

  it('rejects a Dual Delivery mark on a Base Formulas product', () => {
    expect(identityMarkAllowedForCategory({
      category_slug: 'base_formulas',
      identity_mark_on_packaging: 'dual_delivery_technology',
    })).toBe(false);
  });

  it('accepts Methylated badge on a Base Formulas product', () => {
    expect(identityMarkAllowedForCategory({
      category_slug: 'base_formulas',
      identity_mark_on_packaging: 'methylated_formula',
    })).toBe(true);
  });

  it('rejects Methylated badge on an Advanced Formulas product', () => {
    expect(identityMarkAllowedForCategory({
      category_slug: 'advanced_formulas',
      identity_mark_on_packaging: 'methylated_formula',
    })).toBe(false);
  });

  it('accepts Dual Delivery on Womens Health product', () => {
    expect(identityMarkAllowedForCategory({
      category_slug: 'womens_health',
      identity_mark_on_packaging: 'dual_delivery_technology',
    })).toBe(true);
  });

  it('rejects any identity mark on GeneX360 Testing', () => {
    expect(identityMarkAllowedForCategory({
      category_slug: 'genex360_testing',
      identity_mark_on_packaging: 'methylated_formula',
    })).toBe(false);
    expect(identityMarkAllowedForCategory({
      category_slug: 'genex360_testing',
      identity_mark_on_packaging: 'dual_delivery_technology',
    })).toBe(false);
    expect(identityMarkAllowedForCategory({
      category_slug: 'genex360_testing',
      identity_mark_on_packaging: 'none',
    })).toBe(true);
  });
});

describe('palette rule <-> category association', () => {
  it('is single palette for Base, Womens, Childrens, SNP', () => {
    expect(CATEGORY_PALETTE_RULE.base_formulas).toBe('single_palette_category_wide');
    expect(CATEGORY_PALETTE_RULE.womens_health).toBe('single_palette_category_wide');
    expect(CATEGORY_PALETTE_RULE.childrens_methylated).toBe('single_palette_category_wide');
    expect(CATEGORY_PALETTE_RULE.snp_support).toBe('single_palette_category_wide');
  });

  it('is per-SKU for Advanced and Functional Mushrooms', () => {
    expect(CATEGORY_PALETTE_RULE.advanced_formulas).toBe('per_sku_palette');
    expect(CATEGORY_PALETTE_RULE.functional_mushrooms).toBe('per_sku_palette');
  });

  it('is not applicable for GeneX360 Testing', () => {
    expect(CATEGORY_PALETTE_RULE.genex360_testing).toBe('not_applicable');
  });
});

describe('SKU palette override validation', () => {
  const emptyOverrides = {
    sku_bottle_color_primary_hex: null,
    sku_typography_primary_hex: null,
    sku_typography_secondary_hex: null,
    sku_accent_color_hex: null,
    sku_dd_mark_primary_hex: null,
    sku_dd_mark_outline_hex: null,
  } as const;

  it('accepts a single-palette category with no SKU overrides', () => {
    const issues = validateSkuPaletteAgainstCategory({
      category_palette_rule: 'single_palette_category_wide',
      overrides: emptyOverrides,
    });
    expect(issues).toEqual([]);
  });

  it('rejects a single-palette category when any SKU override is set', () => {
    const issues = validateSkuPaletteAgainstCategory({
      category_palette_rule: 'single_palette_category_wide',
      overrides: { ...emptyOverrides, sku_bottle_color_primary_hex: '#C0C0C0' },
    });
    expect(issues.some((i) => i.code === 'single_palette_rejects_sku_override')).toBe(true);
  });

  it('rejects a per-SKU category when bottle + typography primary are missing', () => {
    const issues = validateSkuPaletteAgainstCategory({
      category_palette_rule: 'per_sku_palette',
      overrides: emptyOverrides,
    });
    expect(issues.some((i) => i.code === 'per_sku_palette_requires_bottle_and_typography')).toBe(true);
  });

  it('accepts a per-SKU category with bottle + typography primary', () => {
    const issues = validateSkuPaletteAgainstCategory({
      category_palette_rule: 'per_sku_palette',
      overrides: {
        ...emptyOverrides,
        sku_bottle_color_primary_hex: '#C0C0C0',
        sku_typography_primary_hex:   '#B75E18',
      },
    });
    expect(issues).toEqual([]);
  });

  it('rejects malformed hex values in override fields', () => {
    const issues = validateSkuPaletteAgainstCategory({
      category_palette_rule: 'per_sku_palette',
      overrides: {
        ...emptyOverrides,
        sku_bottle_color_primary_hex: '#C0C0C0',
        sku_typography_primary_hex:   'not-a-hex',
      },
    });
    expect(issues.some((i) => i.code === 'invalid_hex')).toBe(true);
  });
});

describe('hex validator', () => {
  it('accepts well-formed 6-digit hex', () => {
    expect(isValidHex('#000000')).toBe(true);
    expect(isValidHex('#FFFFFF')).toBe(true);
    expect(isValidHex('#aaBB12')).toBe(true);
  });
  it('rejects short, missing-hash, long, or non-hex strings', () => {
    expect(isValidHex('#FFF')).toBe(false);
    expect(isValidHex('000000')).toBe(false);
    expect(isValidHex('#GGGGGG')).toBe(false);
    expect(isValidHex('')).toBe(false);
    expect(isValidHex(null)).toBe(false);
  });
});

describe('brand tagline expectations', () => {
  it('master ViaCura uses Built For Your Biology', () => {
    expect(expectedTaglineForBrand({ brand_slug: 'viacura' })).toBe(MASTER_TAGLINE);
  });
  it('ViaCura SNP sub-line uses Your Genetics Your Protocol', () => {
    expect(expectedTaglineForBrand({ brand_slug: 'viacura-snp' })).toBe(SNP_TAGLINE);
  });
  it('Sproutables uses Peak Growth and Wellness', () => {
    expect(expectedTaglineForBrand({ brand_slug: 'sproutables' })).toBe(SPROUTABLES_TAGLINE);
  });
});

describe('brand identity helpers', () => {
  it('identifies Sproutables as sub-brand', () => {
    expect(isSproutablesBrand({ brand_slug: 'sproutables' })).toBe(true);
    expect(isSproutablesBrand({ brand_slug: 'viacura' })).toBe(false);
  });
  it('identifies SNP as a sub-line only when flag is true', () => {
    expect(isSnpSubLine({ brand_slug: 'viacura-snp', is_sub_line: true })).toBe(true);
    expect(isSnpSubLine({ brand_slug: 'viacura-snp', is_sub_line: false })).toBe(false);
    expect(isSnpSubLine({ brand_slug: 'viacura', is_sub_line: false })).toBe(false);
  });
});
