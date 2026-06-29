/**
 * src/components/journey/coaching/__tests__/useJourneyGraphSeries.test.ts
 *
 * TDD for the pure functions in useJourneyGraphSeries (Prompt 208k Task T2 REWORK).
 *
 * The hook recomputes each past day with the Dashboard scoring engine so history
 * equals the Dashboard gauges. The two pure pieces under test are:
 *   - computeDayPillars: per-day check-in + meals -> 5 wellness pillars, mirroring
 *     src/hooks/journey/useDailyScores.ts (mapCheckInToScoringInput ->
 *     calculateDailyScores + meal_score nutrition override). A no-data pillar is
 *     null (a gap), never 0.
 *   - buildSeriesFromRows: per-bucket assembly aligned to the T1 window, with
 *     bio_optimization_history.score as the overall line, honest null hydration
 *     for past days, today overlay, and 1Y monthly aggregation.
 *
 * Expectations for the engine-derived pillars are derived by reusing
 * calculateDailyScores + mapCheckInToScoringInput (not by duplicating the
 * override), plus concrete hardcoded values where the override applies.
 *
 * No Date.now() or argless new Date() in tests. Today is injected.
 */

import { describe, it, expect } from 'vitest';
import {
  computeDayPillars,
  buildSeriesFromRows,
  safeRead,
  fetchSeriesData,
  PILLAR_KEYS,
  type JourneyCheckinRow,
  type JourneyMealRow,
  type BioHistoryRow,
  type TodayOverlay,
} from '../useJourneyGraphSeries';
import { windowFor } from '../journeyGraphWindow';
import {
  calculateDailyScores,
  mapCheckInToScoringInput,
} from '@/lib/scoring/dailyScoreEngineV2';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A populated check-in row producing known per-pillar scores. */
function checkin(date: string, overrides: Partial<JourneyCheckinRow> = {}): JourneyCheckinRow {
  return {
    check_in_date: date,
    sleep_hours: 8,
    sleep_quality_score: 8,
    energy_recovery_score: 7,
    stress_level_score: 4,
    cardio_active: true,
    cardio_duration_min: 30,
    resistance_active: false,
    resistance_duration_min: null,
    activity_level_score: 6,
    ...overrides,
  };
}

/** An empty check-in row (all score fields null, no exercise). */
function emptyCheckin(date: string): JourneyCheckinRow {
  return {
    check_in_date: date,
    sleep_hours: null,
    sleep_quality_score: null,
    energy_recovery_score: null,
    stress_level_score: null,
    cardio_active: false,
    cardio_duration_min: null,
    resistance_active: false,
    resistance_duration_min: null,
    activity_level_score: null,
  };
}

function meal(date: string, overrides: Partial<JourneyMealRow> = {}): JourneyMealRow {
  return {
    meal_date: date,
    meal_type: 'breakfast',
    calories: 400,
    protein_g: 20,
    carbs_g: 40,
    fat_g: 10,
    quality_rating: null,
    meal_score: null,
    ...overrides,
  };
}

function bio(date: string, score: number): BioHistoryRow {
  return { date, score };
}

/**
 * Derive the four non-nutrition pillars purely from the engine (reuses
 * calculateDailyScores + mapCheckInToScoringInput) so computeDayPillars can be
 * verified against the same path the Dashboard uses, with no meals involved.
 */
function engineNonNutritionPillars(cr: JourneyCheckinRow | null) {
  const checkinData = cr
    ? mapCheckInToScoringInput(cr as unknown as Record<string, unknown>)
    : null;
  const r = calculateDailyScores(checkinData, null, null);
  return {
    sleep: r.sleep.confidence > 0 ? r.sleep.score : null,
    energy: r.energy.confidence > 0 ? r.energy.score : null,
    mood: r.moodStress.confidence > 0 ? r.moodStress.score : null,
    activity: r.activity.confidence > 0 ? r.activity.score : null,
  };
}

function noZeros(series: Record<string, (number | null)[]>): boolean {
  return PILLAR_KEYS.every((k) => (series[k] ?? []).every((v) => v !== 0));
}

// ===========================================================================
// computeDayPillars
// ===========================================================================

