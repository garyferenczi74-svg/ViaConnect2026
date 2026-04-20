// Prompt #96 Phase 5: Production quote + cancellation + state-machine tests.
// Elevated coverage target (90%+) per spec.

import { describe, it, expect } from 'vitest';
import {
  calculateProductionQuote,
  type QuoteLineInput,
} from '@/lib/white-label/production-quote';
import {
  computeCancellationOutcome,
  CANCELLATION_ADMIN_FEE_PERCENT,
  type CancellationStage,
} from '@/lib/white-label/cancellation-fees';
import {
  ALLOWED_TRANSITIONS,
  isValidTransition,
  PRODUCTION_MILESTONES,
  type ProductionStatus,
} from '@/lib/white-label/production-state-machine';

// ---------------------------------------------------------------------------
// Production quote
// ---------------------------------------------------------------------------

function lines(perSku: number, count: number, msrp = 5000): QuoteLineInput[] {
  return Array.from({ length: count }, (_, i) => ({
    label_design_id: `label_${i}`,
    product_catalog_id: `prod_${i}`,
    quantity: perSku,
    base_msrp_cents: msrp,
  }));
}

describe('calculateProductionQuote – tier classification', () => {
  it('returns tier_100_499 (60%) for 100 units total', () => {
    const q = calculateProductionQuote({ items: lines(100, 1), timeline: 'standard' });
    expect(q.applied_discount_tier).toBe('tier_100_499');
    expect(q.applied_discount_percent).toBe(60);
    expect(q.line_items[0].unit_cost_cents).toBe(2000); // 5000 * 0.4
  });
  it('returns tier_500_999 (65%) at 500', () => {
    const q = calculateProductionQuote({ items: lines(500, 1), timeline: 'standard' });
    expect(q.applied_discount_tier).toBe('tier_500_999');
    expect(q.applied_discount_percent).toBe(65);
  });
  it('returns tier_1000_plus (70%) at 1000', () => {
    const q = calculateProductionQuote({ items: lines(1000, 1), timeline: 'standard' });
    expect(q.applied_discount_tier).toBe('tier_1000_plus');
    expect(q.applied_discount_percent).toBe(70);
  });
  it('aggregates across SKUs to determine tier (not per-SKU)', () => {
    const q = calculateProductionQuote({ items: lines(200, 3), timeline: 'standard' });
    expect(q.total_units).toBe(600);
    expect(q.applied_discount_tier).toBe('tier_500_999');
  });
  it('throws when any line is below the 100-unit MOQ', () => {
    expect(() =>
      calculateProductionQuote({ items: lines(50, 1), timeline: 'standard' }),
    ).toThrow(/MOQ/i);
  });
  it('throws when total units do not classify into any tier', () => {
    expect(() =>
      calculateProductionQuote({ items: [], timeline: 'standard' }),
    ).toThrow(/at least one/i);
  });
});

describe('calculateProductionQuote – pricing math', () => {
  it('subtotal = sum of unit_cost_cents * quantity per line', () => {
    const q = calculateProductionQuote({ items: lines(100, 2, 5000), timeline: 'standard' });
    expect(q.subtotal_cents).toBe(2 * 100 * 2000);
  });
  it('expedited surcharge is 15% of subtotal', () => {
    const q = calculateProductionQuote({ items: lines(100, 1, 10000), timeline: 'expedited' });
    expect(q.expedited_surcharge_cents).toBe(60_000);
    expect(q.total_cents).toBe(460_000);
  });
  it('expedited surcharge is zero when timeline=standard', () => {
    const q = calculateProductionQuote({ items: lines(100, 1, 10000), timeline: 'standard' });
    expect(q.expedited_surcharge_cents).toBe(0);
    expect(q.total_cents).toBe(q.subtotal_cents);
  });
  it('deposit + final = total, deposit is 50% rounded', () => {
    const q = calculateProductionQuote({ items: lines(100, 1, 10001), timeline: 'standard' });
    expect(q.deposit_cents + q.final_payment_cents).toBe(q.total_cents);
    expect(q.deposit_cents).toBe(Math.round(q.total_cents * 0.5));
  });
});

describe('calculateProductionQuote – minimum order value', () => {
  it('flags meets_minimum_order_value=false when total < $15K', () => {
    const q = calculateProductionQuote({ items: lines(100, 1, 5000), timeline: 'standard' });
    expect(q.meets_minimum_order_value).toBe(false);
  });
  it('flags meets_minimum_order_value=true at $15K', () => {
    // 1000 units at MSRP $80 -> tier_1000_plus 70% -> $24/unit -> $24,000 subtotal
    const q = calculateProductionQuote({ items: lines(1000, 1, 8000), timeline: 'standard' });
    expect(q.meets_minimum_order_value).toBe(true);
  });
  it('exposes the threshold in cents on the result for UI consistency', () => {
    const q = calculateProductionQuote({ items: lines(100, 1), timeline: 'standard' });
    expect(q.minimum_order_value_cents).toBe(1_500_000);
  });
});

// ---------------------------------------------------------------------------
// Cancellation fees
// ---------------------------------------------------------------------------

