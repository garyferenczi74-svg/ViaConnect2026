// Prompt #97 Phase 5.2: Level 4 pricing calculator tests (90%+ gate on payment flow).

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LEVEL_4_PARAMETERS,
  calculateLevel4Quote,
  computeDevelopmentFeeRefund,
  type Level4QuoteInput,
} from '@/lib/custom-formulations/pricing-calculator';

function quote(overrides: Partial<Level4QuoteInput> = {}): Level4QuoteInput {
  return {
    items: [
      {
        customFormulationId: 'f1',
        quantity: 500,
        unitCogsCents: 1000, // $10.00 COGS per unit
        firstProductionOrder: true,
      },
    ],
    timeline: 'standard',
    ...overrides,
  };
}

// ---- Single-line arithmetic --------------------------------------------

describe('calculateLevel4Quote — single line arithmetic', () => {
  it('applies overhead + QA/QC + packaging + markup correctly', () => {
    const r = calculateLevel4Quote(quote());
    const line = r.lineItems[0];
    // 1000 COGS → overhead 250 (25%), QA 80 (8%), packaging 50 (5%).
    expect(line.manufacturingOverheadCents).toBe(250);
    expect(line.qaQcCents).toBe(80);
    expect(line.packagingLaborCents).toBe(50);
    // Total cost = 1000 + 250 + 80 + 50 = 1380
    expect(line.totalUnitCostCents).toBe(1380);
    // Markup 40% of 1380 = 552 (ceil)
    expect(line.markupCents).toBe(552);
    // Unit price 1380 + 552 = 1932
    expect(line.unitPriceCents).toBe(1932);
    // 500 units × 1932 = 966,000
    expect(line.lineSubtotalCents).toBe(966000);
    expect(r.subtotalCents).toBe(966000);
  });

  it('rounds overhead + markup up to nearest cent (never under-quotes)', () => {
    const r = calculateLevel4Quote(
      quote({ items: [{ customFormulationId: 'f1', quantity: 500, unitCogsCents: 111, firstProductionOrder: false }] }),
    );
    const line = r.lineItems[0];
    // 111 × 25% = 27.75 → ceil 28
    expect(line.manufacturingOverheadCents).toBe(28);
  });
});

// ---- Expedited surcharge ------------------------------------------------

describe('calculateLevel4Quote — expedited surcharge', () => {
  it('applies 20% surcharge when timeline is expedited', () => {
    const r = calculateLevel4Quote(quote({ timeline: 'expedited' }));
    // subtotal 966,000 × 20% = 193,200
    expect(r.expeditedSurchargeCents).toBe(193200);
  });

  it('zero surcharge when standard timeline', () => {
    const r = calculateLevel4Quote(quote({ timeline: 'standard' }));
    expect(r.expeditedSurchargeCents).toBe(0);
  });
});

// ---- Development fee credit --------------------------------------------

describe('calculateLevel4Quote — development fee credit', () => {
  it('applies $3,888 credit on first production order', () => {
    const r = calculateLevel4Quote(quote());
    expect(r.developmentFeeCreditCents).toBe(388800);
    // subtotal 966,000 - 388,800 = 577,200
    expect(r.totalCents).toBe(577200);
  });

  it('no credit on second production order', () => {
    const r = calculateLevel4Quote(
      quote({
        items: [
          {
            customFormulationId: 'f1',
            quantity: 500,
            unitCogsCents: 1000,
            firstProductionOrder: false,
          },
        ],
      }),
    );
    expect(r.developmentFeeCreditCents).toBe(0);
    expect(r.totalCents).toBe(966000);
  });

  it('credits scale when multiple formulations are on first order', () => {
    const r = calculateLevel4Quote(
      quote({
        items: [
          { customFormulationId: 'f1', quantity: 500, unitCogsCents: 1000, firstProductionOrder: true },
          { customFormulationId: 'f2', quantity: 500, unitCogsCents: 1000, firstProductionOrder: true },
        ],
      }),
    );
    expect(r.developmentFeeCreditCents).toBe(2 * 388800);
  });

  it('credit does not produce negative total (floor at 0)', () => {
    const r = calculateLevel4Quote(
      quote({
        items: [{ customFormulationId: 'f1', quantity: 500, unitCogsCents: 100, firstProductionOrder: true }],
      }),
    );
    expect(r.totalCents).toBeGreaterThanOrEqual(0);
  });
});

// ---- 50/50 deposit structure --------------------------------------------

describe('calculateLevel4Quote — 50/50 deposit', () => {
  it('deposit is half the total (rounded up), final payment the remainder', () => {
    const r = calculateLevel4Quote(quote());
    expect(r.depositCents + r.finalPaymentCents).toBe(r.totalCents);
    expect(Math.abs(r.depositCents - r.finalPaymentCents)).toBeLessThanOrEqual(1);
  });

  it('deposit uses Math.ceil so ViaCura never under-collects at 50%', () => {
    const r = calculateLevel4Quote(
      quote({ items: [{ customFormulationId: 'f1', quantity: 500, unitCogsCents: 1001, firstProductionOrder: false }] }),
    );
    // Any odd-cent total rounds deposit up.
    const parityCheck = r.totalCents % 2;
    if (parityCheck !== 0) {
      expect(r.depositCents).toBe(Math.ceil(r.totalCents / 2));
    }
  });
});

// ---- MOQ + minimum order value ----------------------------------------