describe('computeDayPillars - engine parity (no meals)', () => {
  const cr = checkin('2026-06-22');

  it('matches the engine-derived sleep/energy/mood/activity pillars', () => {
    const expected = engineNonNutritionPillars(cr);
    const dp = computeDayPillars(cr, []);
    expect(dp.sleep).toBe(expected.sleep);
    expect(dp.energy).toBe(expected.energy);
    expect(dp.mood).toBe(expected.mood);
    expect(dp.activity).toBe(expected.activity);
  });

  it('produces the expected concrete values', () => {
    const dp = computeDayPillars(cr, []);
    // sleep: 8h in [7,9] -> 100; quality 8 -> 80; avg 90
    expect(dp.sleep).toBe(90);
    // energy 7 -> 70
    expect(dp.energy).toBe(70);
    // stress 4 -> 100 - 40 = 60
    expect(dp.mood).toBe(60);
    // activity: dur 30 -> 50, intensity 6 -> 60, +20, /3 -> 43
    expect(dp.activity).toBe(43);
  });

  it('nutrition is null when there are no meals', () => {
    const dp = computeDayPillars(cr, []);
    expect(dp.nutrition).toBe(null);
  });
});

describe('computeDayPillars - null and empty check-ins (gaps, never 0)', () => {
  it('null check-in with no meals yields all null pillars', () => {
    const dp = computeDayPillars(null, []);
    expect(dp.sleep).toBe(null);
    expect(dp.energy).toBe(null);
    expect(dp.mood).toBe(null);
    expect(dp.nutrition).toBe(null);
    expect(dp.activity).toBe(null);
  });

  it('null check-in never emits 0 for any pillar', () => {
    const dp = computeDayPillars(null, []);
    Object.values(dp).forEach((v) => expect(v).not.toBe(0));
  });

  it('empty check-in yields null sleep/energy/mood/nutrition but activity floor 15', () => {
    // The engine maps a check-in with no exercise to exercise_type "none",
    // which scores a fixed 15 (mirrors the Dashboard). Sleep/energy/mood/nutrition
    // remain null gaps.
    const dp = computeDayPillars(emptyCheckin('2026-06-22'), []);
    expect(dp.sleep).toBe(null);
    expect(dp.energy).toBe(null);
    expect(dp.mood).toBe(null);
    expect(dp.nutrition).toBe(null);
    expect(dp.activity).toBe(15);
  });

  it('sleep is null when only sleep fields are missing on an otherwise present check-in', () => {
    const cr = checkin('2026-06-22', { sleep_hours: null, sleep_quality_score: null });
    const dp = computeDayPillars(cr, []);
    expect(dp.sleep).toBe(null);
    // energy still present
    expect(dp.energy).toBe(70);
  });
});

describe('computeDayPillars - meal_score nutrition override', () => {
  const cr = checkin('2026-06-22');

  it('nutrition equals the average of meal_score values', () => {
    const meals = [
      meal('2026-06-22', { meal_type: 'breakfast', meal_score: 80 }),
      meal('2026-06-22', { meal_type: 'lunch', meal_score: 60 }),
    ];
    const dp = computeDayPillars(cr, meals);
    expect(dp.nutrition).toBe(70); // (80 + 60) / 2
  });

  it('falls back to quality_rating * 25 when no meal_score present', () => {
    const meals = [meal('2026-06-22', { meal_type: 'breakfast', quality_rating: 4, meal_score: null })];
    const dp = computeDayPillars(cr, meals);
    expect(dp.nutrition).toBe(100); // 4 * 25
  });

  it('clamps quality_rating * 25 to 100', () => {
    const meals = [meal('2026-06-22', { quality_rating: 5, meal_score: null })];
    const dp = computeDayPillars(cr, meals);
    expect(dp.nutrition).toBe(100); // 5 * 25 = 125 clamped to 100
  });

  it('nutrition present, other pillars unchanged by the override', () => {
    const meals = [meal('2026-06-22', { meal_score: 90 })];
    const dp = computeDayPillars(cr, meals);
    expect(dp.nutrition).toBe(90);
    expect(dp.sleep).toBe(90);
    expect(dp.energy).toBe(70);
    expect(dp.mood).toBe(60);
    expect(dp.activity).toBe(43);
  });

  it('null check-in + meals yields only nutrition (others null)', () => {
    const meals = [meal('2026-06-22', { meal_score: 80 })];
    const dp = computeDayPillars(null, meals);
    expect(dp.nutrition).toBe(80);
    expect(dp.sleep).toBe(null);
    expect(dp.energy).toBe(null);
    expect(dp.mood).toBe(null);
    expect(dp.activity).toBe(null);
  });
});

