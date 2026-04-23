// Prompt #114 P1: US federal business-day math for CBP deadline calculation.
//
// The 7-business-day importer response window under 19 C.F.R. § 133.21(b)(2)(i)
// and the 30-business-day CBP disclosure clock under 19 C.F.R. § 133.21(e)
// both require skipping weekends AND federal holidays (including OPM observance
// shifts for holidays falling on weekends).
//
// Convention (matches standard legal interpretation of "N business days after"):
//   - notice_date itself is BD 0; the first counted BD starts the next day
//   - addUsBusinessDays(start, 7) advances exactly 7 business days forward
//   - holidays falling on a Saturday are observed the prior Friday
//   - holidays falling on a Sunday are observed the following Monday

const US_FEDERAL_HOLIDAYS: ReadonlySet<string> = new Set<string>([
  // 2026
  '2026-01-01', // New Year's (Thu)
  '2026-01-19', // MLK (Mon)
  '2026-02-16', // Presidents (Mon)
  '2026-05-25', // Memorial (Mon)
  '2026-06-19', // Juneteenth (Fri)
  '2026-07-03', // July 4 observed (Fri; Jul 4 is Sat)
  '2026-09-07', // Labor (Mon)
  '2026-10-12', // Columbus (Mon)
  '2026-11-11', // Veterans (Wed)
  '2026-11-26', // Thanksgiving (Thu)
  '2026-12-25', // Christmas (Fri)

  // 2027
  '2027-01-01', // New Year's (Fri)
  '2027-01-18', // MLK (Mon)
  '2027-02-15', // Presidents (Mon)
  '2027-05-31', // Memorial (Mon)
  '2027-06-18', // Juneteenth observed (Fri; Jun 19 is Sat)
  '2027-07-05', // July 4 observed (Mon; Jul 4 is Sun)
  '2027-09-06', // Labor (Mon)
  '2027-10-11', // Columbus (Mon)
  '2027-11-11', // Veterans (Thu)
  '2027-11-25', // Thanksgiving (Thu)
  '2027-12-24', // Christmas observed (Fri; Dec 25 is Sat)
  '2027-12-31', // New Year's 2028 observed (Fri; Jan 1 2028 is Sat)

  // 2028 (leap year)
  '2028-01-17', // MLK (Mon)
  '2028-02-21', // Presidents (Mon)
  '2028-05-29', // Memorial (Mon)
  '2028-06-19', // Juneteenth (Mon)
  '2028-07-04', // July 4 (Tue)
  '2028-09-04', // Labor (Mon)
  '2028-10-09', // Columbus (Mon)
  '2028-11-10', // Veterans observed (Fri; Nov 11 is Sat)
  '2028-11-23', // Thanksgiving (Thu)
  '2028-12-25', // Christmas (Mon)
]);

function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function cloneUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const copy = cloneUtcMidnight(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function isUsFederalHoliday(date: Date): boolean {
  return US_FEDERAL_HOLIDAYS.has(toIsoDate(date));
}

export function isWeekend(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6;
}

export function isUsFederalBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isUsFederalHoliday(date);
}

export function addUsBusinessDays(startDate: Date, businessDays: number): Date {
  if (businessDays < 0) {
    return subtractUsBusinessDays(startDate, -businessDays);
  }
  let cursor = cloneUtcMidnight(startDate);
  let added = 0;
  while (added < businessDays) {
    cursor = addUtcDays(cursor, 1);
    if (isUsFederalBusinessDay(cursor)) {
      added += 1;
    }
  }
  return cursor;
}

export function subtractUsBusinessDays(endDate: Date, businessDays: number): Date {
  if (businessDays < 0) {
    return addUsBusinessDays(endDate, -businessDays);
  }
  let cursor = cloneUtcMidnight(endDate);
  let subtracted = 0;
  while (subtracted < businessDays) {
    cursor = addUtcDays(cursor, -1);
    if (isUsFederalBusinessDay(cursor)) {
      subtracted += 1;
    }
  }
  return cursor;
}

export function businessDaysBetween(start: Date, end: Date): number {
  const a = cloneUtcMidnight(start);
  const b = cloneUtcMidnight(end);
  if (a.getTime() === b.getTime()) return 0;

  const forward = a.getTime() < b.getTime();
  const from = forward ? a : b;
  const to = forward ? b : a;

  let count = 0;
  let cursor = addUtcDays(from, 1);
  while (cursor.getTime() <= to.getTime()) {
    if (isUsFederalBusinessDay(cursor)) count += 1;
    cursor = addUtcDays(cursor, 1);
  }
  return forward ? count : -count;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatIsoDate(date: Date): string {
  return toIsoDate(date);
}