describe('computeCancellationOutcome', () => {
  function depositOf(total: number): number {
    return Math.round(total * 0.5);
  }

  it('exposes the 10% admin fee constant', () => {
    expect(CANCELLATION_ADMIN_FEE_PERCENT).toBe(10);
  });

  it('stage=before_deposit: free, no fee, no refund', () => {
    const r = computeCancellationOutcome({
      stage: 'before_deposit',
      total_cents: 1_000_000, deposit_paid_cents: 0, admin_override: false,
    });
    expect(r.fee_cents).toBe(0);
    expect(r.refund_cents).toBe(0);
    expect(r.balance_due_cents).toBe(0);
    expect(r.allowed).toBe(true);
  });

  it('stage=after_deposit_before_production: 10% admin fee deducted from deposit refund', () => {
    const total = 2_000_000;
    const deposit = depositOf(total);
    const r = computeCancellationOutcome({
      stage: 'after_deposit_before_production',
      total_cents: total, deposit_paid_cents: deposit, admin_override: false,
    });
    const fee = Math.round(deposit * 0.1);
    expect(r.fee_cents).toBe(fee);
    expect(r.refund_cents).toBe(deposit - fee);
    expect(r.balance_due_cents).toBe(0);
  });

  it('stage=after_production_before_qc: deposit forfeited; balance due', () => {
    const total = 2_000_000;
    const deposit = depositOf(total);
    const r = computeCancellationOutcome({
      stage: 'after_production_before_qc',
      total_cents: total, deposit_paid_cents: deposit, admin_override: false,
    });
    expect(r.fee_cents).toBe(deposit);
    expect(r.refund_cents).toBe(0);
    expect(r.balance_due_cents).toBe(total - deposit);
  });

  it('stage=after_qc: cancellation NOT allowed without admin override', () => {
    const r = computeCancellationOutcome({
      stage: 'after_qc',
      total_cents: 2_000_000, deposit_paid_cents: 1_000_000, admin_override: false,
    });
    expect(r.allowed).toBe(false);
  });

  it('admin_override=true at any stage refunds full deposit + waives fees', () => {
    for (const stage of ['before_deposit', 'after_deposit_before_production', 'after_production_before_qc', 'after_qc'] as CancellationStage[]) {
      const total = 2_000_000;
      const deposit = depositOf(total);
      const r = computeCancellationOutcome({
        stage, total_cents: total, deposit_paid_cents: deposit, admin_override: true,
      });
      expect(r.allowed).toBe(true);
      expect(r.fee_cents).toBe(0);
      expect(r.refund_cents).toBe(deposit);
      expect(r.balance_due_cents).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

describe('production state machine', () => {
  it('exposes all 8 production milestones in order', () => {
    expect(PRODUCTION_MILESTONES).toEqual([
      'labels_approved_pending_deposit',
      'deposit_paid',
      'in_production',
      'quality_control',
      'final_payment_pending',
      'shipped',
      'delivered',
      'canceled',
    ]);
  });

  it('quote -> labels_pending_review is allowed', () => {
    expect(isValidTransition('quote', 'labels_pending_review')).toBe(true);
  });

  it('labels_approved_pending_deposit -> deposit_paid is allowed (Stripe webhook)', () => {
    expect(isValidTransition('labels_approved_pending_deposit', 'deposit_paid')).toBe(true);
  });

  it('deposit_paid -> in_production is allowed (operations starts the run)', () => {
    expect(isValidTransition('deposit_paid', 'in_production')).toBe(true);
  });

  it('in_production -> quality_control -> final_payment_pending -> shipped -> delivered is the happy path', () => {
    expect(isValidTransition('in_production', 'quality_control')).toBe(true);
    expect(isValidTransition('quality_control', 'final_payment_pending')).toBe(true);
    expect(isValidTransition('final_payment_pending', 'shipped')).toBe(true);
    expect(isValidTransition('shipped', 'delivered')).toBe(true);
  });

  it('any active state can transition to canceled', () => {
    const cancelable: ProductionStatus[] = [
      'quote', 'labels_pending_review', 'labels_approved_pending_deposit',
      'deposit_paid', 'in_production', 'quality_control', 'final_payment_pending',
    ];
    for (const s of cancelable) {
      expect(isValidTransition(s, 'canceled')).toBe(true);
    }
  });

  it('shipped cannot be canceled', () => {
    expect(isValidTransition('shipped', 'canceled')).toBe(false);
  });

  it('delivered is terminal (no outbound transitions)', () => {
    expect(ALLOWED_TRANSITIONS.delivered).toEqual([]);
  });

  it('canceled is terminal', () => {
    expect(ALLOWED_TRANSITIONS.canceled).toEqual([]);
  });

  it('rejects backward transitions like deposit_paid -> labels_pending_review', () => {
    expect(isValidTransition('deposit_paid', 'labels_pending_review')).toBe(false);
  });

  it('rejects skipping milestones (in_production -> shipped)', () => {
    expect(isValidTransition('in_production', 'shipped')).toBe(false);
  });
});