describe('computeDayPillars - deterministic', () => {
  it('same input produces identical output', () => {
    const cr = checkin('2026-06-22');
    const meals = [meal('2026-06-22', { meal_score: 70 })];
    expect(computeDayPillars(cr, meals)).toEqual(computeDayPillars(cr, meals));
  });
});

// ===========================================================================
// buildSeriesFromRows - daily ranges
// ===========================================================================

describe('buildSeriesFromRows - empty input', () => {
  const today = '2026-06-28';
  const win = windowFor('1W', 0, today);

  it('no rows: past check-in pillars dip to 0; nutrition/hydration/overall and today stay null', () => {
    // today 2026-06-28 is the last bucket (idx 6); idx 0..5 are past days.
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1W', today, undefined);
    for (let i = 0; i < 6; i++) {
      // Past missed check-in pillars dip to 0 so the line stays connected.
      expect(series.sleep[i]).toBe(0);
      expect(series.energy[i]).toBe(0);
      expect(series.mood[i]).toBe(0);
      expect(series.activity[i]).toBe(0);
      // Nutrition, overall, and hydration never dip: honest null gaps.
      expect(series.nutrition[i]).toBe(null);
      expect(series.overall[i]).toBe(null);
      expect(series.hydration[i]).toBe(null);
    }
    // Today (idx 6) is never dipped: all pillars null with no data and no overlay.
    PILLAR_KEYS.forEach((k) => expect(series[k][6]).toBe(null));
  });

  it('series length equals buckets.length for every pillar', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1W', today, undefined);
    PILLAR_KEYS.forEach((k) => expect(series[k].length).toBe(win.buckets.length));
  });

  it('never emits 0 for the non-dipped pillars or for today on empty input', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1W', today, undefined);
    // nutrition, overall, and hydration never dip, so they are never 0 anywhere.
    (['nutrition', 'overall', 'hydration'] as const).forEach((k) => {
      expect(series[k].every((v) => v !== 0)).toBe(true);
    });
    // Today's bucket (idx 6) is never dipped for any pillar.
    PILLAR_KEYS.forEach((k) => expect(series[k][6]).not.toBe(0));
  });
});

describe('buildSeriesFromRows - daily join 1W', () => {
  const today = '2026-06-28';
  const win = windowFor('1W', 0, today);
  // Buckets: 2026-06-22 (idx 0) to 2026-06-28 (idx 6).

  it('sleep value present at the bucket matching the check-in date', () => {
    const series = buildSeriesFromRows(win.buckets, [checkin('2026-06-22')], [], [], '1W', today, undefined);
    expect(series.sleep[0]).toBe(90);
  });

  it('sleep dips to 0 on a past bucket with no check-in', () => {
    // idx 1 is 2026-06-23, a past day (< today 2026-06-28) with no check-in.
    const series = buildSeriesFromRows(win.buckets, [checkin('2026-06-22')], [], [], '1W', today, undefined);
    expect(series.sleep[1]).toBe(0);
    // overall is not a check-in pillar, so it stays an honest null gap.
    expect(series.overall[1]).toBe(null);
  });

  it('all five engine pillars populate the matching bucket', () => {
    const series = buildSeriesFromRows(win.buckets, [checkin('2026-06-22')], [meal('2026-06-22', { meal_score: 88 })], [], '1W', today, undefined);
    expect(series.sleep[0]).toBe(90);
    expect(series.energy[0]).toBe(70);
    expect(series.mood[0]).toBe(60);
    expect(series.nutrition[0]).toBe(88);
    expect(series.activity[0]).toBe(43);
  });

  it('overall comes from bio_optimization_history.score by date', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], [bio('2026-06-22', 77)], '1W', today, undefined);
    expect(series.overall[0]).toBe(77);
    expect(series.overall[1]).toBe(null);
  });

  it('hydration is a null gap for all past buckets', () => {
    const series = buildSeriesFromRows(
      win.buckets,
      win.buckets.map((b) => checkin(b.date)),
      [],
      win.buckets.map((b) => bio(b.date, 70)),
      '1W',
      today,
      undefined, // no overlay -> today is also a gap for hydration
    );
    expect(series.hydration.every((v) => v === null)).toBe(true);
  });
});

