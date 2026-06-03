// Prompt 172e Phase D Workstream 2: caffeine overlay pure helper tests.
//
// Spec section 6 + 10: overlay uses the 171b 5 hour half life formula
// (caffeine_mg * 0.5^(hours_since / 5)). Pure function; tests pin the
// math, the sleep window rollover, and the zero / dropout cases.

import { describe, it, expect } from 'vitest';
import {
  buildCaffeineOverlay,
  nextSleepOnsetIso,
  type CaffeineOverlayEvent,
} from '../caffeine-overlay-math';

describe('Prompt 172e Phase D nextSleepOnsetIso', () => {
  it('returns same day 23:00 when now is 14:00', () => {
    const result = nextSleepOnsetIso('2026-06-03T14:00:00.000Z', '23:00');
    expect(result).toBe('2026-06-03T23:00:00.000Z');
  });

  it('rolls to next day when now is past 23:00', () => {
    const result = nextSleepOnsetIso('2026-06-03T23:30:00.000Z', '23:00');
    expect(result).toBe('2026-06-04T23:00:00.000Z');
  });

  it('handles HH:MM:SS input', () => {
    const result = nextSleepOnsetIso('2026-06-03T14:00:00.000Z', '23:00:00');
    expect(result).toBe('2026-06-03T23:00:00.000Z');
  });

  it('returns the now ISO when sleep start malformed (defensive fallback)', () => {
    const result = nextSleepOnsetIso('2026-06-03T14:00:00.000Z', 'not-a-time');
    expect(result).toBe('2026-06-03T14:00:00.000Z');
  });
});

describe('Prompt 172e Phase D buildCaffeineOverlay empty + dropout cases', () => {
  it('returns empty markers + 0 totals for empty events', () => {
    const result = buildCaffeineOverlay([], '2026-06-03T14:00:00.000Z', '23:00');
    expect(result.markers).toEqual([]);
    expect(result.total_caffeine_logged_today_mg).toBe(0);
    expect(result.sleep_indicator?.total_mg_remaining_at_sleep).toBe(0);
  });

  it('drops events with non finite or non positive caffeine_mg', () => {
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm1', caffeine_mg: 0, logged_at: '2026-06-03T08:00:00.000Z' },
      { meal_id: 'm2', caffeine_mg: -10, logged_at: '2026-06-03T08:00:00.000Z' },
      { meal_id: 'm3', caffeine_mg: Number.NaN, logged_at: '2026-06-03T08:00:00.000Z' },
    ];
    const result = buildCaffeineOverlay(events, '2026-06-03T14:00:00.000Z', '23:00');
    expect(result.markers).toEqual([]);
    expect(result.total_caffeine_logged_today_mg).toBe(0);
  });

  it('drops events with empty logged_at', () => {
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm1', caffeine_mg: 95, logged_at: '' },
    ];
    const result = buildCaffeineOverlay(events, '2026-06-03T14:00:00.000Z', '23:00');
    expect(result.markers).toEqual([]);
  });
});

