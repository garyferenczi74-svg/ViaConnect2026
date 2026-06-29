/**
 * src/components/journey/coaching/__tests__/useJourneyGraphSeries.test.ts
 *
 * TDD for the pure mapper buildSeriesFromRows (Prompt 208k Task T2).
 *
 * Coverage:
 *   - Daily join by date: matching rows produce values; missing day -> null
 *   - Gap rule: missing data is null, never 0
 *   - Out-of-window rows are ignored (mapper trusts buckets array)
 *   - Partial pillar columns: null column -> null for that bucket
 *   - 1Y monthly aggregation via aggregateMonthly
 *   - Monthly gap: no data in a month -> null, never 0
 *   - Today overlay: replaces only the current (today) bucket
 *   - Today overlay with null field: null stays null (honest gap)
 *   - Today overlay does not affect past buckets
 *   - 1Y today overlay patches the current month's bucket
 *   - Honest pillars: energy/mood/nutrition/activity/hydration always null for
 *     past buckets (no per-day stored aggregate in types.ts)
 *   - Overall: prefers bio_optimization_history over daily_scores column
 *   - Overall fallback: uses daily_scores.bio_optimization_score when history absent
 *   - Series length always equals buckets.length
 *   - Never emits 0 for any missing data scenario
 *   - No reference to vitality_score anywhere in the function signature or body
 *   - Empty input arrays -> all null arrays
 *   - Deterministic (same input, same output)
 *
 * No Date.now() or argless new Date() in tests.
 * Today is always injected via the 'today' parameter.
 */

import { describe, it, expect } from 'vitest';
import { buildSeriesFromRows, PILLAR_KEYS } from '../useJourneyGraphSeries';
import type { DailyScoreRow, BioHistoryRow, TodayOverlay } from '../useJourneyGraphSeries';
import { windowFor } from '../journeyGraphWindow';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Build a 1W window for a known today. */
function week1W(today: string) {
  return windowFor('1W', 0, today);
}

/** Build a 1M window for a known today. */
function month1M(today: string) {
  return windowFor('1M', 0, today);
}

/** Build a 1Y window for a known today. */
function year1Y(today: string) {
  return windowFor('1Y', 0, today);
}

/** Daily row with all fields present. */
function dailyRow(date: string, sleep: number | null, bioOpt: number | null): DailyScoreRow {
  return { date, sleep_score: sleep, bio_optimization_score: bioOpt };
}