describe('buildSeriesFromRows - rows outside the window are ignored', () => {
  const today = '2026-06-28';
  const win = windowFor('1W', 0, today);

  it('check-in before rangeStart contributes to no bucket', () => {
    // 2026-06-21 is before the window, so its real value (90) must never appear.
    const series = buildSeriesFromRows(win.buckets, [checkin('2026-06-21')], [], [], '1W', today, undefined);
    expect(series.sleep).not.toContain(90);
    // With no in-window check-in, every past bucket dips to 0 and today stays null.
    for (let i = 0; i < 6; i++) expect(series.sleep[i]).toBe(0);
    expect(series.sleep[6]).toBe(null);
  });

  it('meal after rangeEnd contributes to no bucket', () => {
    const series = buildSeriesFromRows(win.buckets, [], [meal('2026-06-29', { meal_score: 90 })], [], '1W', today, undefined);
    expect(series.nutrition.every((v) => v === null)).toBe(true);
  });

  it('bio row outside the window contributes to no bucket', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], [bio('2026-06-21', 80)], '1W', today, undefined);
    expect(series.overall.every((v) => v === null)).toBe(true);
  });
});

describe('buildSeriesFromRows - today overlay (1W)', () => {
  const today = '2026-06-28';
  const win = windowFor('1W', 0, today);
  // today is the last bucket (idx 6).

  const overlay: TodayOverlay = {
    sleep: 85, energy: 70, mood: 65, nutrition: 78, activity: 60, overall: 72, hydration: 55,
  };

  it('today bucket receives every overlay value', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1W', today, overlay);
    expect(series.sleep[6]).toBe(85);
    expect(series.energy[6]).toBe(70);
    expect(series.mood[6]).toBe(65);
    expect(series.nutrition[6]).toBe(78);
    expect(series.activity[6]).toBe(60);
    expect(series.overall[6]).toBe(72);
    expect(series.hydration[6]).toBe(55);
  });

  it('past buckets do not receive the today overlay (check-in pillars dip to 0, others null)', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1W', today, overlay);
    for (let i = 0; i < 6; i++) {
      // The overlay values (85/70/65/60) must not leak into past buckets; the
      // four check-in pillars dip to 0 instead.
      expect(series.sleep[i]).toBe(0);
      expect(series.energy[i]).toBe(0);
      expect(series.mood[i]).toBe(0);
      expect(series.activity[i]).toBe(0);
      // The non-dipped pillars stay honest null gaps (not the overlay 78/72/55).
      expect(series.nutrition[i]).toBe(null);
      expect(series.overall[i]).toBe(null);
      expect(series.hydration[i]).toBe(null);
    }
  });

  it('overlay patches only the bucket matching today (mid-window today)', () => {
    // today 2026-06-25 -> idx 3 in the 06-22..06-28 window.
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1W', '2026-06-25', overlay);
    expect(series.sleep[3]).toBe(85);
    expect(series.sleep[6]).toBe(null);
  });

  it('null overlay field falls back to the recomputed stored value', () => {
    const series = buildSeriesFromRows(
      win.buckets,
      [checkin(today)],
      [],
      [bio(today, 80)],
      '1W',
      today,
      { sleep: null, overall: null },
    );
    // sleep overlay null -> fallback to computed 90; overall null -> fallback to bio 80.
    expect(series.sleep[6]).toBe(90);
    expect(series.overall[6]).toBe(80);
  });

  it('null overlay field with no stored data stays null on today (never 0)', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1W', today, {
      sleep: null, energy: null, mood: null, nutrition: null, activity: null, overall: null, hydration: null,
    });
    // Today (idx 6) is never dipped: a null overlay field with no data stays null.
    PILLAR_KEYS.forEach((k) => {
      expect(series[k][6]).toBe(null);
      expect(series[k][6]).not.toBe(0);
    });
  });
});

// ===========================================================================
// buildSeriesFromRows - 1M
// ===========================================================================

