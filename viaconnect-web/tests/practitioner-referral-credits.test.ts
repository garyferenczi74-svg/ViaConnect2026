// Prompt #98 Phase 5: Credit application + expiration tests.

import { describe, it, expect } from 'vitest';
import {
  computeCreditApplication,
  VALID_APPLICATION_ENTRY_TYPES,
  type CreditApplicationInput,
} from '@/lib/practitioner-referral/credit-application';
import {
  matchFifoExpiration,
  classifyExpirationWarningWindow,
  EXPIRATION_WARNING_DAYS,
  type LedgerEntry,
} from '@/lib/practitioner-referral/credit-expiration';
import { CREDIT_EXPIRATION_MONTHS_DEFAULT } from '@/lib/practitioner-referral/schema-types';

// ---------------------------------------------------------------------------
// computeCreditApplication
// ---------------------------------------------------------------------------

function applyInput(over: Partial<CreditApplicationInput> = {}): CreditApplicationInput {
  return {
    practitioner_id: 'prac_1',
    transaction_type: 'applied_to_subscription',
    transaction_reference_id: 'sub_1',
    requested_cents: 5_000,
    available_balance_cents: 20_000,
    transaction_total_cents: 10_000,
    ...over,
  };
}

describe('VALID_APPLICATION_ENTRY_TYPES', () => {
  it('exposes the five applied_to_* ledger entry types', () => {
    expect(new Set(VALID_APPLICATION_ENTRY_TYPES)).toEqual(new Set([
      'applied_to_subscription',
      'applied_to_wholesale_order',
      'applied_to_certification_fee',
      'applied_to_level_3_fee',
      'applied_to_level_4_fee',
    ]));
  });
});

describe('computeCreditApplication', () => {
  it('applies the full requested amount when balance and transaction both allow', () => {
    const r = computeCreditApplication(applyInput({
      requested_cents: 5_000,
      available_balance_cents: 20_000,
      transaction_total_cents: 10_000,
    }));
    expect(r.applied_cents).toBe(5_000);
    expect(r.remaining_due_cents).toBe(5_000);
    expect(r.ok).toBe(true);
  });

  it('caps at available balance when requested exceeds', () => {
    const r = computeCreditApplication(applyInput({
      requested_cents: 30_000,
      available_balance_cents: 8_000,
      transaction_total_cents: 50_000,
    }));
    expect(r.applied_cents).toBe(8_000);
    expect(r.remaining_due_cents).toBe(42_000);
  });

  it('caps at transaction total when requested exceeds', () => {
    const r = computeCreditApplication(applyInput({
      requested_cents: 30_000,
      available_balance_cents: 40_000,
      transaction_total_cents: 12_000,
    }));
    expect(r.applied_cents).toBe(12_000);
    expect(r.remaining_due_cents).toBe(0);
  });

  it('picks the tightest cap (min of all three)', () => {
    const r = computeCreditApplication(applyInput({
      requested_cents: 100_000,
      available_balance_cents: 50_000,
      transaction_total_cents: 30_000,
    }));
    expect(r.applied_cents).toBe(30_000);
  });

  it('returns ok=false with reason when requested is zero or negative', () => {
    const r = computeCreditApplication(applyInput({ requested_cents: 0 }));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/positive/i);
    expect(r.applied_cents).toBe(0);
  });

  it('returns ok=false with reason when available balance is zero', () => {
    const r = computeCreditApplication(applyInput({ available_balance_cents: 0 }));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/balance/i);
  });

  it('returns ok=false when transaction total is zero (nothing to apply to)', () => {
    const r = computeCreditApplication(applyInput({ transaction_total_cents: 0 }));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/transaction/i);
  });

  it('rejects an unknown transaction_type', () => {
    const r = computeCreditApplication(applyInput({ transaction_type: 'applied_to_random_fee' as any }));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/transaction_type/i);
  });

  it('emits the signed ledger delta (negative for applications)', () => {
    const r = computeCreditApplication(applyInput({ requested_cents: 5_000 }));
    expect(r.ledger_amount_cents).toBe(-5_000);
  });

  it('computes the new balance after application', () => {
    const r = computeCreditApplication(applyInput({
      requested_cents: 3_000, available_balance_cents: 10_000,
    }));
    expect(r.new_balance_cents).toBe(7_000);
  });
});

// ---------------------------------------------------------------------------
// Expiration
// ---------------------------------------------------------------------------

const NOW = new Date('2026-04-20T00:00:00.000Z');

function monthsAgo(n: number): string {
  const d = new Date(NOW);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString();
}

function entry(over: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: 'e_?',
    practitioner_id: 'prac_1',
    entry_type: 'earned_from_milestone',
    amount_cents: 20_000,
    created_at: monthsAgo(12),
    ...over,
  };
}

