// Prompt 211a W4-1 - Tests for recommend.ts (cadence recommendation pure logic).
// TDD: written RED first, then implementation made them GREEN.
//
// recommendCadence suggests a gentle, opt-in rhythm from the user's own scan
// history. The reminder time of day defaults to the user's HISTORICAL scan time,
// never a hardcoded generic. The clock is injected (nowMs), so the function is
// pure and deterministic. It never nags: the result is a suggestion, and it is
// honest (UNKNOWN / null) when history is too thin to recommend anything.

import { describe, it, expect } from 'vitest';
import {
  recommendCadence,
  MIN_HISTORY_FOR_CADENCE,
  type ScanHistoryEntry,
} from '../recommend';

const NO_DASHES = /^[^–—]*$/;

// Roughly weekly scans, all in the morning.
const WEEKLY_MORNING: ScanHistoryEntry[] = [
  { scanDate: '2026-06-05', timeOfDay: 'morning' },
  { scanDate: '2026-06-12', timeOfDay: 'morning' },
  { scanDate: '2026-06-19', timeOfDay: 'morning' },
  { scanDate: '2026-06-26', timeOfDay: 'morning' },
];

// nowMs fixed at 2026-07-01 UTC for determinism.
const NOW_MS = Date.UTC(2026, 6, 1);

describe('recommendCadence', () => {
  it('recommends a weekly rhythm when the user scans about every 7 days', () => {
    const rec = recommendCadence(WEEKLY_MORNING, NOW_MS);
    expect(rec).not.toBeNull();
    expect(rec?.rhythm).toBe('weekly');
    expect(rec?.reason).toMatch(NO_DASHES);
  });

  it('recommends a biweekly rhythm when the user scans about every 14 days', () => {
    const biweekly: ScanHistoryEntry[] = [
      { scanDate: '2026-05-01', timeOfDay: 'evening' },
      { scanDate: '2026-05-15', timeOfDay: 'evening' },
      { scanDate: '2026-05-29', timeOfDay: 'evening' },
      { scanDate: '2026-06-12', timeOfDay: 'evening' },
    ];
    const rec = recommendCadence(biweekly, NOW_MS);
    expect(rec?.rhythm).toBe('biweekly');
  });

  it('defaults the reminder time of day to the user historical scan time, not a generic', () => {
    const afternoonScanner: ScanHistoryEntry[] = [
      { scanDate: '2026-06-05', timeOfDay: 'afternoon' },
      { scanDate: '2026-06-12', timeOfDay: 'afternoon' },
      { scanDate: '2026-06-19', timeOfDay: 'afternoon' },
      { scanDate: '2026-06-26', timeOfDay: 'morning' },
    ];
    const rec = recommendCadence(afternoonScanner, NOW_MS);
    // Afternoon dominates their history, so that is the default reminder time.
    expect(rec?.defaultReminderTimeOfDay).toBe('afternoon');
  });

  it('sets nextDueDate one rhythm-length after the most recent scan', () => {
    const rec = recommendCadence(WEEKLY_MORNING, NOW_MS);
    // Last scan 2026-06-26, weekly -> next due 2026-07-03.
    expect(rec?.nextDueDate).toBe('2026-07-03');
  });

  it('returns null honestly when history is too thin to recommend a rhythm', () => {
    const thin = WEEKLY_MORNING.slice(0, MIN_HISTORY_FOR_CADENCE - 1);
    expect(recommendCadence(thin, NOW_MS)).toBeNull();
    expect(recommendCadence([], NOW_MS)).toBeNull();
  });

  it('is a gentle opt-in suggestion, never a nag (isSuggestion flag set, dash-free reason)', () => {
    const rec = recommendCadence(WEEKLY_MORNING, NOW_MS);
    expect(rec?.isSuggestion).toBe(true);
    expect(rec?.reason).toMatch(NO_DASHES);
    expect(rec?.reason.length).toBeGreaterThan(0);
  });

  it('is deterministic: the injected clock alone drives nextDueDate (no Date.now)', () => {
    const a = recommendCadence(WEEKLY_MORNING, NOW_MS);
    const b = recommendCadence(WEEKLY_MORNING, NOW_MS);
    expect(a).toEqual(b);
  });

  it('exposes the minimum history constant', () => {
    expect(MIN_HISTORY_FOR_CADENCE).toBeGreaterThan(1);
  });
});
