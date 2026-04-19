// Prompt #96 Phase 1: White-label schema-types pure helpers.

import { describe, it, expect } from 'vitest';
import {
  ENROLLMENT_STATUSES,
  QUALIFYING_PATHS,
  LABEL_DESIGN_STATUSES,
  PRODUCTION_ORDER_STATUSES,
  COMPLIANCE_REVIEW_DECISIONS,
  REVIEW_TYPES,
  REVIEWER_ROLES,
  LAYOUT_TEMPLATES,
  PRODUCT_NAMING_SCHEMES,
  STORAGE_LOCATIONS,
  INVENTORY_STATUSES,
  RECALL_CLASSES,
  RECALL_SCOPES,
  classifyDiscountTier,
  isValidHexColor,
  isManufacturerLineUnchanged,
  CANONICAL_MANUFACTURER_LINE,
  MOQ_PER_SKU,
  MIN_ORDER_VALUE_CENTS,
  EXPEDITED_SURCHARGE_PERCENT,
  STANDARD_PRODUCTION_WEEKS,
  EXPEDITED_PRODUCTION_WEEKS,
  FREE_STORAGE_DAYS,
  STORAGE_FEE_CENTS_PER_UNIT_DAY,
  type DiscountTierId,
} from '@/lib/white-label/schema-types';

describe('Status enums', () => {
  it('exposes the seven enrollment statuses from the spec', () => {
    expect(new Set(ENROLLMENT_STATUSES)).toEqual(new Set([
      'pending_eligibility', 'eligibility_verified', 'brand_setup',
      'first_production_order', 'active', 'paused', 'terminated',
    ]));
  });

  it('exposes the three qualifying paths', () => {
    expect(new Set(QUALIFYING_PATHS)).toEqual(new Set([
      'certification_level_3', 'white_label_tier_subscription', 'volume_threshold',
    ]));
  });

  it('exposes the seven label design statuses', () => {
    expect(new Set(LABEL_DESIGN_STATUSES)).toEqual(new Set([
      'draft', 'ready_for_review', 'under_compliance_review',
      'revision_requested', 'approved', 'production_ready', 'archived',
    ]));
  });

  it('exposes all eleven production order statuses', () => {
    expect(new Set(PRODUCTION_ORDER_STATUSES)).toEqual(new Set([
      'quote', 'labels_pending_review', 'labels_approved_pending_deposit',
      'deposit_paid', 'in_production', 'quality_control',
      'final_payment_pending', 'shipped', 'delivered', 'canceled',
    ]));
  });

  it('exposes the three compliance decisions', () => {
    expect(new Set(COMPLIANCE_REVIEW_DECISIONS)).toEqual(new Set([
      'approved', 'revision_requested', 'rejected',
    ]));
  });

  it('exposes the three review types', () => {
    expect(new Set(REVIEW_TYPES)).toEqual(new Set([
      'automated_checklist', 'compliance_review', 'medical_claims_review',
    ]));
  });

  it('exposes the three reviewer roles', () => {
    expect(new Set(REVIEWER_ROLES)).toEqual(new Set([
      'automated', 'compliance_officer', 'medical_director',
    ]));
  });

  it('exposes the four layout templates', () => {
    expect(new Set(LAYOUT_TEMPLATES)).toEqual(new Set([
      'classic_vertical', 'modern_horizontal', 'premium_wrap', 'clinical_minimal',
    ]));
  });

  it('exposes the three product naming schemes', () => {
    expect(new Set(PRODUCT_NAMING_SCHEMES)).toEqual(new Set([
      'viacura_name', 'practice_prefix_plus_viacura', 'fully_custom',
    ]));
  });

  it('exposes the two storage locations', () => {
    expect(new Set(STORAGE_LOCATIONS)).toEqual(new Set([
      'viacura_warehouse', 'practitioner_facility',
    ]));
  });

  it('exposes the four inventory statuses', () => {
    expect(new Set(INVENTORY_STATUSES)).toEqual(new Set([
      'active', 'depleted', 'expired', 'recalled',
    ]));
  });

  it('exposes the three FDA recall classes', () => {
    expect(new Set(RECALL_CLASSES)).toEqual(new Set([
      'class_i', 'class_ii', 'class_iii',
    ]));
  });

  it('exposes the four recall scopes', () => {
    expect(new Set(RECALL_SCOPES)).toEqual(new Set([
      'single_lot', 'all_lots_single_sku', 'multiple_skus_formulation', 'all_white_label',
    ]));
  });
});

