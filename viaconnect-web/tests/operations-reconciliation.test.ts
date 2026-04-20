// Prompt #102 Workstream B reconciliation pipeline + math tests.

import { describe, it, expect } from 'vitest';
import { computeRefundClawbackCents } from '@/lib/reconciliation/clawbacks';
import { clampHoldAgainstAccrued } from '@/lib/reconciliation/holds';
import {
  maxCommissionPreservingFloorCents,
  wouldPreserveMarginFloor,
  MARGIN_FLOOR_PCT,
} from '@/lib/reconciliation/marginFloorCheck';
import { runReconciliationPipeline } from '@/lib/reconciliation/pipeline';

describe('computeRefundClawbackCents', () => {
  it('full refund claws full accrual', () => {
    expect(computeRefundClawbackCents({
      accrualAmountCents: 1000, refundedAmountCents: 10000, orderTotalCents: 10000,
    })).toBe(1000);
  });
  it('partial 30% refund claws 30% of accrual', () => {
    expect(computeRefundClawbackCents({
      accrualAmountCents: 1000, refundedAmountCents: 3000, orderTotalCents: 10000,
    })).toBe(300);
  });
  it('no refund claws nothing', () => {
    expect(computeRefundClawbackCents({
      accrualAmountCents: 1000, refundedAmountCents: 0, orderTotalCents: 10000,
    })).toBe(0);
  });
  it('over-refund capped at 100% of accrual', () => {
    expect(computeRefundClawbackCents({
      accrualAmountCents: 1000, refundedAmountCents: 20000, orderTotalCents: 10000,
    })).toBe(1000);
  });
  it('zero order total returns 0 (no division error)', () => {
    expect(computeRefundClawbackCents({
      accrualAmountCents: 1000, refundedAmountCents: 1000, orderTotalCents: 0,
    })).toBe(0);
  });
});

describe('clampHoldAgainstAccrued (§3.3: never debit practitioner)', () => {
  it('applies full hold when within accrued', () => {
    const r = clampHoldAgainstAccrued({
      periodAccruedCents: 10000, rawHoldCents: 3000, existingClawbackCents: 0,
    });
    expect(r.appliedCents).toBe(3000);
    expect(r.carryForwardCents).toBe(0);
  });
  it('clamps at 100% of accrued; excess carries forward', () => {
    const r = clampHoldAgainstAccrued({
      periodAccruedCents: 1000, rawHoldCents: 5000, existingClawbackCents: 0,
    });
    expect(r.appliedCents).toBe(1000);
    expect(r.carryForwardCents).toBe(4000);
  });
  it('accounts for existing clawbacks in available room', () => {
    const r = clampHoldAgainstAccrued({
      periodAccruedCents: 10000, rawHoldCents: 5000, existingClawbackCents: 7000,
    });
    expect(r.appliedCents).toBe(3000); // only 3000 room left after clawback
    expect(r.carryForwardCents).toBe(2000);
  });
  it('never produces a negative net (no debit)', () => {
    const r = clampHoldAgainstAccrued({
      periodAccruedCents: 0, rawHoldCents: 5000, existingClawbackCents: 0,
    });
    expect(r.appliedCents).toBe(0);
    expect(r.carryForwardCents).toBe(5000);
  });
});

describe('marginFloorCheck (#94 defense-in-depth)', () => {
  it('MARGIN_FLOOR_PCT is 42%', () => {
    expect(MARGIN_FLOOR_PCT).toBe(0.42);
  });
  it('passes when margin preserved', () => {
    expect(wouldPreserveMarginFloor({
      orderNetRevenueCents: 10000, orderCostCents: 3000, proposedCommissionCents: 1000,
    })).toBe(true);
  });
  it('fails when commission breaches floor', () => {
    expect(wouldPreserveMarginFloor({
      orderNetRevenueCents: 10000, orderCostCents: 3000, proposedCommissionCents: 3500,
    })).toBe(false);
  });
  it('max commission computation is non-negative', () => {
    expect(maxCommissionPreservingFloorCents({
      orderNetRevenueCents: 10000, orderCostCents: 3000,
    })).toBe(2800);
  });
  it('max commission floors at 0 when margin already breached', () => {
    expect(maxCommissionPreservingFloorCents({
      orderNetRevenueCents: 1000, orderCostCents: 800,
    })).toBe(0);
  });
});

describe('runReconciliationPipeline', () => {
  it('simple accrual with no adjustments', () => {
    const r = runReconciliationPipeline({
      accruals: [
        { accrualId: 'a1', orderId: 'o1', accrualAmountCents: 1000, orderTotalCents: 10000, orderRefundedAmountCents: 0 },
      ],
      holds: [],
    });
    expect(r.grossAccruedCents).toBe(1000);
    expect(r.totalClawbacksCents).toBe(0);
    expect(r.totalHoldsCents).toBe(0);
    expect(r.netPayableCents).toBe(1000);
    expect(r.lines).toHaveLength(1);
  });

  it('applies refund clawback', () => {
    const r = runReconciliationPipeline({
      accruals: [
        { accrualId: 'a1', orderId: 'o1', accrualAmountCents: 1000, orderTotalCents: 10000, orderRefundedAmountCents: 5000 },
      ],
      holds: [],
    });
    expect(r.totalClawbacksCents).toBe(500);
    expect(r.netPayableCents).toBe(500);
    expect(r.lines).toHaveLength(2);
  });

  it('applies MAP violation hold, clamped', () => {
    const r = runReconciliationPipeline({
      accruals: [
        { accrualId: 'a1', orderId: 'o1', accrualAmountCents: 1000, orderTotalCents: 10000, orderRefundedAmountCents: 0 },
      ],
      holds: [{ violationId: 'v1', amountCents: 5000 }],
    });
    expect(r.totalHoldsCents).toBe(1000);
    expect(r.carryForwardHoldCents).toBe(4000);
    expect(r.netPayableCents).toBe(0);
  });

  it('dispute does not break normal flow', () => {
    // Multiple accruals; one has hold; others still reconcile
    const r = runReconciliationPipeline({
      accruals: [
        { accrualId: 'a1', orderId: 'o1', accrualAmountCents: 1000, orderTotalCents: 10000, orderRefundedAmountCents: 0 },
        { accrualId: 'a2', orderId: 'o2', accrualAmountCents: 2000, orderTotalCents: 20000, orderRefundedAmountCents: 0 },
      ],
      holds: [{ violationId: 'v1', amountCents: 500 }],
    });
    expect(r.grossAccruedCents).toBe(3000);
    expect(r.totalHoldsCents).toBe(500);
    expect(r.netPayableCents).toBe(2500);
  });
});
