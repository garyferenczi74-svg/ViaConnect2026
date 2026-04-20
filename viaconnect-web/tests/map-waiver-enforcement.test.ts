// Prompt #101 Workstream B — suppression logic tests.

import { describe, it, expect } from 'vitest';
import {
  resolveObservationSeverity,
  type ActiveVIPSummary,
  type ActiveWaiverSummary,
  type ObservationInput,
} from '@/lib/map/waivers/enforcement';

function obs(partial: Partial<ObservationInput>): ObservationInput {
  return {
    productId: 'prod-1',
    observedPriceCents: 8000,
    observedAt: '2026-05-15T12:00:00Z',
    sourceUrl: 'https://example.com/shop',
    mapPriceCents: 10000,
    ingredientCostFloorCents: 4000,
    ...partial,
  };
}

const waiver: ActiveWaiverSummary = {
  waiverId: 'w-1',
  productId: 'prod-1',
  waivedPriceCents: 7500,
  scopeUrls: ['https://example.com/shop'],
  waiverStartAt: '2026-05-01T00:00:00Z',
  waiverEndAt: '2026-05-31T00:00:00Z',
};

describe('resolveObservationSeverity — flash sale', () => {
  it('suppresses during active flash-sale window', () => {
    const r = resolveObservationSeverity(
      obs({
        observedPriceCents: 5000,
        isFlashSale: true,
        flashSaleEndsAt: '2026-05-15T18:00:00Z',
      }),
      [],
      [],
    );
    expect(r.suppressedBy).toBe('flash_sale');
    expect(r.severity).toBeNull();
  });

  it('does not suppress after flash-sale window ends', () => {
    const r = resolveObservationSeverity(
      obs({
        observedPriceCents: 5000,
        isFlashSale: true,
        flashSaleEndsAt: '2026-05-15T10:00:00Z',
      }),
      [],
      [],
    );
    expect(r.suppressedBy).toBeNull();
    expect(['red','black']).toContain(r.severity);
  });
});

describe('resolveObservationSeverity — absolute margin floor', () => {
  it('always returns black when below absolute floor, even with waiver', () => {
    const r = resolveObservationSeverity(
      obs({ observedPriceCents: 5000, ingredientCostFloorCents: 4000 }),  // 5000 < 4000*1.72=6880
      [waiver],
      [],
    );
    expect(r.severity).toBe('black');
    expect(r.suppressedBy).toBeNull();
  });
});

describe('resolveObservationSeverity — waiver suppression', () => {
  it('suppresses when observed >= waived price AND scope matches', () => {
    const r = resolveObservationSeverity(
      obs({ observedPriceCents: 7500, sourceUrl: 'https://example.com/shop/widget' }),
      [waiver],
      [],
    );
    expect(r.suppressedBy).toBe('waiver');
    expect(r.severity).toBeNull();
  });

  it('does not suppress when observed < waived price', () => {
    const r = resolveObservationSeverity(
      obs({ observedPriceCents: 7000, sourceUrl: 'https://example.com/shop' }),
      [waiver],
      [],
    );
    expect(r.suppressedBy).toBeNull();
  });

  it('does not suppress when scope mismatches', () => {
    const r = resolveObservationSeverity(
      obs({ observedPriceCents: 8500, sourceUrl: 'https://other.com/' }),
      [waiver],
      [],
    );
    expect(r.suppressedBy).toBeNull();
  });
});

describe('resolveObservationSeverity — VIP public vs customer-URL', () => {
  const vip: ActiveVIPSummary = {
    vipExemptionId: 'v-1',
    productId: 'prod-1',
    exemptionStartAt: '2026-05-01T00:00:00Z',
    exemptionEndAt: '2026-08-01T00:00:00Z',
  };

  it('suppresses when URL is customer-specific', () => {
    const r = resolveObservationSeverity(
      obs({
        observedPriceCents: 7000,
        sourceUrl: 'https://clinic.com/customer/abc-123/checkout',
      }),
      [],
      [vip],
    );
    expect(r.suppressedBy).toBe('vip_customer_url');
  });

  it('does NOT suppress public commerce surface (Amazon)', () => {
    const r = resolveObservationSeverity(
      obs({
        observedPriceCents: 7000,
        sourceUrl: 'https://amazon.com/dp/B0C123ABCD',
      }),
      [],
      [vip],
    );
    expect(r.suppressedBy).toBeNull();
    expect(r.severity).not.toBeNull();
  });

  it('customer URL suppression scoped to product', () => {
    const differentProductVip = { ...vip, productId: 'prod-OTHER' };
    const r = resolveObservationSeverity(
      obs({
        observedPriceCents: 7000,
        sourceUrl: 'https://clinic.com/patient/xyz',
      }),
      [],
      [differentProductVip],
    );
    expect(r.suppressedBy).toBeNull();
  });
});

describe('resolveObservationSeverity — no waiver or VIP', () => {
  it('classifies 10% below MAP as orange', () => {
    // MAP 10000, observed 9000, floor 4000 → 10% below = orange
    const r = resolveObservationSeverity(obs({ observedPriceCents: 9000 }), [], []);
    expect(r.severity).toBe('orange');
    expect(r.suppressedBy).toBeNull();
  });

  it('classifies at-boundary 5% discount as yellow', () => {
    const r = resolveObservationSeverity(obs({ observedPriceCents: 9500 }), [], []);
    expect(r.severity).toBe('yellow');
    expect(r.suppressedBy).toBeNull();
  });
});
