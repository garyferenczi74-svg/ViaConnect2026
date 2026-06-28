/**
 * src/components/journey/coaching/journeyGraphWindow.ts
 *
 * Pure, deterministic date-math helpers for the Journey hero graph (Prompt 208k Task T1).
 * Provides window bucketing, x-axis labels, period labels, and monthly aggregation.
 *
 * Rules:
 *   - No Date.now(), no argless new Date(). All results are functions of the injected today.
 *   - All date arithmetic uses Date.UTC so no timezone can shift a calendar day.
 *   - No em-dashes, no en-dashes, no emojis. Use "to" for spans and ranges.
 *   - No React, no Supabase, no I/O.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type JourneyRange = '1W' | '1M' | '1Y';

export interface JourneyBucket {
  /** 'yyyy-mm-dd' for daily buckets; 'yyyy-mm' for monthly (1Y) buckets. */
  date: string;
  /** x-axis label for this bucket. Empty string when this bucket is not a labeled tick. */
  label: string;
  /** true only for 1Y buckets. */
  monthly: boolean;
}

export interface JourneyWindow {
  buckets: JourneyBucket[];
  periodLabel: string;
  /** 'yyyy-mm-dd' inclusive, earliest bucket date (first of month for 1Y). */
  rangeStart: string;
  /** 'yyyy-mm-dd' inclusive, latest bucket date (last day of end month for 1M/1Y). */
  rangeEnd: string;
  canGoNext: boolean;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Parse a 'yyyy-mm-dd' string into integer year, month (1-indexed), and day. */
function parseDate(d: string): { y: number; m: number; day: number } {
  const parts = d.split('-');
  return { y: Number(parts[0]), m: Number(parts[1]), day: Number(parts[2]) };
}

/** Format integer year, month (1-indexed), and day to 'yyyy-mm-dd'. */
function fmtDate(y: number, m: number, day: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Format integer year and month (1-indexed) to 'yyyy-mm'. */
function fmtMonth(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * Add n days to a UTC calendar date. Handles month and year rollovers.
 * n may be negative. Uses Date.UTC so no local timezone can shift the date.
 */
function addDays(y: number, m: number, day: number, n: number): { y: number; m: number; day: number } {
  const d = new Date(Date.UTC(y, m - 1, day + n));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Return the number of days in the given UTC calendar month (m is 1-indexed). */
function daysInMonth(y: number, m: number): number {
  // Day 0 of the next month equals the last day of the current month.
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Subtract n calendar months from (y, m). Handles year rollovers correctly.
 * Both inputs and outputs use 1-indexed months.
 */
function subMonths(y: number, m: number, n: number): { y: number; m: number } {
  let nm = m - n;
  let ny = y;
  while (nm <= 0) {
    nm += 12;
    ny -= 1;
  }
  return { y: ny, m: nm };
}

/** Return the UTC weekday short name for a given calendar date. */
function weekdayOf(y: number, m: number, day: number): string {
  const d = new Date(Date.UTC(y, m - 1, day));
  return SHORT_DAYS[d.getUTCDay()];
}

// ---------------------------------------------------------------------------
// windowFor
// ---------------------------------------------------------------------------

/**
 * Compute the bucket window and metadata for a given range, navigation offset,
 * and reference date.
 *
 * @param range  '1W' | '1M' | '1Y'
 * @param offset Non-negative integer count of periods back from the current period.
 *               0 = current period. canGoNext = offset > 0.
 * @param today  Reference date as 'yyyy-mm-dd'. Never call Date.now() or new Date()
 *               without arguments; always use this injected value.
 */
export function windowFor(range: JourneyRange, offset: number, today: string): JourneyWindow {
  const { y: ty, m: tm, day: td } = parseDate(today);

  // --- 1W: 7 daily buckets ending on (today minus offset*7 days) ---
  if (range === '1W') {
    const end = addDays(ty, tm, td, -offset * 7);
    const start = addDays(end.y, end.m, end.day, -6);

    const buckets: JourneyBucket[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(start.y, start.m, start.day, i);
      buckets.push({
        date: fmtDate(d.y, d.m, d.day),
        label: weekdayOf(d.y, d.m, d.day),
        monthly: false,
      });
    }

    const startLabel = `${SHORT_MONTHS[start.m - 1]} ${start.day}`;
    const endLabel = `${SHORT_MONTHS[end.m - 1]} ${end.day}`;

    return {
      buckets,
      periodLabel: `${startLabel} to ${endLabel}`,
      rangeStart: fmtDate(start.y, start.m, start.day),
      rangeEnd: fmtDate(end.y, end.m, end.day),
      canGoNext: offset > 0,
    };
  }

  // --- 1M: one bucket per day of the selected calendar month ---
  if (range === '1M') {
    const { y, m } = subMonths(ty, tm, offset);
    const dim = daysInMonth(y, m);
    const labeled = new Set([1, 7, 14, 21, dim]);

    const buckets: JourneyBucket[] = [];
    for (let day = 1; day <= dim; day++) {
      buckets.push({
        date: fmtDate(y, m, day),
        label: labeled.has(day) ? String(day) : '',
        monthly: false,
      });
    }

    return {
      buckets,
      periodLabel: `${FULL_MONTHS[m - 1]} ${y}`,
      rangeStart: fmtDate(y, m, 1),
      rangeEnd: fmtDate(y, m, dim),
      canGoNext: offset > 0,
    };
  }

  // --- 1Y: 12 monthly buckets ending in (today's month minus offset*12 months) ---
  const endM = subMonths(ty, tm, offset * 12);
  // Start month is 11 months before endM so the window spans exactly 12 months.
  const startM = subMonths(endM.y, endM.m, 11);

  const buckets: JourneyBucket[] = [];
  for (let i = 0; i < 12; i++) {
    const bm = subMonths(endM.y, endM.m, 11 - i);
    buckets.push({
      date: fmtMonth(bm.y, bm.m),
      label: SHORT_MONTHS[bm.m - 1],
      monthly: true,
    });
  }

  const lastDayOfEndMonth = daysInMonth(endM.y, endM.m);

  return {
    buckets,
    periodLabel: `${SHORT_MONTHS[startM.m - 1]} ${startM.y} to ${SHORT_MONTHS[endM.m - 1]} ${endM.y}`,
    rangeStart: fmtDate(startM.y, startM.m, 1),
    rangeEnd: fmtDate(endM.y, endM.m, lastDayOfEndMonth),
    canGoNext: offset > 0,
  };
}

// ---------------------------------------------------------------------------
// aggregateMonthly
// ---------------------------------------------------------------------------

/**
 * Group daily score points by calendar month and compute the average of
 * non-null values, rounded to an integer. Months with no non-null values
 * map to null. Never returns 0 for an empty or all-null month. Pure and
 * deterministic; never throws on empty input.
 *
 * @param dailyPoints Array of { date: 'yyyy-mm-dd', value: number | null }.
 * @returns A Map from 'yyyy-mm' keys to number | null.
 */
export function aggregateMonthly(
  dailyPoints: { date: string; value: number | null }[],
): Map<string, number | null> {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  const allMonths = new Set<string>();

  for (const { date, value } of dailyPoints) {
    const mk = date.slice(0, 7);
    allMonths.add(mk);
    if (value !== null && Number.isFinite(value)) {
      sums.set(mk, (sums.get(mk) ?? 0) + value);
      counts.set(mk, (counts.get(mk) ?? 0) + 1);
    }
  }

  const result = new Map<string, number | null>();
  for (const mk of allMonths) {
    const cnt = counts.get(mk) ?? 0;
    result.set(mk, cnt > 0 ? Math.round((sums.get(mk) ?? 0) / cnt) : null);
  }

  return result;
}