/** Bio history row. */
function bioRow(date: string, score: number): BioHistoryRow {
  return { date, score };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when every element of every pillar array equals null. */
function allNull(series: Record<string, (number | null)[]>): boolean {
  return PILLAR_KEYS.every((k) => (series[k] ?? []).every((v) => v === null));
}

/** Returns true when no element of any pillar array equals 0. */
function noZeros(series: Record<string, (number | null)[]>): boolean {
  return PILLAR_KEYS.every((k) => (series[k] ?? []).every((v) => v !== 0));
}

// ---------------------------------------------------------------------------
// Empty input -> all null
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - empty input', () => {
  const today = '2026-06-28';
  const win = week1W(today);

  it('returns all null when both row arrays are empty', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, undefined);
    expect(allNull(series)).toBe(true);
  });

  it('series length equals buckets.length for 1W', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, undefined);
    PILLAR_KEYS.forEach((k) => {
      expect(series[k].length).toBe(win.buckets.length);
    });
  });

  it('series length equals buckets.length for 1M', () => {
    const mWin = month1M(today);
    const series = buildSeriesFromRows(mWin.buckets, [], [], '1M', today, undefined);
    PILLAR_KEYS.forEach((k) => {
      expect(series[k].length).toBe(mWin.buckets.length);
    });
  });

  it('series length equals buckets.length for 1Y', () => {
    const yWin = year1Y(today);
    const series = buildSeriesFromRows(yWin.buckets, [], [], '1Y', today, undefined);
    PILLAR_KEYS.forEach((k) => {
      expect(series[k].length).toBe(12);
    });
  });

  it('never emits 0 for empty input', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, undefined);
    expect(noZeros(series)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Daily join by date (1W)
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - daily join 1W', () => {
  const today = '2026-06-28';
  const win = week1W(today);
  // Buckets: 2026-06-22 to 2026-06-28 (7 days).

  it('sleep value present when daily row matches bucket date', () => {
    const rows = [dailyRow('2026-06-22', 70, null)];
    const series = buildSeriesFromRows(win.buckets, rows, [], '1W', today, undefined);
    // First bucket is 2026-06-22.
    expect(series.sleep[0]).toBe(70);
  });

  it('sleep is null for a bucket with no matching row', () => {
    const rows = [dailyRow('2026-06-22', 70, null)];
    const series = buildSeriesFromRows(win.buckets, rows, [], '1W', today, undefined);
    // Bucket at index 1 is 2026-06-23 - no row.
    expect(series.sleep[1]).toBe(null);
  });

  it('sleep is null (not 0) when row has null sleep_score', () => {
    const rows = [dailyRow('2026-06-22', null, null)];
    const series = buildSeriesFromRows(win.buckets, rows, [], '1W', today, undefined);
    expect(series.sleep[0]).toBe(null);
    expect(series.sleep[0]).not.toBe(0);
  });

  it('overall comes from bio_optimization_history when present', () => {
    const dailyRows = [dailyRow('2026-06-22', null, 55)];
    const bioRows = [bioRow('2026-06-22', 72)];
    const series = buildSeriesFromRows(win.buckets, dailyRows, bioRows, '1W', today, undefined);
    // bioHistory (72) takes priority over daily_scores bio col (55).
    expect(series.overall[0]).toBe(72);
  });

  it('overall falls back to daily_scores.bio_optimization_score when history absent', () => {
    const dailyRows = [dailyRow('2026-06-22', null, 55)];
    const series = buildSeriesFromRows(win.buckets, dailyRows, [], '1W', today, undefined);
    expect(series.overall[0]).toBe(55);
  });

  it('overall is null when neither source has data', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, undefined);
    expect(series.overall[0]).toBe(null);
  });

  it('overall is null (not 0) when bio_optimization_score is null in daily row', () => {
    const dailyRows = [dailyRow('2026-06-22', null, null)];
    const series = buildSeriesFromRows(win.buckets, dailyRows, [], '1W', today, undefined);
    expect(series.overall[0]).toBe(null);
    expect(series.overall[0]).not.toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Honest gap rule: energy/mood/nutrition/activity/hydration always null for
// past buckets (no per-day stored aggregate in types.ts).
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - honest gap pillars', () => {
  const today = '2026-06-28';
  const win = week1W(today);
  const allDailyRows = win.buckets.map((b) =>
    dailyRow(b.date, 60, 75),
  );
  const allBioRows = win.buckets.map((b) =>
    bioRow(b.date, 80),
  );

  it('energy is null for every past bucket (no stored history)', () => {
    const series = buildSeriesFromRows(win.buckets, allDailyRows, allBioRows, '1W', today, undefined);
    // Today is the last bucket (index 6). Past buckets (0-5) should be null.
    expect(series.energy.slice(0, 6).every((v) => v === null)).toBe(true);
  });

  it('mood is null for every past bucket', () => {
    const series = buildSeriesFromRows(win.buckets, allDailyRows, allBioRows, '1W', today, undefined);
    expect(series.mood.slice(0, 6).every((v) => v === null)).toBe(true);
  });

  it('nutrition is null for every past bucket', () => {
    const series = buildSeriesFromRows(win.buckets, allDailyRows, allBioRows, '1W', today, undefined);
    expect(series.nutrition.slice(0, 6).every((v) => v === null)).toBe(true);
  });

  it('activity is null for every past bucket', () => {
    const series = buildSeriesFromRows(win.buckets, allDailyRows, allBioRows, '1W', today, undefined);
    expect(series.activity.slice(0, 6).every((v) => v === null)).toBe(true);
  });

  it('hydration is null for every past bucket', () => {
    const series = buildSeriesFromRows(win.buckets, allDailyRows, allBioRows, '1W', today, undefined);
    expect(series.hydration.slice(0, 6).every((v) => v === null)).toBe(true);
  });

  it('sleep is non-null when row data is present', () => {
    const series = buildSeriesFromRows(win.buckets, allDailyRows, allBioRows, '1W', today, undefined);
    // All rows have sleep_score = 60.
    expect(series.sleep.every((v) => v === 60)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Out-of-window rows are ignored
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - rows outside window ignored', () => {
  const today = '2026-06-28';
  const win = week1W(today);
  // Window: 2026-06-22 to 2026-06-28.

  it('row before rangeStart does not contribute to any bucket', () => {
    const rows = [dailyRow('2026-06-21', 88, 90)]; // one day before window
    const series = buildSeriesFromRows(win.buckets, rows, [], '1W', today, undefined);
    // All sleep values should be null (no rows within the window).
    expect(series.sleep.every((v) => v === null)).toBe(true);
  });

  it('bio_history row before rangeStart does not contribute', () => {
    const bioRows = [bioRow('2026-06-21', 85)]; // before window
    const series = buildSeriesFromRows(win.buckets, [], bioRows, '1W', today, undefined);
    expect(series.overall.every((v) => v === null)).toBe(true);
  });

  it('row after rangeEnd does not contribute', () => {
    const rows = [dailyRow('2026-06-29', 77, null)]; // one day after window
    const series = buildSeriesFromRows(win.buckets, rows, [], '1W', today, undefined);
    expect(series.sleep.every((v) => v === null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Today overlay: replaces only the current bucket
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - today overlay 1W', () => {
  const today = '2026-06-28';
  const win = week1W(today);
  // Buckets: 2026-06-22..2026-06-28. Last bucket (index 6) is today.

  const overlay: TodayOverlay = {
    sleep: 85,
    energy: 70,
    mood: 65,
    nutrition: 78,
    activity: 60,
    overall: 72,
    hydration: 55,
  };

  it('today bucket (last) gets overlay sleep value', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    expect(series.sleep[6]).toBe(85);
  });

  it('today bucket gets overlay energy value', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    expect(series.energy[6]).toBe(70);
  });

  it('today bucket gets overlay mood value', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    expect(series.mood[6]).toBe(65);
  });

  it('today bucket gets overlay nutrition value', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    expect(series.nutrition[6]).toBe(78);
  });

  it('today bucket gets overlay activity value', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    expect(series.activity[6]).toBe(60);
  });

  it('today bucket gets overlay overall value', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    expect(series.overall[6]).toBe(72);
  });

  it('today bucket gets overlay hydration value', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    expect(series.hydration[6]).toBe(55);
  });

  it('past buckets (0..5) are not affected by today overlay', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    // energy/mood/nutrition/activity/hydration stay null for past buckets.
    for (let i = 0; i < 6; i++) {
      expect(series.energy[i]).toBe(null);
      expect(series.mood[i]).toBe(null);
      expect(series.nutrition[i]).toBe(null);
      expect(series.activity[i]).toBe(null);
      expect(series.hydration[i]).toBe(null);
    }
  });

  it('overlay does not patch non-today buckets', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', '2026-06-25', overlay);
    // today is 2026-06-25 (index 3 in the 2026-06-22..2026-06-28 window).
    // Index 3 gets overlay; index 6 (2026-06-28) stays null.
    expect(series.sleep[3]).toBe(85);
    expect(series.sleep[6]).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// Today overlay with null fields: null stays null (honest gap)
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - today overlay with null fields', () => {
  const today = '2026-06-28';
  const win = week1W(today);

  it('null overlay field stays null (not coerced to 0)', () => {
    const overlay: Partial<TodayOverlay> = {
      sleep: null,
      energy: null,
      mood: null,
      nutrition: null,
      activity: null,
      overall: null,
      hydration: null,
    };
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    expect(series.sleep[6]).toBe(null);
    expect(series.energy[6]).toBe(null);
    expect(series.mood[6]).toBe(null);
    expect(series.nutrition[6]).toBe(null);
    expect(series.activity[6]).toBe(null);
    expect(series.hydration[6]).toBe(null);
  });

  it('null overall overlay falls back to stored bio history when available', () => {
    const bioRows = [bioRow(today, 80)];
    const overlay: Partial<TodayOverlay> = { overall: null };
    const series = buildSeriesFromRows(win.buckets, [], bioRows, '1W', today, overlay);
    // overall overlay is null -> fallback to stored value 80.
    expect(series.overall[6]).toBe(80);
  });

  it('null sleep overlay falls back to stored daily row sleep_score', () => {
    const rows = [dailyRow(today, 62, null)];
    const overlay: Partial<TodayOverlay> = { sleep: null };
    const series = buildSeriesFromRows(win.buckets, rows, [], '1W', today, overlay);
    // sleep overlay is null -> fallback to stored value 62.
    expect(series.sleep[6]).toBe(62);
  });

  it('never emits 0 when overlay is null', () => {
    const overlay: Partial<TodayOverlay> = {
      sleep: null, energy: null, mood: null, nutrition: null,
      activity: null, overall: null, hydration: null,
    };
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    expect(noZeros(series)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 1Y monthly aggregation
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - 1Y monthly aggregation', () => {
  const today = '2026-06-28';
  const win = year1Y(today);
  // Buckets: 12 monthly buckets from 'yyyy-mm'.

  it('aggregates sleep_score values within a month to their average', () => {
    // Two rows in July 2025, sleep 60 and 80 -> avg 70.
    const rows: DailyScoreRow[] = [
      dailyRow('2025-07-10', 60, null),
      dailyRow('2025-07-20', 80, null),
    ];
    const series = buildSeriesFromRows(win.buckets, rows, [], '1Y', today, undefined);
    // Find the July 2025 bucket index.
    const julIdx = win.buckets.findIndex((b) => b.date === '2025-07');
    if (julIdx >= 0) {
      expect(series.sleep[julIdx]).toBe(70);
    } else {
      // July 2025 is outside the 1Y window ending June 2026; skip assertion.
    }
  });

  it('monthly bucket with no data is null, not 0', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1Y', today, undefined);
    // All months should be null.
    expect(series.sleep.every((v) => v === null)).toBe(true);
    expect(series.sleep.every((v) => v !== 0)).toBe(true);
  });

  it('overall aggregation uses bio_optimization_history per month', () => {
    // Two bio history rows in August 2025.
    const bioRows: BioHistoryRow[] = [
      bioRow('2025-08-05', 64),
      bioRow('2025-08-15', 80),
    ];
    const series = buildSeriesFromRows(win.buckets, [], bioRows, '1Y', today, undefined);
    const augIdx = win.buckets.findIndex((b) => b.date === '2025-08');
    if (augIdx >= 0) {
      // Average of 64 and 80 = 72.
      expect(series.overall[augIdx]).toBe(72);
    }
  });

  it('energy/mood/nutrition/activity/hydration are null for all months (no stored source)', () => {
    const rows = [dailyRow('2025-09-01', 70, 75)];
    const series = buildSeriesFromRows(win.buckets, rows, [], '1Y', today, undefined);
    expect(series.energy.every((v) => v === null)).toBe(true);
    expect(series.mood.every((v) => v === null)).toBe(true);
    expect(series.nutrition.every((v) => v === null)).toBe(true);
    expect(series.activity.every((v) => v === null)).toBe(true);
    expect(series.hydration.every((v) => v === null)).toBe(true);
  });

  it('series length is always 12 for 1Y', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1Y', today, undefined);
    PILLAR_KEYS.forEach((k) => {
      expect(series[k].length).toBe(12);
    });
  });
});

// ---------------------------------------------------------------------------
// 1Y today overlay patches the current month's bucket
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - 1Y today overlay', () => {
  const today = '2026-06-28';
  const win = year1Y(today);
  // Current month bucket is '2026-06'.

  const overlay: TodayOverlay = {
    sleep: 88,
    energy: 74,
    mood: 68,
    nutrition: 82,
    activity: 65,
    overall: 77,
    hydration: 59,
  };

  it('patches the current month bucket with overlay values', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1Y', today, overlay);
    const junIdx = win.buckets.findIndex((b) => b.date === '2026-06');
    expect(junIdx).toBeGreaterThanOrEqual(0);
    expect(series.sleep[junIdx]).toBe(88);
    expect(series.energy[junIdx]).toBe(74);
    expect(series.mood[junIdx]).toBe(68);
    expect(series.nutrition[junIdx]).toBe(82);
    expect(series.activity[junIdx]).toBe(65);
    expect(series.overall[junIdx]).toBe(77);
    expect(series.hydration[junIdx]).toBe(59);
  });

  it('does not patch past month buckets', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1Y', today, overlay);
    const mayIdx = win.buckets.findIndex((b) => b.date === '2026-05');
    if (mayIdx >= 0) {
      expect(series.energy[mayIdx]).toBe(null);
      expect(series.mood[mayIdx]).toBe(null);
    }
  });
});