describe('buildSeriesFromRows - 1M', () => {
  const today = '2026-06-28';
  const win = windowFor('1M', 0, today); // June 2026, 30 day buckets.

  it('has one bucket per day of the month', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1M', today, undefined);
    PILLAR_KEYS.forEach((k) => expect(series[k].length).toBe(30));
  });

  it('joins a check-in to its day-of-month bucket', () => {
    const series = buildSeriesFromRows(win.buckets, [checkin('2026-06-10')], [], [], '1M', today, undefined);
    const idx = win.buckets.findIndex((b) => b.date === '2026-06-10');
    expect(series.sleep[idx]).toBe(90);
  });

  it('a past day with no data dips to 0 for the check-in pillars', () => {
    // today is 2026-06-28; 2026-06-11 is a past day with no check-in.
    const series = buildSeriesFromRows(win.buckets, [checkin('2026-06-10')], [], [], '1M', today, undefined);
    const idx = win.buckets.findIndex((b) => b.date === '2026-06-11');
    expect(series.sleep[idx]).toBe(0);
    // overall (bio) never dips, so it stays an honest null gap.
    expect(series.overall[idx]).toBe(null);
  });
});

// ===========================================================================
// buildSeriesFromRows - missed check-in dip (daily ranges, core new behavior)
// ===========================================================================

describe('buildSeriesFromRows - missed check-in dip (1M)', () => {
  // A controlled today gives a clean past / today / future split inside one month.
  // today 2026-06-15 is idx 14; past = idx 0..13, today = idx 14, future = idx 15..29.
  const today = '2026-06-15';
  const win = windowFor('1M', 0, today); // June 2026, 30 day buckets.
  const idxOf = (d: string) => win.buckets.findIndex((b) => b.date === d);
  // One stored check-in on a past day (2026-06-05); everything else is missing.
  const series = buildSeriesFromRows(win.buckets, [checkin('2026-06-05')], [], [], '1M', today, undefined);

  it('(a) a past day with no check-in dips sleep/energy/mood/activity to 0 and keeps the rest null', () => {
    const i = idxOf('2026-06-10');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(series.sleep[i]).toBe(0);
    expect(series.energy[i]).toBe(0);
    expect(series.mood[i]).toBe(0);
    expect(series.activity[i]).toBe(0);
    expect(series.nutrition[i]).toBe(null);
    expect(series.hydration[i]).toBe(null);
    expect(series.overall[i]).toBe(null);
  });

  it('(b) a past day WITH a check-in shows the real computed values, not 0', () => {
    const i = idxOf('2026-06-05');
    expect(series.sleep[i]).toBe(90);
    expect(series.energy[i]).toBe(70);
    expect(series.mood[i]).toBe(60);
    expect(series.activity[i]).toBe(43);
  });

  it('(c) the today bucket with no check-in stays all null (never dipped)', () => {
    const i = idxOf('2026-06-15');
    expect(i).toBeGreaterThanOrEqual(0);
    PILLAR_KEYS.forEach((k) => expect(series[k][i]).toBe(null));
  });

  it('(d) a future day in the current month stays null (never dipped)', () => {
    const i = idxOf('2026-06-20');
    expect(i).toBeGreaterThanOrEqual(0);
    PILLAR_KEYS.forEach((k) => expect(series[k][i]).toBe(null));
  });
});

describe('buildSeriesFromRows - missed check-in dip (1W)', () => {
  // today 2026-06-28 is the last bucket (idx 6); idx 0..5 are past days.
  const today = '2026-06-28';
  const win = windowFor('1W', 0, today);
  // One stored check-in on a past day (2026-06-23 = idx 1).
  const series = buildSeriesFromRows(win.buckets, [checkin('2026-06-23')], [], [], '1W', today, undefined);

  it('a past day with no check-in dips the four check-in pillars to 0, others null', () => {
    expect(series.sleep[0]).toBe(0); // 2026-06-22, past, no check-in
    expect(series.energy[0]).toBe(0);
    expect(series.mood[0]).toBe(0);
    expect(series.activity[0]).toBe(0);
    expect(series.nutrition[0]).toBe(null);
    expect(series.overall[0]).toBe(null);
    expect(series.hydration[0]).toBe(null);
  });

  it('a past day WITH a check-in shows the real computed values, not 0', () => {
    const i = win.buckets.findIndex((b) => b.date === '2026-06-23');
    expect(series.sleep[i]).toBe(90);
    expect(series.energy[i]).toBe(70);
    expect(series.mood[i]).toBe(60);
    expect(series.activity[i]).toBe(43);
  });

  it('the today bucket with no check-in stays all null (never dipped)', () => {
    PILLAR_KEYS.forEach((k) => expect(series[k][6]).toBe(null));
  });
});

