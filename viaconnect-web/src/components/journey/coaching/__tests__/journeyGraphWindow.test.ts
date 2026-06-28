/**
 * src/components/journey/coaching/__tests__/journeyGraphWindow.test.ts
 *
 * TDD for the journeyGraphWindow pure date-math module (Prompt 208k Task T1).
 * Node-safe, no DOM, no React, fully deterministic.
 * All results are pure functions of the injected today string.
 *
 * Coverage:
 *   windowFor '1W': 7-day buckets, weekday labels, period label, boundary
 *   windowFor '1M': calendar buckets, sparse labels, period label, leap year
 *   windowFor '1Y': 12-month buckets, short labels, period label, rangeEnd
 *   canGoNext: false when offset is 0, true when offset > 0
 *   Month and year boundary crossing
 *   aggregateMonthly: average, rounding, null for empty months
 *
 * No Date.now() and no argless new Date() anywhere in the module or tests.
 */

import { describe, it, expect } from 'vitest';
import { windowFor, aggregateMonthly } from '../journeyGraphWindow';
import type { JourneyWindow } from '../journeyGraphWindow';

// ---------------------------------------------------------------------------
// windowFor '1W'
// ---------------------------------------------------------------------------

describe("windowFor '1W'", () => {
  describe('offset 0 for today 2026-06-28', () => {
    const w: JourneyWindow = windowFor('1W', 0, '2026-06-28');

    it('yields exactly 7 buckets', () => {
      expect(w.buckets).toHaveLength(7);
    });

    it('first bucket date is 2026-06-22', () => {
      expect(w.buckets[0].date).toBe('2026-06-22');
    });

    it('last bucket date is 2026-06-28', () => {
      expect(w.buckets[6].date).toBe('2026-06-28');
    });

    it('all buckets have monthly false', () => {
      expect(w.buckets.every((b) => b.monthly === false)).toBe(true);
    });

    it('weekday labels are Mon Tue Wed Thu Fri Sat Sun', () => {
      const labels = w.buckets.map((b) => b.label);
      expect(labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    });

    it('periodLabel is "Jun 22 to Jun 28"', () => {
      expect(w.periodLabel).toBe('Jun 22 to Jun 28');
    });

    it('rangeStart is 2026-06-22', () => {
      expect(w.rangeStart).toBe('2026-06-22');
    });

    it('rangeEnd is 2026-06-28', () => {
      expect(w.rangeEnd).toBe('2026-06-28');
    });

    it('canGoNext is false', () => {
      expect(w.canGoNext).toBe(false);
    });
  });

  describe('offset 1 for today 2026-06-28', () => {
    const w: JourneyWindow = windowFor('1W', 1, '2026-06-28');

    it('yields exactly 7 buckets', () => {
      expect(w.buckets).toHaveLength(7);
    });

    it('first bucket date is 2026-06-15', () => {
      expect(w.buckets[0].date).toBe('2026-06-15');
    });

    it('last bucket date is 2026-06-21', () => {
      expect(w.buckets[6].date).toBe('2026-06-21');
    });

    it('weekday labels are Mon Tue Wed Thu Fri Sat Sun', () => {
      const labels = w.buckets.map((b) => b.label);
      expect(labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    });

    it('periodLabel is "Jun 15 to Jun 21"', () => {
      expect(w.periodLabel).toBe('Jun 15 to Jun 21');
    });

    it('canGoNext is true', () => {
      expect(w.canGoNext).toBe(true);
    });
  });

  describe('crossing a month boundary (today 2026-07-03, offset 0)', () => {
    const w: JourneyWindow = windowFor('1W', 0, '2026-07-03');

    it('first bucket date is 2026-06-27', () => {
      expect(w.buckets[0].date).toBe('2026-06-27');
    });

    it('last bucket date is 2026-07-03', () => {
      expect(w.buckets[6].date).toBe('2026-07-03');
    });

    it('periodLabel spans two months', () => {
      expect(w.periodLabel).toBe('Jun 27 to Jul 3');
    });

    it('weekday labels are Sat Sun Mon Tue Wed Thu Fri', () => {
      const labels = w.buckets.map((b) => b.label);
      expect(labels).toEqual(['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    });
  });
});

// ---------------------------------------------------------------------------
// windowFor '1M'
// ---------------------------------------------------------------------------

describe("windowFor '1M'", () => {
  describe('offset 0 for today 2026-06-28 (June 2026, 30 days)', () => {
    const w: JourneyWindow = windowFor('1M', 0, '2026-06-28');

    it('yields 30 buckets', () => {
      expect(w.buckets).toHaveLength(30);
    });

    it('all buckets have monthly false', () => {
      expect(w.buckets.every((b) => b.monthly === false)).toBe(true);
    });

    it('first bucket date is 2026-06-01', () => {
      expect(w.buckets[0].date).toBe('2026-06-01');
    });

    it('last bucket date is 2026-06-30', () => {
      expect(w.buckets[29].date).toBe('2026-06-30');
    });

    it('label for day 1 is "1"', () => {
      expect(w.buckets[0].label).toBe('1');
    });

    it('label for day 7 is "7"', () => {
      expect(w.buckets[6].label).toBe('7');
    });

    it('label for day 14 is "14"', () => {
      expect(w.buckets[13].label).toBe('14');
    });

    it('label for day 21 is "21"', () => {
      expect(w.buckets[20].label).toBe('21');
    });

    it('label for day 30 (last day) is "30"', () => {
      expect(w.buckets[29].label).toBe('30');
    });

    it('label for day 2 is empty string', () => {
      expect(w.buckets[1].label).toBe('');
    });

    it('label for day 15 is empty string', () => {
      expect(w.buckets[14].label).toBe('');
    });

    it('periodLabel is "June 2026"', () => {
      expect(w.periodLabel).toBe('June 2026');
    });

    it('rangeStart is 2026-06-01', () => {
      expect(w.rangeStart).toBe('2026-06-01');
    });

    it('rangeEnd is 2026-06-30', () => {
      expect(w.rangeEnd).toBe('2026-06-30');
    });

    it('canGoNext is false', () => {
      expect(w.canGoNext).toBe(false);
    });
  });

  describe('offset 1 for today 2026-06-28 (May 2026, 31 days)', () => {
    const w: JourneyWindow = windowFor('1M', 1, '2026-06-28');

    it('yields 31 buckets', () => {
      expect(w.buckets).toHaveLength(31);
    });

    it('first bucket date is 2026-05-01', () => {
      expect(w.buckets[0].date).toBe('2026-05-01');
    });

    it('last bucket date is 2026-05-31', () => {
      expect(w.buckets[30].date).toBe('2026-05-31');
    });

    it('label for day 31 (last day) is "31"', () => {
      expect(w.buckets[30].label).toBe('31');
    });

    it('periodLabel is "May 2026"', () => {
      expect(w.periodLabel).toBe('May 2026');
    });

    it('rangeStart is 2026-05-01', () => {
      expect(w.rangeStart).toBe('2026-05-01');
    });

    it('rangeEnd is 2026-05-31', () => {
      expect(w.rangeEnd).toBe('2026-05-31');
    });

    it('canGoNext is true', () => {
      expect(w.canGoNext).toBe(true);
    });
  });

  describe('crossing January boundary (today 2026-02-15)', () => {
    it('offset 1 gives January 2026 with 31 buckets', () => {
      const w = windowFor('1M', 1, '2026-02-15');
      expect(w.periodLabel).toBe('January 2026');
      expect(w.buckets).toHaveLength(31);
      expect(w.rangeEnd).toBe('2026-01-31');
    });

    it('offset 2 gives December 2025 with correct year in rangeStart and rangeEnd', () => {
      const w = windowFor('1M', 2, '2026-02-15');
      expect(w.periodLabel).toBe('December 2025');
      expect(w.buckets).toHaveLength(31);
      expect(w.rangeStart).toBe('2025-12-01');
      expect(w.rangeEnd).toBe('2025-12-31');
    });
  });

  describe('leap year February 2024 (today 2024-03-10, offset 1)', () => {
    const w: JourneyWindow = windowFor('1M', 1, '2024-03-10');

    it('yields 29 buckets for leap February', () => {
      expect(w.buckets).toHaveLength(29);
    });

    it('last bucket date is 2024-02-29', () => {
      expect(w.buckets[28].date).toBe('2024-02-29');
    });

    it('label for day 29 (last day) is "29"', () => {
      expect(w.buckets[28].label).toBe('29');
    });

    it('rangeEnd is 2024-02-29', () => {
      expect(w.rangeEnd).toBe('2024-02-29');
    });

    it('periodLabel is "February 2024"', () => {
      expect(w.periodLabel).toBe('February 2024');
    });
  });

  describe('non-leap year February 2023 (today 2023-03-10, offset 1)', () => {
    const w: JourneyWindow = windowFor('1M', 1, '2023-03-10');

    it('yields 28 buckets', () => {
      expect(w.buckets).toHaveLength(28);
    });

    it('last bucket date is 2023-02-28', () => {
      expect(w.buckets[27].date).toBe('2023-02-28');
    });

    it('rangeEnd is 2023-02-28', () => {
      expect(w.rangeEnd).toBe('2023-02-28');
    });
  });
});

// ---------------------------------------------------------------------------
// windowFor '1Y'
// ---------------------------------------------------------------------------

describe("windowFor '1Y'", () => {
  describe('offset 0 for today 2026-06-28 (Jul 2025 to Jun 2026)', () => {
    const w: JourneyWindow = windowFor('1Y', 0, '2026-06-28');

    it('yields exactly 12 buckets', () => {
      expect(w.buckets).toHaveLength(12);
    });

    it('all buckets have monthly true', () => {
      expect(w.buckets.every((b) => b.monthly === true)).toBe(true);
    });

    it('first bucket date is 2025-07', () => {
      expect(w.buckets[0].date).toBe('2025-07');
    });

    it('last bucket date is 2026-06', () => {
      expect(w.buckets[11].date).toBe('2026-06');
    });

    it('bucket dates are the correct 12 consecutive months', () => {
      const expected = [
        '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
        '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
      ];
      expect(w.buckets.map((b) => b.date)).toEqual(expected);
    });

    it('bucket labels are short month names in order', () => {
      const expected = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      expect(w.buckets.map((b) => b.label)).toEqual(expected);
    });

    it('periodLabel is "Jul 2025 to Jun 2026"', () => {
      expect(w.periodLabel).toBe('Jul 2025 to Jun 2026');
    });

    it('rangeStart is 2025-07-01', () => {
      expect(w.rangeStart).toBe('2025-07-01');
    });

    it('rangeEnd is 2026-06-30', () => {
      expect(w.rangeEnd).toBe('2026-06-30');
    });

    it('canGoNext is false', () => {
      expect(w.canGoNext).toBe(false);
    });
  });

  describe('offset 1 for today 2026-06-28 (Jul 2024 to Jun 2025)', () => {
    const w: JourneyWindow = windowFor('1Y', 1, '2026-06-28');

    it('yields 12 buckets', () => {
      expect(w.buckets).toHaveLength(12);
    });

    it('first bucket date is 2024-07', () => {
      expect(w.buckets[0].date).toBe('2024-07');
    });

    it('last bucket date is 2025-06', () => {
      expect(w.buckets[11].date).toBe('2025-06');
    });

    it('periodLabel is "Jul 2024 to Jun 2025"', () => {
      expect(w.periodLabel).toBe('Jul 2024 to Jun 2025');
    });

    it('canGoNext is true', () => {
      expect(w.canGoNext).toBe(true);
    });
  });

  describe('crossing year boundary (today 2026-01-15, offset 0)', () => {
    const w: JourneyWindow = windowFor('1Y', 0, '2026-01-15');

    it('first bucket date is 2025-02', () => {
      expect(w.buckets[0].date).toBe('2025-02');
    });

    it('last bucket date is 2026-01', () => {
      expect(w.buckets[11].date).toBe('2026-01');
    });

    it('periodLabel is "Feb 2025 to Jan 2026"', () => {
      expect(w.periodLabel).toBe('Feb 2025 to Jan 2026');
    });

    it('rangeStart is 2025-02-01', () => {
      expect(w.rangeStart).toBe('2025-02-01');
    });

    it('rangeEnd is 2026-01-31', () => {
      expect(w.rangeEnd).toBe('2026-01-31');
    });
  });

  describe('rangeEnd uses last day of end month', () => {
    it('end month August 2026 (31 days) gives rangeEnd 2026-08-31', () => {
      const w = windowFor('1Y', 0, '2026-08-15');
      expect(w.rangeEnd).toBe('2026-08-31');
    });

    it('end month April 2026 (30 days) gives rangeEnd 2026-04-30', () => {
      const w = windowFor('1Y', 0, '2026-04-20');
      expect(w.rangeEnd).toBe('2026-04-30');
    });
  });
});

// ---------------------------------------------------------------------------
// canGoNext
// ---------------------------------------------------------------------------

describe('canGoNext', () => {
  it('is false for offset 0 in 1W', () => {
    expect(windowFor('1W', 0, '2026-06-28').canGoNext).toBe(false);
  });

  it('is true for offset 1 in 1W', () => {
    expect(windowFor('1W', 1, '2026-06-28').canGoNext).toBe(true);
  });

  it('is false for offset 0 in 1M', () => {
    expect(windowFor('1M', 0, '2026-06-28').canGoNext).toBe(false);
  });

  it('is true for offset 2 in 1M', () => {
    expect(windowFor('1M', 2, '2026-06-28').canGoNext).toBe(true);
  });

  it('is false for offset 0 in 1Y', () => {
    expect(windowFor('1Y', 0, '2026-06-28').canGoNext).toBe(false);
  });

  it('is true for offset 3 in 1Y', () => {
    expect(windowFor('1Y', 3, '2026-06-28').canGoNext).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// aggregateMonthly
// ---------------------------------------------------------------------------

describe('aggregateMonthly', () => {
  it('returns an empty Map for empty input', () => {
    const result = aggregateMonthly([]);
    expect(result.size).toBe(0);
  });

  it('returns null for a month with only null values', () => {
    const result = aggregateMonthly([
      { date: '2026-01-01', value: null },
      { date: '2026-01-15', value: null },
    ]);
    expect(result.get('2026-01')).toBeNull();
  });

  it('never returns 0 for an all-null month (returns null not 0)', () => {
    const result = aggregateMonthly([
      { date: '2026-01-01', value: null },
    ]);
    expect(result.get('2026-01')).toBeNull();
    expect(result.get('2026-01')).not.toBe(0);
  });

  it('averages three non-null values and rounds to integer', () => {
    const result = aggregateMonthly([
      { date: '2026-01-01', value: 10 },
      { date: '2026-01-15', value: 20 },
      { date: '2026-01-31', value: 30 },
    ]);
    expect(result.get('2026-01')).toBe(20);
  });

  it('rounds 10.5 up to 11 via Math.round', () => {
    const result = aggregateMonthly([
      { date: '2026-02-01', value: 10 },
      { date: '2026-02-02', value: 11 },
    ]);
    expect(result.get('2026-02')).toBe(11);
  });

  it('handles multiple months independently', () => {
    const result = aggregateMonthly([
      { date: '2026-01-01', value: 80 },
      { date: '2026-02-01', value: 60 },
      { date: '2026-02-15', value: 40 },
    ]);
    expect(result.get('2026-01')).toBe(80);
    expect(result.get('2026-02')).toBe(50);
  });

  it('ignores null values in a month that also has non-null values', () => {
    const result = aggregateMonthly([
      { date: '2026-03-01', value: 90 },
      { date: '2026-03-15', value: null },
      { date: '2026-03-31', value: 70 },
    ]);
    expect(result.get('2026-03')).toBe(80);
  });

  it('a month with no entries does not appear in the Map', () => {
    const result = aggregateMonthly([
      { date: '2026-01-01', value: 50 },
    ]);
    expect(result.has('2026-02')).toBe(false);
  });

  it('a single-day entry returns that value directly', () => {
    const result = aggregateMonthly([{ date: '2026-06-15', value: 42 }]);
    expect(result.get('2026-06')).toBe(42);
  });

  it('is deterministic on repeated calls with the same input', () => {
    const input = [
      { date: '2026-05-01', value: 75 },
      { date: '2026-05-15', value: 85 },
    ];
    const r1 = aggregateMonthly(input);
    const r2 = aggregateMonthly(input);
    expect(r1.get('2026-05')).toBe(r2.get('2026-05'));
  });

  it('never throws on empty input', () => {
    expect(() => aggregateMonthly([])).not.toThrow();
  });

  it('never throws when all values are null', () => {
    expect(() =>
      aggregateMonthly([{ date: '2026-01-01', value: null }])
    ).not.toThrow();
  });

  it('handles two months where one is all-null and one has data', () => {
    const result = aggregateMonthly([
      { date: '2026-04-01', value: null },
      { date: '2026-05-01', value: 77 },
    ]);
    expect(result.get('2026-04')).toBeNull();
    expect(result.get('2026-05')).toBe(77);
  });
});
