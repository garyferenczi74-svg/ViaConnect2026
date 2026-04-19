// Prompt #96 Phase 3: Branding + naming + financial-model tests.

import { describe, it, expect } from 'vitest';
import {
  validateBrandConfiguration,
  resolveProductName,
  detectStructureFunctionClaims,
  detectDiseaseClaims,
  type BrandConfigInput,
} from '@/lib/white-label/branding';
import {
  modelProductionRun,
  type ModelLineItem,
} from '@/lib/white-label/financial-model';

const validBrand: BrandConfigInput = {
  brand_name: 'Dr. Smith Wellness',
  primary_color_hex: '#1a3b6e',
  secondary_color_hex: '#c69447',
  accent_color_hex: null,
  background_color_hex: '#FFFFFF',
  text_color_hex: '#000000',
  practice_legal_name: 'Smith Wellness LLC',
  practice_address_line_1: '123 Main St',
  practice_city: 'Buffalo',
  practice_state: 'NY',
  practice_postal_code: '14203',
  practice_phone: '+1-716-555-0100',
  practice_email: 'hello@smithwellness.example',
  product_naming_scheme: 'viacura_name',
  practice_prefix: null,
};

describe('validateBrandConfiguration', () => {
  it('accepts a complete, valid brand', () => {
    const r = validateBrandConfiguration(validBrand);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects when brand_name is empty', () => {
    const r = validateBrandConfiguration({ ...validBrand, brand_name: '' });
    expect(r.ok).toBe(false);
    expect(r.errors.find((e) => e.field === 'brand_name')).toBeTruthy();
  });

  it('rejects when primary_color_hex is invalid', () => {
    const r = validateBrandConfiguration({ ...validBrand, primary_color_hex: '#fff' });
    expect(r.ok).toBe(false);
    expect(r.errors.find((e) => e.field === 'primary_color_hex')).toBeTruthy();
  });

  it('rejects when practice contact fields are missing', () => {
    const r = validateBrandConfiguration({
      ...validBrand,
      practice_legal_name: '',
      practice_address_line_1: '',
      practice_phone: '',
      practice_email: '',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('rejects practice_prefix_plus_viacura when prefix is missing', () => {
    const r = validateBrandConfiguration({
      ...validBrand,
      product_naming_scheme: 'practice_prefix_plus_viacura',
      practice_prefix: null,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.find((e) => e.field === 'practice_prefix')).toBeTruthy();
  });

  it('rejects malformed email', () => {
    const r = validateBrandConfiguration({ ...validBrand, practice_email: 'not-an-email' });
    expect(r.ok).toBe(false);
    expect(r.errors.find((e) => e.field === 'practice_email')).toBeTruthy();
  });
});

describe('resolveProductName', () => {
  const baseProduct = { name: 'NAD+', sku: 'sup_nadplus' };

  it('returns the ViaCura name when scheme is viacura_name', () => {
    expect(
      resolveProductName({
        scheme: 'viacura_name', practicePrefix: null, customName: null, product: baseProduct,
      }),
    ).toBe('NAD+');
  });

  it('prefixes with practice prefix when scheme is practice_prefix_plus_viacura', () => {
    expect(
      resolveProductName({
        scheme: 'practice_prefix_plus_viacura', practicePrefix: 'Dr. Smith', customName: null, product: baseProduct,
      }),
    ).toBe('Dr. Smith NAD+');
  });

  it('returns the custom name when scheme is fully_custom and custom name provided', () => {
    expect(
      resolveProductName({
        scheme: 'fully_custom', practicePrefix: null, customName: 'Cellular Vitality', product: baseProduct,
      }),
    ).toBe('Cellular Vitality');
  });

  it('falls back to ViaCura name when fully_custom but no custom name set', () => {
    expect(
      resolveProductName({
        scheme: 'fully_custom', practicePrefix: null, customName: null, product: baseProduct,
      }),
    ).toBe('NAD+');
  });
});

describe('detectStructureFunctionClaims', () => {
  it('detects "supports" + body function as a claim', () => {
    expect(detectStructureFunctionClaims('Supports cardiovascular health')).toBe(true);
  });

  it('detects "promotes" + body function as a claim', () => {
    expect(detectStructureFunctionClaims('Promotes cellular energy')).toBe(true);
  });

  it('detects "maintains" as a claim verb', () => {
    expect(detectStructureFunctionClaims('Maintains healthy blood sugar')).toBe(true);
  });

  it('returns false for plain marketing copy without claim verbs', () => {
    expect(detectStructureFunctionClaims('Premium quality NAD+ supplement')).toBe(false);
  });

  it('handles empty input', () => {
    expect(detectStructureFunctionClaims('')).toBe(false);
    expect(detectStructureFunctionClaims(null)).toBe(false);
  });
});

describe('detectDiseaseClaims', () => {
  it('detects cure', () => {
    expect(detectDiseaseClaims('Cures arthritis')).toBe(true);
  });
  it('detects treat', () => {
    expect(detectDiseaseClaims('Treats inflammation')).toBe(true);
  });
  it('detects prevent (when paired with disease)', () => {
    expect(detectDiseaseClaims('Helps prevent diabetes')).toBe(true);
  });
  it('detects diagnose', () => {
    expect(detectDiseaseClaims('Diagnoses leaky gut')).toBe(true);
  });
  it('returns false for legitimate structure/function language', () => {
    expect(detectDiseaseClaims('Supports normal joint function')).toBe(false);
  });
});

describe('modelProductionRun', () => {
  function items(perSku: number, count: number, msrp = 5000): ModelLineItem[] {
    return Array.from({ length: count }, (_, i) => ({
      labelDesignId: `label_${i}`,
      productCatalogId: `prod_${i}`,
      quantity: perSku,
      baseMsrpCents: msrp,
      projectedRetailPriceCents: Math.round(msrp * 1.5),
    }));
  }

  it('applies tier_100_499 (60%) for 100 units total', () => {
    const r = modelProductionRun({ items: items(100, 1), timeline: 'standard' });
    expect(r.applied_discount_tier).toBe('tier_100_499');
    expect(r.applied_discount_percent).toBe(60);
    // unit cost = 5000 * 0.4 = 2000; line subtotal = 200000
    expect(r.line_items[0].unit_cost_cents).toBe(2000);
    expect(r.line_items[0].line_subtotal_cents).toBe(200_000);
    expect(r.subtotal_cents).toBe(200_000);
  });

  it('applies tier_500_999 (65%) when totals reach 500', () => {
    const r = modelProductionRun({ items: items(500, 1), timeline: 'standard' });
    expect(r.applied_discount_tier).toBe('tier_500_999');
    expect(r.applied_discount_percent).toBe(65);
  });

  it('applies tier_1000_plus (70%) at 1000 units', () => {
    const r = modelProductionRun({ items: items(1000, 1), timeline: 'standard' });
    expect(r.applied_discount_tier).toBe('tier_1000_plus');
    expect(r.applied_discount_percent).toBe(70);
  });

  it('aggregates across SKUs to determine tier', () => {
    // 3 SKUs at 200 each = 600 total → tier_500_999
    const r = modelProductionRun({ items: items(200, 3), timeline: 'standard' });
    expect(r.total_units).toBe(600);
    expect(r.applied_discount_tier).toBe('tier_500_999');
  });

  it('adds the 15% expedited surcharge when timeline=expedited', () => {
    const r = modelProductionRun({ items: items(100, 1, 10000), timeline: 'expedited' });
    // subtotal = 100 * 4000 = 400000; surcharge = 60000; total = 460000
    expect(r.subtotal_cents).toBe(400_000);
    expect(r.expedited_surcharge_cents).toBe(60_000);
    expect(r.total_cents).toBe(460_000);
  });

  it('splits deposit + final at 50/50', () => {
    const r = modelProductionRun({ items: items(100, 1, 10000), timeline: 'standard' });
    expect(r.deposit_cents + r.final_payment_cents).toBe(r.total_cents);
    expect(r.deposit_cents).toBe(Math.round(r.total_cents * 0.5));
  });

  it('flags meets_minimum_order_value=false when total below $15K', () => {
    const r = modelProductionRun({ items: items(100, 1, 5000), timeline: 'standard' });
    expect(r.meets_minimum_order_value).toBe(false);
  });

  it('flags meets_minimum_order_value=true when total at or above $15K', () => {
    // 1000 units at MSRP $80 → tier_1000_plus 70% off → $24/unit → $24,000 subtotal
    const r = modelProductionRun({ items: items(1000, 1, 8000), timeline: 'standard' });
    expect(r.subtotal_cents).toBeGreaterThanOrEqual(1_500_000);
    expect(r.meets_minimum_order_value).toBe(true);
  });

  it('returns per-line projected gross margin when retail prices supplied', () => {
    const r = modelProductionRun({ items: items(100, 1, 5000), timeline: 'standard' });
    // unit cost = 2000, retail = 7500 → margin 5500/unit
    expect(r.line_items[0].projected_unit_margin_cents).toBe(5500);
    // 100 units → projected revenue 750000, projected margin 550000
    expect(r.line_items[0].projected_line_revenue_cents).toBe(750_000);
    expect(r.line_items[0].projected_line_margin_cents).toBe(550_000);
  });

  it('returns null margins when retail prices are absent', () => {
    const noRetail: ModelLineItem[] = [{
      labelDesignId: 'L', productCatalogId: 'P', quantity: 100,
      baseMsrpCents: 5000, projectedRetailPriceCents: null,
    }];
    const r = modelProductionRun({ items: noRetail, timeline: 'standard' });
    expect(r.line_items[0].projected_unit_margin_cents).toBeNull();
    expect(r.projected_total_margin_cents).toBeNull();
  });

  it('rejects when any line below the 100-unit MOQ', () => {
    expect(() =>
      modelProductionRun({ items: items(50, 1), timeline: 'standard' }),
    ).toThrow(/below.*MOQ/i);
  });
});