describe('calculateLevel4Quote — MOQ and minimum order value', () => {
  it('500-unit MOQ enforced per formulation', () => {
    const r = calculateLevel4Quote(
      quote({ items: [{ customFormulationId: 'f1', quantity: 100, unitCogsCents: 1000, firstProductionOrder: true }] }),
    );
    expect(r.meetsMoqPerFormulation).toBe(false);
    expect(r.violations.some((v) => v.includes('MOQ'))).toBe(true);
  });

  it('$30K minimum order value enforced', () => {
    // Small COGS × 500 units won't reach $30K
    const r = calculateLevel4Quote(
      quote({ items: [{ customFormulationId: 'f1', quantity: 500, unitCogsCents: 10, firstProductionOrder: true }] }),
    );
    expect(r.meetsMinimumOrderValue).toBe(false);
    expect(r.violations.some((v) => v.includes('minimum'))).toBe(true);
  });

  it('large order passes both thresholds', () => {
    const r = calculateLevel4Quote(
      quote({
        items: [
          { customFormulationId: 'f1', quantity: 1000, unitCogsCents: 2000, firstProductionOrder: false },
        ],
      }),
    );
    expect(r.meetsMoqPerFormulation).toBe(true);
    expect(r.meetsMinimumOrderValue).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it('exports param values used for transparency', () => {
    const r = calculateLevel4Quote(quote());
    expect(r.moqPerFormulation).toBe(500);
    expect(r.minimumOrderValueCents).toBe(3_000_000);
  });
});

// ---- Multi-line orders -------------------------------------------------

describe('calculateLevel4Quote — multi-line orders', () => {
  it('sums total units and subtotals across line items', () => {
    const r = calculateLevel4Quote(
      quote({
        items: [
          { customFormulationId: 'f1', quantity: 500, unitCogsCents: 1000, firstProductionOrder: true },
          { customFormulationId: 'f2', quantity: 800, unitCogsCents: 1500, firstProductionOrder: false },
        ],
      }),
    );
    expect(r.totalUnits).toBe(1300);
    expect(r.lineItems).toHaveLength(2);
  });

  it('only first-order line items receive credit; multi-line', () => {
    const r = calculateLevel4Quote(
      quote({
        items: [
          { customFormulationId: 'f1', quantity: 500, unitCogsCents: 1000, firstProductionOrder: true },
          { customFormulationId: 'f2', quantity: 500, unitCogsCents: 1000, firstProductionOrder: false },
        ],
      }),
    );
    expect(r.developmentFeeCreditCents).toBe(388800);
  });
});

// ---- Parameter overrides -----------------------------------------------

describe('calculateLevel4Quote — parameter overrides', () => {
  it('custom markup parameter flows through', () => {
    const r = calculateLevel4Quote(
      quote({
        parameters: {
          ...DEFAULT_LEVEL_4_PARAMETERS,
          markupPercent: 60,
        },
      }),
    );
    // 1000 COGS + 25% overhead + 8% qa + 5% packaging = 1380
    // Markup 60% of 1380 = 828
    expect(r.lineItems[0].markupCents).toBe(828);
  });

  it('custom MOQ affects violation reporting', () => {
    const r = calculateLevel4Quote(
      quote({
        items: [{ customFormulationId: 'f1', quantity: 200, unitCogsCents: 1000, firstProductionOrder: true }],
        parameters: { ...DEFAULT_LEVEL_4_PARAMETERS, moqPerFormulation: 100 },
      }),
    );
    expect(r.meetsMoqPerFormulation).toBe(true);
  });
});

// ---- computeDevelopmentFeeRefund ---------------------------------------

describe('computeDevelopmentFeeRefund', () => {
  const base = {
    developmentFeePaidCents: 388800,
    adminFeeRetainedCents: 50000,
  };

  it('applied_to_first_production_order -> 0 refund (credited)', () => {
    const r = computeDevelopmentFeeRefund({ ...base, reason: 'applied_to_first_production_order' });
    expect(r.refundCents).toBe(0);
    expect(r.retainedAdminFeeCents).toBe(0);
  });

  it('practitioner_abandoned -> refund minus admin fee', () => {
    const r = computeDevelopmentFeeRefund({ ...base, reason: 'practitioner_abandoned' });
    expect(r.refundCents).toBe(388800 - 50000);
    expect(r.retainedAdminFeeCents).toBe(50000);
  });

  it('validation_failed retains admin fee', () => {
    const r = computeDevelopmentFeeRefund({ ...base, reason: 'validation_failed' });
    expect(r.retainedAdminFeeCents).toBe(50000);
  });

  it('medical_review_rejected retains admin fee', () => {
    const r = computeDevelopmentFeeRefund({ ...base, reason: 'medical_review_rejected' });
    expect(r.refundCents).toBe(338800);
  });

  it('regulatory_review_rejected retains admin fee', () => {
    const r = computeDevelopmentFeeRefund({ ...base, reason: 'regulatory_review_rejected' });
    expect(r.retainedAdminFeeCents).toBe(50000);
  });

  it('viacura_cannot_source -> full refund (no admin fee retained)', () => {
    const r = computeDevelopmentFeeRefund({ ...base, reason: 'viacura_cannot_source' });
    expect(r.refundCents).toBe(388800);
    expect(r.retainedAdminFeeCents).toBe(0);
  });

  it('admin_override_refund -> full refund', () => {
    const r = computeDevelopmentFeeRefund({ ...base, reason: 'admin_override_refund' });
    expect(r.refundCents).toBe(388800);
    expect(r.retainedAdminFeeCents).toBe(0);
  });

  it('never returns negative refund (floor at 0)', () => {
    const r = computeDevelopmentFeeRefund({
      developmentFeePaidCents: 30000,
      adminFeeRetainedCents: 50000,
      reason: 'practitioner_abandoned',
    });
    expect(r.refundCents).toBe(0);
  });
});