// ===========================================================================
// buildSeriesFromRows - 1Y monthly aggregation
// ===========================================================================

describe('buildSeriesFromRows - 1Y monthly aggregation', () => {
  const today = '2026-06-28';
  const win = windowFor('1Y', 0, today);
  // Buckets: 2026-03 ... 2027-02 (12 monthly buckets; 3 history, current month
  // 2026-06 at index 3, then 8 ahead).

  it('series length is 12 for every pillar', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1Y', today, undefined);
    PILLAR_KEYS.forEach((k) => expect(series[k].length).toBe(12));
  });

  it('averages multiple days within a month for the sleep pillar', () => {
    // Two check-ins in 2026-08 (a month inside the forward window) with
    // different sleep scores.
    const cHigh = checkin('2026-08-05'); // sleep 90
    const cLow = checkin('2026-08-15', { sleep_quality_score: 6 }); // (100 + 60)/2 = 80
    const sleepHigh = computeDayPillars(cHigh, []).sleep as number;
    const sleepLow = computeDayPillars(cLow, []).sleep as number;
    const expected = Math.round((sleepHigh + sleepLow) / 2);

    const series = buildSeriesFromRows(win.buckets, [cHigh, cLow], [], [], '1Y', today, undefined);
    const augIdx = win.buckets.findIndex((b) => b.date === '2026-08');
    expect(augIdx).toBeGreaterThanOrEqual(0);
    expect(series.sleep[augIdx]).toBe(expected);
    expect(series.sleep[augIdx]).toBe(85); // concrete: (90 + 80)/2
  });

  it('averages bio_optimization_history per month for the overall pillar', () => {
    const bioRows = [bio('2026-09-05', 64), bio('2026-09-25', 80)];
    const series = buildSeriesFromRows(win.buckets, [], [], bioRows, '1Y', today, undefined);
    const sepIdx = win.buckets.findIndex((b) => b.date === '2026-09');
    expect(series.overall[sepIdx]).toBe(72); // (64 + 80)/2
  });

  it('a month with no data is null, not 0', () => {
    const series = buildSeriesFromRows(win.buckets, [checkin('2026-08-05')], [], [], '1Y', today, undefined);
    const octIdx = win.buckets.findIndex((b) => b.date === '2026-10');
    expect(series.sleep[octIdx]).toBe(null);
    expect(series.sleep[octIdx]).not.toBe(0);
  });

  it('hydration is null for all months without an overlay', () => {
    const series = buildSeriesFromRows(win.buckets, [checkin('2026-08-05')], [], [], '1Y', today, undefined);
    expect(series.hydration.every((v) => v === null)).toBe(true);
  });

  it('never emits 0 across the whole 1Y series', () => {
    const series = buildSeriesFromRows(win.buckets, [checkin('2026-08-05')], [], [bio('2026-08-05', 70)], '1Y', today, undefined);
    expect(noZeros(series)).toBe(true);
  });
});

describe('buildSeriesFromRows - 1Y today overlay joins the current month', () => {
  const today = '2026-06-28';
  const win = windowFor('1Y', 0, today);

  const overlay: TodayOverlay = {
    sleep: 88, energy: 74, mood: 68, nutrition: 82, activity: 65, overall: 77, hydration: 59,
  };

  it('current month bucket reflects the overlay when it is the only data point', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1Y', today, overlay);
    const junIdx = win.buckets.findIndex((b) => b.date === '2026-06');
    expect(junIdx).toBeGreaterThanOrEqual(0);
    expect(series.sleep[junIdx]).toBe(88);
    expect(series.overall[junIdx]).toBe(77);
    expect(series.hydration[junIdx]).toBe(59);
  });

  it('overlay averages with other days already in the current month', () => {
    // One stored check-in in June 2026 (sleep 90) plus today overlay sleep 88.
    const series = buildSeriesFromRows(win.buckets, [checkin('2026-06-10')], [], [], '1Y', today, overlay);
    const junIdx = win.buckets.findIndex((b) => b.date === '2026-06');
    // (90 + 88) / 2 = 89
    expect(series.sleep[junIdx]).toBe(89);
  });

  it('other months in the window are not affected by the overlay', () => {
    // Under the forward window the buckets are the current month plus future
    // months, so the overlay must touch only today's (current) month. Sep 2026
    // is a future month inside the window and must stay all null.
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1Y', today, overlay);
    const futIdx = win.buckets.findIndex((b) => b.date === '2026-09');
    expect(futIdx).toBeGreaterThanOrEqual(0);
    PILLAR_KEYS.forEach((k) => expect(series[k][futIdx]).toBe(null));
  });
});

