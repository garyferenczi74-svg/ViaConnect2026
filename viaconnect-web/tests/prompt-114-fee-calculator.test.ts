import { describe, it, expect } from 'vitest';
import {
  computeRecordationFees,
  formatCents,
  CBP_RATE_PER_IC_CENTS_INITIAL,
  CBP_RATE_PER_IC_CENTS_RENEWAL,
  CEO_APPROVAL_THRESHOLD_CENTS,
} from '@/lib/customs/cbpFeeCalculator';

describe('cbpFeeCalculator — trademark', () => {
  it('1 IC trademark: $190 initial, $80 renewal, no CEO approval', () => {
    const q = computeRecordationFees({ recordation_type: 'trademark', ic_count: 1 });
    expect(q.initial_fee_cents).toBe(CBP_RATE_PER_IC_CENTS_INITIAL);
    expect(q.renewal_fee_cents).toBe(CBP_RATE_PER_IC_CENTS_RENEWAL);
    expect(q.ceo_approval_required).toBe(false);
    expect(q.line_items).toHaveLength(1);
  });

  it('5 IC trademark: $950 initial, $400 renewal, no CEO approval yet', () => {
    const q = computeRecordationFees({ recordation_type: 'trademark', ic_count: 5 });
    expect(q.initial_fee_cents).toBe(5 * CBP_RATE_PER_IC_CENTS_INITIAL);
    expect(q.renewal_fee_cents).toBe(5 * CBP_RATE_PER_IC_CENTS_RENEWAL);
    expect(q.ceo_approval_required).toBe(false);
  });

  it('6 IC trademark: $1,140 initial — CROSSES the $1K CEO threshold', () => {
    const q = computeRecordationFees({ recordation_type: 'trademark', ic_count: 6 });
    expect(q.initial_fee_cents).toBe(114_000);
    expect(q.initial_fee_cents).toBeGreaterThan(CEO_APPROVAL_THRESHOLD_CENTS);
    expect(q.ceo_approval_required).toBe(true);
  });

  it('45 IC trademark (max): $8,550 initial, $3,600 renewal, CEO approval required', () => {
    const q = computeRecordationFees({ recordation_type: 'trademark', ic_count: 45 });
    expect(q.initial_fee_cents).toBe(45 * CBP_RATE_PER_IC_CENTS_INITIAL);
    expect(q.renewal_fee_cents).toBe(45 * CBP_RATE_PER_IC_CENTS_RENEWAL);
    expect(q.ceo_approval_required).toBe(true);
    expect(q.line_items).toHaveLength(45);
  });

  it('rejects ic_count = 0', () => {
    expect(() => computeRecordationFees({ recordation_type: 'trademark', ic_count: 0 })).toThrow();
  });

  it('rejects negative ic_count', () => {
    expect(() => computeRecordationFees({ recordation_type: 'trademark', ic_count: -1 })).toThrow();
  });

  it('rejects ic_count > 45', () => {
    expect(() => computeRecordationFees({ recordation_type: 'trademark', ic_count: 46 })).toThrow();
  });

  it('rejects non-integer ic_count', () => {
    expect(() => computeRecordationFees({ recordation_type: 'trademark', ic_count: 2.5 })).toThrow();
  });
});

describe('cbpFeeCalculator — copyright', () => {
  it('copyright: $190 flat initial, $80 flat renewal, no CEO approval', () => {
    const q = computeRecordationFees({ recordation_type: 'copyright', ic_count: 1 });
    expect(q.initial_fee_cents).toBe(19_000);
    expect(q.renewal_fee_cents).toBe(8_000);
    expect(q.ceo_approval_required).toBe(false);
    expect(q.line_items).toHaveLength(1);
    expect(q.line_items[0].label).toBe('Copyright recordation flat fee');
  });

  it('copyright rejects ic_count > 1', () => {
    expect(() => computeRecordationFees({ recordation_type: 'copyright', ic_count: 3 })).toThrow();
  });
});

describe('cbpFeeCalculator — formatCents', () => {
  it('formats $190 correctly', () => {
    expect(formatCents(19_000)).toBe('$190.00');
  });

  it('formats $8,550 correctly', () => {
    expect(formatCents(855_000)).toBe('$8,550.00');
  });

  it('formats zero correctly', () => {
    expect(formatCents(0)).toBe('$0.00');
  });
});
