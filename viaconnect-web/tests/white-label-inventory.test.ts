// Prompt #96 Phase 6: Inventory + dispensary pure-helper tests.

import { describe, it, expect } from 'vitest';
import {
  calculateStorageFee,
  FREE_STORAGE_DAYS_DEFAULT,
  STORAGE_FEE_CENTS_PER_UNIT_DAY_DEFAULT,
} from '@/lib/white-label/storage-fee';
import {
  classifyLowInventory,
  LOW_INVENTORY_THRESHOLDS_DAYS,
} from '@/lib/white-label/inventory-alerts';
import {
  classifyExpiration,
  EXPIRATION_THRESHOLDS_DAYS,
} from '@/lib/white-label/expiration-alerts';
import {
  pickLotsFefo,
  type FefoLot,
} from '@/lib/white-label/fefo-fulfillment';

// ---------------------------------------------------------------------------
// Storage fee
// ---------------------------------------------------------------------------

describe('calculateStorageFee', () => {
  it('exposes spec defaults', () => {
    expect(FREE_STORAGE_DAYS_DEFAULT).toBe(60);
    expect(STORAGE_FEE_CENTS_PER_UNIT_DAY_DEFAULT).toBe(2);
  });

  it('returns zero fee inside the 60-day free window', () => {
    expect(calculateStorageFee({ units: 100, daysAtViacura: 0 }).fee_cents).toBe(0);
    expect(calculateStorageFee({ units: 100, daysAtViacura: 30 }).fee_cents).toBe(0);
    expect(calculateStorageFee({ units: 100, daysAtViacura: 60 }).fee_cents).toBe(0);
  });

  it('charges 2 cents per unit per day past the free window', () => {
    // 100 units * (61 - 60) = 100 chargeable unit-days * 2 cents = 200
    expect(calculateStorageFee({ units: 100, daysAtViacura: 61 }).fee_cents).toBe(200);
    // 500 units * 30 chargeable days * 2 cents = 30,000
    expect(calculateStorageFee({ units: 500, daysAtViacura: 90 }).fee_cents).toBe(30_000);
  });

  it('returns chargeable_days for the UI', () => {
    expect(calculateStorageFee({ units: 100, daysAtViacura: 90 }).chargeable_days).toBe(30);
    expect(calculateStorageFee({ units: 100, daysAtViacura: 30 }).chargeable_days).toBe(0);
  });

  it('honors custom freeDays + cents per unit per day overrides', () => {
    // Practitioner-specific override: 30 free days, 5 cents/unit/day
    const r = calculateStorageFee({
      units: 100, daysAtViacura: 60,
      freeDays: 30, centsPerUnitDay: 5,
    });
    // chargeable = 30; 100 * 30 * 5 = 15,000
    expect(r.fee_cents).toBe(15_000);
    expect(r.chargeable_days).toBe(30);
  });

  it('returns zero when units is zero', () => {
    expect(calculateStorageFee({ units: 0, daysAtViacura: 365 }).fee_cents).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Low-inventory classifier
// ---------------------------------------------------------------------------

describe('classifyLowInventory', () => {
  it('exposes the spec thresholds (45 / 21 / 0 days)', () => {
    expect(LOW_INVENTORY_THRESHOLDS_DAYS).toEqual({ low: 45, urgent: 21, out: 0 });
  });

  it('returns out_of_stock when units <= 0', () => {
    expect(classifyLowInventory({ units_available: 0, daily_velocity: 5 }).status).toBe('out_of_stock');
    expect(classifyLowInventory({ units_available: -1, daily_velocity: 5 }).status).toBe('out_of_stock');
  });

  it('returns indeterminate when daily_velocity is zero (no recent sales)', () => {
    expect(classifyLowInventory({ units_available: 100, daily_velocity: 0 }).status).toBe('indeterminate');
  });

  it('returns urgent when projected days < 21', () => {
    // 50 units / 5 per day = 10 days
    const r = classifyLowInventory({ units_available: 50, daily_velocity: 5 });
    expect(r.status).toBe('urgent');
    expect(r.days_remaining).toBe(10);
  });

  it('returns low when projected days between 21 and 45', () => {
    // 150 / 5 = 30 days
    expect(classifyLowInventory({ units_available: 150, daily_velocity: 5 }).status).toBe('low');
  });

  it('returns ok when projected days >= 45', () => {
    // 300 / 5 = 60 days
    expect(classifyLowInventory({ units_available: 300, daily_velocity: 5 }).status).toBe('ok');
  });

  it('boundary at 21 days is urgent (inclusive)', () => {
    expect(classifyLowInventory({ units_available: 21, daily_velocity: 1 }).status).toBe('low');
    expect(classifyLowInventory({ units_available: 20, daily_velocity: 1 }).status).toBe('urgent');
  });

  it('reorder_recommended_units suggests 90 to 120 days of velocity (we use 105)', () => {
    const r = classifyLowInventory({ units_available: 50, daily_velocity: 5 });
    expect(r.reorder_recommended_units).toBe(105 * 5);
  });
});

// ---------------------------------------------------------------------------
// Expiration classifier
// ---------------------------------------------------------------------------

describe('classifyExpiration', () => {
  const today = new Date('2026-04-19T00:00:00.000Z');

  it('exposes spec thresholds (180 / 90 / 30)', () => {
    expect(EXPIRATION_THRESHOLDS_DAYS).toEqual({ approaching: 180, warning: 90, urgent: 30 });
  });

  function inDays(d: number): string {
    const dt = new Date(today.getTime() + d * 86_400_000);
    return dt.toISOString().slice(0, 10);
  }

  it('returns expired when expiration date has passed', () => {
    const r = classifyExpiration({ expiration_date: inDays(-1), now: today });
    expect(r.status).toBe('expired');
    expect(r.days_until_expiration).toBeLessThan(0);
  });

  it('returns urgent at 30 days or less', () => {
    expect(classifyExpiration({ expiration_date: inDays(15), now: today }).status).toBe('urgent');
    expect(classifyExpiration({ expiration_date: inDays(30), now: today }).status).toBe('urgent');
  });

  it('returns warning at 31 to 90 days', () => {
    expect(classifyExpiration({ expiration_date: inDays(60), now: today }).status).toBe('warning');
    expect(classifyExpiration({ expiration_date: inDays(90), now: today }).status).toBe('warning');
  });

  it('returns approaching at 91 to 180 days', () => {
    expect(classifyExpiration({ expiration_date: inDays(120), now: today }).status).toBe('approaching');
    expect(classifyExpiration({ expiration_date: inDays(180), now: today }).status).toBe('approaching');
  });

  it('returns ok past 180 days', () => {
    expect(classifyExpiration({ expiration_date: inDays(365), now: today }).status).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// FEFO fulfillment
// ---------------------------------------------------------------------------

describe('pickLotsFefo', () => {
  function lot(id: string, units: number, expIso: string): FefoLot {
    return { lot_id: id, units_available: units, expiration_date: expIso };
  }

  it('picks from the earliest expiring lot first', () => {
    const lots = [
      lot('L1', 50, '2027-12-01'),
      lot('L2', 50, '2027-06-01'),  // earliest
      lot('L3', 50, '2027-09-01'),
    ];
    const picks = pickLotsFefo(lots, 30);
    expect(picks).toEqual([{ lot_id: 'L2', units: 30 }]);
  });

  it('rolls into the next lot when one runs out', () => {
    const lots = [
      lot('L1', 30, '2027-06-01'),
      lot('L2', 50, '2027-09-01'),
      lot('L3', 50, '2027-12-01'),
    ];
    const picks = pickLotsFefo(lots, 60);
    expect(picks).toEqual([
      { lot_id: 'L1', units: 30 },
      { lot_id: 'L2', units: 30 },
    ]);
  });

  it('returns the maximum it can satisfy when total is short', () => {
    const lots = [lot('L1', 10, '2027-06-01')];
    const picks = pickLotsFefo(lots, 20);
    expect(picks).toEqual([{ lot_id: 'L1', units: 10 }]);
  });

  it('skips expired lots', () => {
    const lots = [
      { ...lot('LX', 100, '2024-01-01'), expired: true },
      lot('L2', 50, '2027-06-01'),
    ];
    const picks = pickLotsFefo(lots, 30);
    expect(picks).toEqual([{ lot_id: 'L2', units: 30 }]);
  });

  it('returns empty array when no lots available', () => {
    expect(pickLotsFefo([], 10)).toEqual([]);
  });

  it('returns empty array when units requested is zero or negative', () => {
    const lots = [lot('L1', 100, '2027-06-01')];
    expect(pickLotsFefo(lots, 0)).toEqual([]);
    expect(pickLotsFefo(lots, -5)).toEqual([]);
  });
});