describe('classifyDiscountTier', () => {
  it('returns tier_100_499 for 100', () => {
    expect(classifyDiscountTier(100)).toMatchObject<{ tier: DiscountTierId; percent: number }>({
      tier: 'tier_100_499', percent: 60,
    });
  });

  it('returns tier_100_499 for 499', () => {
    expect(classifyDiscountTier(499)).toMatchObject({ tier: 'tier_100_499', percent: 60 });
  });

  it('returns tier_500_999 for 500', () => {
    expect(classifyDiscountTier(500)).toMatchObject({ tier: 'tier_500_999', percent: 65 });
  });

  it('returns tier_500_999 for 999', () => {
    expect(classifyDiscountTier(999)).toMatchObject({ tier: 'tier_500_999', percent: 65 });
  });

  it('returns tier_1000_plus for 1000', () => {
    expect(classifyDiscountTier(1000)).toMatchObject({ tier: 'tier_1000_plus', percent: 70 });
  });

  it('returns tier_1000_plus for very large quantities', () => {
    expect(classifyDiscountTier(50_000)).toMatchObject({ tier: 'tier_1000_plus', percent: 70 });
  });

  it('returns null when below MOQ', () => {
    expect(classifyDiscountTier(99)).toBeNull();
    expect(classifyDiscountTier(0)).toBeNull();
  });
});

describe('isValidHexColor', () => {
  it('accepts standard 6-digit hex', () => {
    expect(isValidHexColor('#000000')).toBe(true);
    expect(isValidHexColor('#FFFFFF')).toBe(true);
    expect(isValidHexColor('#123abc')).toBe(true);
    expect(isValidHexColor('#aBcDeF')).toBe(true);
  });

  it('rejects strings without leading #', () => {
    expect(isValidHexColor('000000')).toBe(false);
    expect(isValidHexColor('FFFFFF')).toBe(false);
  });

  it('rejects 3-digit shorthand (matches the SQL CHECK constraint exactly)', () => {
    expect(isValidHexColor('#FFF')).toBe(false);
    expect(isValidHexColor('#000')).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(isValidHexColor('#GGGGGG')).toBe(false);
    expect(isValidHexColor('#12345Z')).toBe(false);
  });

  it('rejects empty + null-ish', () => {
    expect(isValidHexColor('')).toBe(false);
    expect(isValidHexColor('#')).toBe(false);
  });
});

describe('isManufacturerLineUnchanged', () => {
  it('accepts the canonical FDA-required string verbatim', () => {
    expect(isManufacturerLineUnchanged(CANONICAL_MANUFACTURER_LINE)).toBe(true);
  });

  it('rejects any modification', () => {
    expect(isManufacturerLineUnchanged('Manufactured by FarmCeutica Wellness LLC')).toBe(false);
    expect(isManufacturerLineUnchanged('manufactured by FarmCeutica Wellness LLC, Buffalo NY')).toBe(false);
    expect(isManufacturerLineUnchanged(CANONICAL_MANUFACTURER_LINE + ' ')).toBe(false);
    expect(isManufacturerLineUnchanged(' ' + CANONICAL_MANUFACTURER_LINE)).toBe(false);
  });

  it('rejects empty / null', () => {
    expect(isManufacturerLineUnchanged('')).toBe(false);
    expect(isManufacturerLineUnchanged(null)).toBe(false);
  });

  it('exposes the canonical string in the spec form', () => {
    expect(CANONICAL_MANUFACTURER_LINE).toBe('Manufactured by FarmCeutica Wellness LLC, Buffalo NY');
  });
});

describe('Constants stay in lockstep with the spec', () => {
  it('MOQ per SKU is 100', () => expect(MOQ_PER_SKU).toBe(100));
  it('Minimum order value is $15,000 (cents)', () => expect(MIN_ORDER_VALUE_CENTS).toBe(1_500_000));
  it('Expedited surcharge is 15%', () => expect(EXPEDITED_SURCHARGE_PERCENT).toBe(15));
  it('Standard production is 8 weeks', () => expect(STANDARD_PRODUCTION_WEEKS).toBe(8));
  it('Expedited production is 6 weeks', () => expect(EXPEDITED_PRODUCTION_WEEKS).toBe(6));
  it('Free storage window is 60 days', () => expect(FREE_STORAGE_DAYS).toBe(60));
  it('Storage fee is 2 cents per unit per day', () => expect(STORAGE_FEE_CENTS_PER_UNIT_DAY).toBe(2));
});