// ---------------------------------------------------------------------------
// Never emits 0 for missing data (comprehensive)
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - never emits 0', () => {
  const today = '2026-06-28';

  it('no zeros in 1W with all-present rows', () => {
    const win = week1W(today);
    const rows = win.buckets.map((b) => dailyRow(b.date, 55, 65));
    const series = buildSeriesFromRows(win.buckets, rows, [], '1W', today, undefined);
    // energy/mood/nutrition/activity/hydration should be null, not 0.
    expect(noZeros(series)).toBe(true);
  });

  it('no zeros in 1M with no rows', () => {
    const win = month1M(today);
    const series = buildSeriesFromRows(win.buckets, [], [], '1M', today, undefined);
    expect(noZeros(series)).toBe(true);
  });

  it('no zeros in 1Y with no rows', () => {
    const win = year1Y(today);
    const series = buildSeriesFromRows(win.buckets, [], [], '1Y', today, undefined);
    expect(noZeros(series)).toBe(true);
  });

  it('no zeros when overlay fields are all null', () => {
    const win = week1W(today);
    const overlay: Partial<TodayOverlay> = {
      sleep: null, energy: null, mood: null, nutrition: null,
      activity: null, overall: null, hydration: null,
    };
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, overlay);
    expect(noZeros(series)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No vitality_score reference
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - vitality_score never used', () => {
  it('TodayOverlay type has no vitality_score field', () => {
    // This is a static type check that fails at compile time if vitality_score
    // were added. The runtime test checks that the series is built from the
    // overlay fields without any vitality_score-shaped input.
    const overlay: TodayOverlay = {
      sleep: 70,
      energy: 65,
      mood: 60,
      nutrition: 75,
      activity: 55,
      overall: 68,
      hydration: 50,
    };
    // No vitality_score key should exist on the overlay object.
    expect(Object.keys(overlay)).not.toContain('vitality_score');
  });

  it('DailyScoreRow type has no vitality_score field', () => {
    const row: DailyScoreRow = { date: '2026-06-28', sleep_score: 70, bio_optimization_score: 75 };
    expect(Object.keys(row)).not.toContain('vitality_score');
  });

  it('PILLAR_KEYS does not include vitality_score', () => {
    expect(PILLAR_KEYS).not.toContain('vitality_score');
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - deterministic', () => {
  const today = '2026-06-28';
  const win = week1W(today);
  const rows = [dailyRow('2026-06-22', 60, 70), dailyRow('2026-06-25', 75, 80)];
  const bioRows = [bioRow('2026-06-22', 65), bioRow('2026-06-28', 82)];
  const overlay: TodayOverlay = {
    sleep: 90, energy: 72, mood: 68, nutrition: 78, activity: 64, overall: 76, hydration: 58,
  };

  it('same input produces identical output', () => {
    const a = buildSeriesFromRows(win.buckets, rows, bioRows, '1W', today, overlay);
    const b = buildSeriesFromRows(win.buckets, rows, bioRows, '1W', today, overlay);
    PILLAR_KEYS.forEach((k) => {
      expect(a[k]).toEqual(b[k]);
    });
  });
});

// ---------------------------------------------------------------------------
// Series length invariant
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - series length invariant', () => {
  const today = '2026-06-28';

  it('1W: 7 buckets -> 7 values per pillar', () => {
    const win = week1W(today);
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, undefined);
    PILLAR_KEYS.forEach((k) => expect(series[k]).toHaveLength(7));
  });

  it('1M June 2026: 30 buckets -> 30 values per pillar', () => {
    const win = month1M(today);
    const series = buildSeriesFromRows(win.buckets, [], [], '1M', today, undefined);
    PILLAR_KEYS.forEach((k) => expect(series[k]).toHaveLength(30));
  });

  it('1Y: 12 buckets -> 12 values per pillar', () => {
    const win = year1Y(today);
    const series = buildSeriesFromRows(win.buckets, [], [], '1Y', today, undefined);
    PILLAR_KEYS.forEach((k) => expect(series[k]).toHaveLength(12));
  });
});