// ===========================================================================
// Invariants
// ===========================================================================

describe('buildSeriesFromRows - series length invariant', () => {
  const today = '2026-06-28';

  it('1W: 7 values per pillar', () => {
    const win = windowFor('1W', 0, today);
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1W', today, undefined);
    PILLAR_KEYS.forEach((k) => expect(series[k]).toHaveLength(7));
  });

  it('1M June 2026: 30 values per pillar', () => {
    const win = windowFor('1M', 0, today);
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1M', today, undefined);
    PILLAR_KEYS.forEach((k) => expect(series[k]).toHaveLength(30));
  });

  it('1Y: 12 values per pillar', () => {
    const win = windowFor('1Y', 0, today);
    const series = buildSeriesFromRows(win.buckets, [], [], [], '1Y', today, undefined);
    PILLAR_KEYS.forEach((k) => expect(series[k]).toHaveLength(12));
  });
});

describe('buildSeriesFromRows - vitality_score never used', () => {
  it('PILLAR_KEYS does not include vitality_score', () => {
    expect(PILLAR_KEYS).not.toContain('vitality_score');
  });

  it('a check-in row has no vitality_score field', () => {
    const cr = checkin('2026-06-22');
    expect(Object.keys(cr)).not.toContain('vitality_score');
  });

  it('TodayOverlay has no vitality_score field', () => {
    const o: TodayOverlay = {
      sleep: 1, energy: 1, mood: 1, nutrition: 1, activity: 1, overall: 1, hydration: 1,
    };
    expect(Object.keys(o)).not.toContain('vitality_score');
  });
});

describe('buildSeriesFromRows - deterministic', () => {
  const today = '2026-06-28';
  const win = windowFor('1W', 0, today);
  const checkins = [checkin('2026-06-22'), checkin('2026-06-25', { sleep_quality_score: 6 })];
  const meals = [meal('2026-06-22', { meal_score: 70 })];
  const bios = [bio('2026-06-23', 65), bio('2026-06-28', 82)];
  const overlay: TodayOverlay = {
    sleep: 90, energy: 72, mood: 68, nutrition: 78, activity: 64, overall: 76, hydration: 58,
  };

  it('same input produces identical output', () => {
    const a = buildSeriesFromRows(win.buckets, checkins, meals, bios, '1W', today, overlay);
    const b = buildSeriesFromRows(win.buckets, checkins, meals, bios, '1W', today, overlay);
    PILLAR_KEYS.forEach((k) => expect(a[k]).toEqual(b[k]));
  });
});

// ===========================================================================
// safeRead - per-read fail-open primitive
// ===========================================================================

describe('safeRead', () => {
  it('returns rows with failed=false on success', async () => {
    const rows = [bio('2026-06-22', 70)];
    const out = await safeRead<BioHistoryRow>(() => Promise.resolve({ data: rows }), 5000, 'op');
    expect(out.failed).toBe(false);
    expect(out.rows).toEqual(rows);
  });

  it('coalesces null data to an empty array with failed=false (genuinely empty)', async () => {
    const out = await safeRead<BioHistoryRow>(() => Promise.resolve({ data: null }), 5000, 'op');
    expect(out.failed).toBe(false);
    expect(out.rows).toEqual([]);
  });

  it('returns failed=true with empty rows on a rejected read (no throw)', async () => {
    const out = await safeRead<BioHistoryRow>(() => Promise.reject(new Error('boom')), 5000, 'op');
    expect(out.failed).toBe(true);
    expect(out.rows).toEqual([]);
  });

  it('returns failed=true on a timeout (no throw)', async () => {
    // run never resolves within the 5ms timeout -> withTimeout rejects -> failed.
    const out = await safeRead<BioHistoryRow>(() => new Promise(() => {}), 5, 'op');
    expect(out.failed).toBe(true);
    expect(out.rows).toEqual([]);
  });
});

