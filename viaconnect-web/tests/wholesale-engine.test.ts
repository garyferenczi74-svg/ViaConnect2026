// Phase 3: Wholesale pricing engine + MOQ + unified price display.
// Pure-function tests only. No DB.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  calculateWholesalePrice,
  validateWholesaleMOQ,
  MIN_WHOLESALE_ORDER_CENTS,
  type WholesalePricingContext,
} from '@/lib/pricing/wholesale-engine';
import { getUnifiedPricing } from '@/lib/pricing/unified-price-display';

const activePractitioner: WholesalePricingContext = {
  practitionerId: 'p-1',
  subscriptionTierId: 'standard',
  wholesaleDiscountPercent: 50,
  isActivePractitioner: true,
  hasRequiredCertification: true,
};

const inactivePractitioner: WholesalePricingContext = {
  ...activePractitioner,
  isActivePractitioner: false,
};

const uncertifiedPractitioner: WholesalePricingContext = {
  ...activePractitioner,
  hasRequiredCertification: false,
};

describe('calculateWholesalePrice', () => {
  it('applies 50% off MSRP for active certified practitioners', () => {
    const r = calculateWholesalePrice(10000, activePractitioner);
    expect(r.originalMsrpCents).toBe(10000);
    expect(r.wholesaleCents).toBe(5000);
    expect(r.savingsCents).toBe(5000);
    expect(r.discountPercent).toBe(50);
  });

  it('returns MSRP unchanged when practitioner is inactive', () => {
    const r = calculateWholesalePrice(10000, inactivePractitioner);
    expect(r.wholesaleCents).toBe(10000);
    expect(r.savingsCents).toBe(0);
    expect(r.discountPercent).toBe(0);
  });

  it('returns MSRP unchanged when Foundation certification is missing', () => {
    const r = calculateWholesalePrice(10000, uncertifiedPractitioner);
    expect(r.wholesaleCents).toBe(10000);
    expect(r.savingsCents).toBe(0);
  });

  it('rounds savings to the nearest cent', () => {
    const r = calculateWholesalePrice(99, activePractitioner); // 50% of 99 = 49.5
    expect(r.savingsCents).toBe(50);
    expect(r.wholesaleCents).toBe(49);
  });

  it('handles zero MSRP without dividing by zero', () => {
    const r = calculateWholesalePrice(0, activePractitioner);
    expect(r.originalMsrpCents).toBe(0);
    expect(r.wholesaleCents).toBe(0);
    expect(r.savingsCents).toBe(0);
  });
});

describe('validateWholesaleMOQ', () => {
  it('exposes the documented $500 minimum', () => {
    expect(MIN_WHOLESALE_ORDER_CENTS).toBe(50000);
  });

  it('passes a $500 cart exactly', () => {
    const r = validateWholesaleMOQ(50000);
    expect(r.meetsMoq).toBe(true);
    expect(r.shortfallCents).toBe(0);
    expect(r.minimumCents).toBe(50000);
  });

  it('passes anything above the minimum', () => {
    const r = validateWholesaleMOQ(99999);
    expect(r.meetsMoq).toBe(true);
    expect(r.shortfallCents).toBe(0);
  });

  it('returns shortfall when cart is short', () => {
    const r = validateWholesaleMOQ(48000);
    expect(r.meetsMoq).toBe(false);
    expect(r.shortfallCents).toBe(2000);
  });

  it('returns full minimum as shortfall on empty cart', () => {
    const r = validateWholesaleMOQ(0);
    expect(r.meetsMoq).toBe(false);
    expect(r.shortfallCents).toBe(50000);
  });
});

describe('getUnifiedPricing', () => {
  it('routes to practitioner_wholesale when practitioner is active', () => {
    const r = getUnifiedPricing(10000, null, activePractitioner);
    expect(r.displayContext).toBe('practitioner_wholesale');
    expect(r.wholesalePricing?.wholesaleCents).toBe(5000);
    expect(r.consumerPricing).toBeUndefined();
  });

  it('falls through to consumer pricing when practitioner is inactive', () => {
    const r = getUnifiedPricing(10000, null, inactivePractitioner);
    expect(r.displayContext).toBe('consumer');
    expect(r.wholesalePricing).toBeUndefined();
  });

  it('shows MSRP-only consumer pricing when no user context', () => {
    const r = getUnifiedPricing(10000, null, null);
    expect(r.displayContext).toBe('consumer');
    expect(r.consumerPricing?.subscriberPriceCents).toBe(10000);
    expect(r.consumerPricing?.annualPrepayPriceCents).toBe(10000);
    expect(r.consumerPricing?.discountPercent).toBe(0);
  });

  it('does not lose msrpCents in any branch', () => {
    expect(getUnifiedPricing(10000, null, activePractitioner).msrpCents).toBe(10000);
    expect(getUnifiedPricing(10000, null, inactivePractitioner).msrpCents).toBe(10000);
    expect(getUnifiedPricing(10000, null, null).msrpCents).toBe(10000);
  });
});

describe('Phase 3 migration shape', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('shop_orders extension is append-only ALTER ADD COLUMN IF NOT EXISTS', () => {
    const sql = readFileSync(
      path.join(repoRoot, 'supabase/migrations/20260418000130_shop_orders_practitioner_extension.sql'),
      'utf8',
    );
    expect(sql).not.toMatch(/DROP COLUMN/i);
    expect(sql).not.toMatch(/RENAME COLUMN/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS order_type/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS placed_by_practitioner_id/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS drop_ship_patient_user_id/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS practitioner_note/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS wholesale_total_cents/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS meets_moq/);
  });
});