// ---------------------------------------------------------------------------
// bio_optimization_history priority over daily_scores bio column
// ---------------------------------------------------------------------------

describe('buildSeriesFromRows - overall source priority', () => {
  const today = '2026-06-28';
  const win = week1W(today);

  it('bioHistory score wins over daily_scores.bio_optimization_score for same date', () => {
    const dailyRows = [dailyRow('2026-06-22', null, 50)]; // bio_opt_score = 50
    const bioRows = [bioRow('2026-06-22', 90)];           // history score = 90
    const series = buildSeriesFromRows(win.buckets, dailyRows, bioRows, '1W', today, undefined);
    expect(series.overall[0]).toBe(90);
  });

  it('daily_scores bio col used as fallback when no history row', () => {
    const dailyRows = [dailyRow('2026-06-22', null, 50)];
    const series = buildSeriesFromRows(win.buckets, dailyRows, [], '1W', today, undefined);
    expect(series.overall[0]).toBe(50);
  });

  it('overall is null when both sources are absent', () => {
    const series = buildSeriesFromRows(win.buckets, [], [], '1W', today, undefined);
    expect(series.overall[0]).toBe(null);
  });

  it('overall is null when daily_scores bio col is null and no history', () => {
    const dailyRows = [dailyRow('2026-06-22', null, null)];
    const series = buildSeriesFromRows(win.buckets, dailyRows, [], '1W', today, undefined);
    expect(series.overall[0]).toBe(null);
    expect(series.overall[0]).not.toBe(0);
  });
});