// ===========================================================================
// fetchSeriesData - concurrent reads + error semantics (item 1 + item 3)
// ===========================================================================

describe('fetchSeriesData - concurrency', () => {
  it('initiates all three reads concurrently, not sequentially', async () => {
    let started = 0;
    const makeRead = <T>(rows: T[]) => () => {
      started += 1;
      return Promise.resolve({ data: rows });
    };
    const promise = fetchSeriesData(
      {
        checkins: makeRead<JourneyCheckinRow>([]),
        meals: makeRead<JourneyMealRow>([]),
        bio: makeRead<BioHistoryRow>([]),
      },
      5000,
    );
    // All three run() are invoked synchronously while Promise.all builds its
    // array; sequential awaits would leave this at 1 here.
    expect(started).toBe(3);
    await promise;
  });
});

describe('fetchSeriesData - error semantics', () => {
  it('genuine empty (all reads succeed with no rows) -> error=false', async () => {
    const out = await fetchSeriesData(
      {
        checkins: () => Promise.resolve({ data: [] }),
        meals: () => Promise.resolve({ data: [] }),
        bio: () => Promise.resolve({ data: [] }),
      },
      5000,
    );
    expect(out.error).toBe(false);
    expect(out.checkinRows).toEqual([]);
    expect(out.mealRows).toEqual([]);
    expect(out.bioHistoryRows).toEqual([]);
  });

  it('all reads succeed with data -> error=false and rows pass through', async () => {
    const checkins = [checkin('2026-06-22')];
    const bios = [bio('2026-06-22', 80)];
    const out = await fetchSeriesData(
      {
        checkins: () => Promise.resolve({ data: checkins }),
        meals: () => Promise.resolve({ data: [] }),
        bio: () => Promise.resolve({ data: bios }),
      },
      5000,
    );
    expect(out.error).toBe(false);
    expect(out.checkinRows).toEqual(checkins);
    expect(out.bioHistoryRows).toEqual(bios);
  });

  it('one read failure -> error=true while the other reads still return their data (no throw)', async () => {
    const checkins = [checkin('2026-06-22')];
    const out = await fetchSeriesData(
      {
        checkins: () => Promise.resolve({ data: checkins }),
        meals: () => Promise.reject(new Error('meal outage')),
        bio: () => Promise.resolve({ data: [bio('2026-06-22', 70)] }),
      },
      5000,
    );
    expect(out.error).toBe(true);            // failure surfaced for T3
    expect(out.checkinRows).toEqual(checkins); // partial data preserved
    expect(out.mealRows).toEqual([]);          // failed read -> empty, not a throw
    expect(out.bioHistoryRows).toHaveLength(1);
  });

  it('a failed read combined with empty series still builds a valid series (no fabricated data)', async () => {
    const today = '2026-06-28';
    const win = windowFor('1W', 0, today);
    const out = await fetchSeriesData(
      {
        checkins: () => Promise.reject(new Error('down')),
        meals: () => Promise.reject(new Error('down')),
        bio: () => Promise.reject(new Error('down')),
      },
      5000,
    );
    expect(out.error).toBe(true);
    const series = buildSeriesFromRows(
      win.buckets,
      out.checkinRows,
      out.mealRows,
      out.bioHistoryRows,
      '1W',
      today,
      undefined,
    );
    // Fails open to a valid series: correct length, no fabricated real values.
    PILLAR_KEYS.forEach((k) => expect(series[k]).toHaveLength(win.buckets.length));
    // nutrition/overall/hydration never dip, so they are honest null gaps.
    (['nutrition', 'overall', 'hydration'] as const).forEach((k) =>
      expect(series[k].every((v) => v === null)).toBe(true),
    );
    // The four check-in pillars carry only honest gaps or the past-day 0 dip.
    (['sleep', 'energy', 'mood', 'activity'] as const).forEach((k) =>
      expect(series[k].every((v) => v === null || v === 0)).toBe(true),
    );
  });
});