describe('matchFifoExpiration', () => {
  it('expires the entire amount of an old earned entry with no applications', () => {
    // Earned 25 months ago, untouched -> fully expired.
    const ledger: LedgerEntry[] = [
      entry({ id: 'e1', entry_type: 'earned_from_milestone', amount_cents: 20_000, created_at: monthsAgo(25) }),
    ];
    const r = matchFifoExpiration(ledger, NOW);
    expect(r).toEqual([{ source_entry_id: 'e1', amount_cents: 20_000 }]);
  });

  it('returns no expirations for entries under 24 months old', () => {
    const ledger: LedgerEntry[] = [
      entry({ id: 'e1', entry_type: 'earned_from_milestone', amount_cents: 20_000, created_at: monthsAgo(20) }),
    ];
    expect(matchFifoExpiration(ledger, NOW)).toEqual([]);
  });

  it('expires only the unused portion (FIFO consumption by applications)', () => {
    const ledger: LedgerEntry[] = [
      entry({ id: 'e1', entry_type: 'earned_from_milestone', amount_cents: 20_000, created_at: monthsAgo(25) }),
      entry({ id: 'a1', entry_type: 'applied_to_subscription', amount_cents: -5_000, created_at: monthsAgo(10) }),
    ];
    const r = matchFifoExpiration(ledger, NOW);
    expect(r).toEqual([{ source_entry_id: 'e1', amount_cents: 15_000 }]);
  });

  it('consumes earlier earns first when multiple earn + apply entries exist', () => {
    const ledger: LedgerEntry[] = [
      entry({ id: 'e1', entry_type: 'earned_from_milestone', amount_cents: 10_000, created_at: monthsAgo(25) }),
      entry({ id: 'e2', entry_type: 'earned_from_milestone', amount_cents: 20_000, created_at: monthsAgo(10) }),
      // One $12,000 apply consumes all of e1 and $2,000 of e2.
      entry({ id: 'a1', entry_type: 'applied_to_subscription', amount_cents: -12_000, created_at: monthsAgo(8) }),
    ];
    const r = matchFifoExpiration(ledger, NOW);
    // Only e1 is past 24 months; it was fully consumed by the application -> 0 left.
    expect(r).toEqual([]);
  });

  it('skips already-expired, voided, and admin-adjustment entries', () => {
    const ledger: LedgerEntry[] = [
      entry({ id: 'e1', entry_type: 'earned_from_milestone',  amount_cents:  20_000, created_at: monthsAgo(25) }),
      entry({ id: 'ex', entry_type: 'expired',                amount_cents: -20_000, created_at: monthsAgo(1),  milestone_event_id: null }),
    ];
    // e1 was already expired by entry 'ex'; do not emit a duplicate expiration.
    expect(matchFifoExpiration(ledger, NOW)).toEqual([]);
  });

  it('treats voided_fraud as a consuming entry (already clawed back)', () => {
    const ledger: LedgerEntry[] = [
      entry({ id: 'e1', entry_type: 'earned_from_milestone', amount_cents:  20_000, created_at: monthsAgo(25) }),
      entry({ id: 'vf', entry_type: 'voided_fraud',          amount_cents: -20_000, created_at: monthsAgo(12) }),
    ];
    expect(matchFifoExpiration(ledger, NOW)).toEqual([]);
  });

  it('honors a custom expiration window', () => {
    const ledger: LedgerEntry[] = [
      entry({ id: 'e1', entry_type: 'earned_from_milestone', amount_cents: 20_000, created_at: monthsAgo(18) }),
    ];
    // Default window is 24 months -> no expiration.
    expect(matchFifoExpiration(ledger, NOW)).toEqual([]);
    // Tighter 12-month window expires it.
    expect(matchFifoExpiration(ledger, NOW, 12)).toEqual([
      { source_entry_id: 'e1', amount_cents: 20_000 },
    ]);
  });

  it('exposes the spec default (24 months)', () => {
    expect(CREDIT_EXPIRATION_MONTHS_DEFAULT).toBe(24);
  });
});

describe('classifyExpirationWarningWindow', () => {
  it('exposes the four warning thresholds from spec', () => {
    expect(EXPIRATION_WARNING_DAYS).toEqual([90, 60, 30, 7]);
  });

  it('returns null when entry is not yet in any warning window', () => {
    // Earned 12 months ago; expires at 24; 12 months (~365d) to expiration.
    const r = classifyExpirationWarningWindow({
      earned_at: monthsAgo(12), now: NOW,
    });
    expect(r).toBeNull();
  });

  it('returns 90 when expiration is ~90 days out', () => {
    // 21 months ago + 24 month window = 3 months to expiration.
    const r = classifyExpirationWarningWindow({
      earned_at: monthsAgo(21), now: NOW,
    });
    expect(r).toBe(90);
  });

  it('returns 60 when expiration is ~60 days out', () => {
    // ~22 months ago
    const d = new Date(NOW);
    d.setUTCDate(d.getUTCDate() - 60 * 12 / 12); // arbitrary; use direct math below
    const r = classifyExpirationWarningWindow({
      earned_at: new Date(NOW.getTime() - (24 * 30 - 60) * 86_400_000).toISOString(),
      now: NOW,
    });
    expect(r).toBe(60);
  });

  it('returns 30 when expiration is 14 days out', () => {
    const r = classifyExpirationWarningWindow({
      earned_at: new Date(NOW.getTime() - (24 * 30 - 14) * 86_400_000).toISOString(),
      now: NOW,
    });
    expect(r).toBe(30);
  });

  it('returns 7 when expiration is 3 days out', () => {
    const r = classifyExpirationWarningWindow({
      earned_at: new Date(NOW.getTime() - (24 * 30 - 3) * 86_400_000).toISOString(),
      now: NOW,
    });
    expect(r).toBe(7);
  });

  it('returns null when already expired', () => {
    const r = classifyExpirationWarningWindow({
      earned_at: monthsAgo(25),
      now: NOW,
    });
    expect(r).toBeNull();
  });
});