describe('Prompt 172e Phase D buildCaffeineOverlay marker math', () => {
  it('coffee logged 5h ago at 95 mg shows ~48 mg remaining now (one half life)', () => {
    // 95 * 0.5^(5/5) = 95 * 0.5 = 47.5 -> rounds to 48
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm1', caffeine_mg: 95, logged_at: '2026-06-03T08:00:00.000Z' },
    ];
    const result = buildCaffeineOverlay(events, '2026-06-03T13:00:00.000Z', '23:00');
    expect(result.markers).toHaveLength(1);
    expect(result.markers[0].mg_remaining_now).toBe(48);
    expect(result.markers[0].hours_since_logged).toBe(5);
  });

  it('coffee logged 0h ago shows full 95 mg remaining', () => {
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm1', caffeine_mg: 95, logged_at: '2026-06-03T14:00:00.000Z' },
    ];
    const result = buildCaffeineOverlay(events, '2026-06-03T14:00:00.000Z', '23:00');
    expect(result.markers[0].mg_remaining_now).toBe(95);
    expect(result.markers[0].hours_since_logged).toBe(0);
  });

  it('coffee logged 10h ago shows ~24 mg remaining (two half lives)', () => {
    // 95 * 0.5^2 = 23.75 -> rounds to 24
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm1', caffeine_mg: 95, logged_at: '2026-06-03T04:00:00.000Z' },
    ];
    const result = buildCaffeineOverlay(events, '2026-06-03T14:00:00.000Z', '23:00');
    expect(result.markers[0].mg_remaining_now).toBe(24);
  });

  it('sorts markers ascending by logged_at', () => {
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm2', caffeine_mg: 50, logged_at: '2026-06-03T12:00:00.000Z' },
      { meal_id: 'm1', caffeine_mg: 95, logged_at: '2026-06-03T08:00:00.000Z' },
      { meal_id: 'm3', caffeine_mg: 175, logged_at: '2026-06-03T15:00:00.000Z' },
    ];
    const result = buildCaffeineOverlay(events, '2026-06-03T16:00:00.000Z', '23:00');
    expect(result.markers.map((m) => m.meal_id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('sums total_caffeine_logged_today_mg across all events', () => {
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm1', caffeine_mg: 95, logged_at: '2026-06-03T08:00:00.000Z' },
      { meal_id: 'm2', caffeine_mg: 50, logged_at: '2026-06-03T12:00:00.000Z' },
      { meal_id: 'm3', caffeine_mg: 175, logged_at: '2026-06-03T15:00:00.000Z' },
    ];
    const result = buildCaffeineOverlay(events, '2026-06-03T16:00:00.000Z', '23:00');
    expect(result.total_caffeine_logged_today_mg).toBe(95 + 50 + 175);
  });
});

describe('Prompt 172e Phase D buildCaffeineOverlay sleep window math', () => {
  it('coffee at 14:00 with sleep at 23:00 (9h away) shows ~26 mg remaining at sleep', () => {
    // 95 * 0.5^(9/5) = 95 * 0.2872 = ~27.28 -> rounds to 27
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm1', caffeine_mg: 95, logged_at: '2026-06-03T14:00:00.000Z' },
    ];
    const result = buildCaffeineOverlay(events, '2026-06-03T14:00:00.000Z', '23:00');
    expect(result.sleep_indicator).toBeTruthy();
    expect(result.sleep_indicator!.sleep_start_iso).toBe('2026-06-03T23:00:00.000Z');
    expect(result.sleep_indicator!.total_mg_remaining_at_sleep).toBe(27);
  });

  it('aggregates remaining across multiple caffeine events at sleep onset', () => {
    // Morning 95mg coffee at 06:00 -> 17h to sleep -> 95 * 0.5^(17/5) = 9.00 mg remaining
    // Afternoon 50mg tea at 14:00 -> 9h to sleep -> 50 * 0.5^(9/5) = 14.36 mg remaining
    // Total at sleep 23.36 -> Math.round -> 23
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm1', caffeine_mg: 95, logged_at: '2026-06-03T06:00:00.000Z' },
      { meal_id: 'm2', caffeine_mg: 50, logged_at: '2026-06-03T14:00:00.000Z' },
    ];
    const result = buildCaffeineOverlay(events, '2026-06-03T14:00:00.000Z', '23:00');
    expect(result.sleep_indicator!.total_mg_remaining_at_sleep).toBe(23);
  });
});

describe('Prompt 172e Phase D buildCaffeineOverlay determinism', () => {
  it('returns identical output for identical input', () => {
    const events: CaffeineOverlayEvent[] = [
      { meal_id: 'm1', caffeine_mg: 95, logged_at: '2026-06-03T08:00:00.000Z' },
    ];
    const a = buildCaffeineOverlay(events, '2026-06-03T14:00:00.000Z', '23:00');
    const b = buildCaffeineOverlay(events, '2026-06-03T14:00:00.000Z', '23:00');
    expect(a).toEqual(b);
  });
});
