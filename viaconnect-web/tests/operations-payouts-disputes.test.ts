// Prompt #102 Workstream B: payout eligibility + dispute escrow tests.

import { describe, it, expect } from 'vitest';
import {
  BATCH_APPROVAL_CONFIRMATION_PHRASE,
  computeLineEligibilityStatus,
  isBatchApprovalConfirmed,
  selectRail,
} from '@/lib/payouts/batchBuilder';
import {
  splitEscrowVsRelease,
  validateDisputeDocs,
  validateDisputeExplanation,
} from '@/lib/payouts/disputes';
import {
  DEFAULT_MIN_PAYOUT_THRESHOLD_CENTS,
  RAIL_FEE_CONFIG,
} from '@/lib/payouts/types';

describe('computeLineEligibilityStatus — §5.2 gates', () => {
  const OK = {
    netPayableCents: 20000, minThresholdCents: null,
    taxInfoStatus: 'on_file' as const, payoutMethodStatus: 'verified' as const, marginFloorBreach: false,
  };

  it('queued when all gates pass', () => {
    expect(computeLineEligibilityStatus(OK)).toBe('queued');
  });
  it('held_below_threshold when under $100', () => {
    expect(computeLineEligibilityStatus({ ...OK, netPayableCents: 9999 })).toBe('held_below_threshold');
  });
  it('held_no_tax_info when tax not on file', () => {
    expect(computeLineEligibilityStatus({ ...OK, taxInfoStatus: 'submitted' })).toBe('held_no_tax_info');
  });
  it('held_no_payment_method when method not verified', () => {
    expect(computeLineEligibilityStatus({ ...OK, payoutMethodStatus: 'pending_setup' })).toBe('held_no_payment_method');
  });
  it('held_admin_review on margin floor breach (wins over other gates)', () => {
    expect(computeLineEligibilityStatus({ ...OK, marginFloorBreach: true })).toBe('held_admin_review');
  });
  it('respects custom min threshold', () => {
    expect(computeLineEligibilityStatus({
      ...OK, netPayableCents: 10000, minThresholdCents: 25000,
    })).toBe('held_below_threshold');
  });
  it('default threshold is $100', () => {
    expect(DEFAULT_MIN_PAYOUT_THRESHOLD_CENTS).toBe(100_00);
  });
});

describe('selectRail', () => {
  const methods = [
    { methodId: 'm1', rail: 'stripe_connect_ach' as const, status: 'verified' as const, priority: 10 },
    { methodId: 'm2', rail: 'paypal' as const, status: 'verified' as const, priority: 50 },
  ];

  it('picks the lowest-priority verified method', () => {
    expect(selectRail(methods, 5000)?.methodId).toBe('m1');
  });
  it('skips unverified methods', () => {
    const r = selectRail([{ ...methods[0]!, status: 'pending_setup' }, methods[1]!], 5000);
    expect(r?.methodId).toBe('m2');
  });
  it('returns null when no verified method exists', () => {
    expect(selectRail([{ ...methods[0]!, status: 'pending_setup' }], 5000)).toBeNull();
  });
  it('honors amount-supports predicate (e.g., wire minimum)', () => {
    const wireMethod = {
      methodId: 'w1', rail: 'domestic_wire_us' as const,
      status: 'verified' as const, priority: 1,
      supportsAmountCents: (n: number) => n >= 1_000_000,
    };
    expect(selectRail([wireMethod, ...methods], 5000)?.methodId).toBe('m1');
    expect(selectRail([wireMethod, ...methods], 1_500_000)?.methodId).toBe('w1');
  });
});

describe('isBatchApprovalConfirmed', () => {
  it('requires exact phrase', () => {
    expect(isBatchApprovalConfirmed(BATCH_APPROVAL_CONFIRMATION_PHRASE)).toBe(true);
    expect(isBatchApprovalConfirmed('approve batch')).toBe(false);
    expect(isBatchApprovalConfirmed('APPROVE BATCH ')).toBe(false);
  });
});

describe('dispute escrow split (§5.6)', () => {
  it('escrows only the disputed amount, releases the rest', () => {
    const r = splitEscrowVsRelease(200, 1000);
    expect(r.heldInEscrowCents).toBe(200);
    expect(r.releasedCents).toBe(800);
  });
  it('escrow caps at net payable (never negative release)', () => {
    const r = splitEscrowVsRelease(5000, 1000);
    expect(r.heldInEscrowCents).toBe(1000);
    expect(r.releasedCents).toBe(0);
  });
  it('absolute value on contested (line amounts may be negative)', () => {
    const r = splitEscrowVsRelease(-300, 1000);
    expect(r.heldInEscrowCents).toBe(300);
    expect(r.releasedCents).toBe(700);
  });
});

describe('dispute validators', () => {
  it('rejects too-short explanation', () => {
    expect(validateDisputeExplanation('short')).toBe('EXPLANATION_TOO_SHORT');
  });
  it('accepts minimum 10 chars', () => {
    expect(validateDisputeExplanation('1234567890')).toBeNull();
  });
  it('rejects too many docs', () => {
    expect(validateDisputeDocs([{size:1},{size:1},{size:1},{size:1}])).toBe('TOO_MANY_DOCS');
  });
  it('rejects oversize doc', () => {
    expect(validateDisputeDocs([{ size: 6 * 1024 * 1024 }])).toBe('DOC_TOO_LARGE');
  });
});

describe('RAIL_FEE_CONFIG', () => {
  it('covers every rail with numeric config', () => {
    for (const rail of Object.keys(RAIL_FEE_CONFIG) as Array<keyof typeof RAIL_FEE_CONFIG>) {
      const cfg = RAIL_FEE_CONFIG[rail];
      expect(cfg.fixedCents).toBeGreaterThanOrEqual(0);
      expect(cfg.variablePct).toBeGreaterThanOrEqual(0);
    }
  });
});
