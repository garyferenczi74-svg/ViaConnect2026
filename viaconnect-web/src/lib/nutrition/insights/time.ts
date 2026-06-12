// Prompt 192 Task 2: pure local time helpers for the insight detectors.
// All functions take explicit instants and timezones; nothing reads the
// system clock, which keeps the detector layer testable in node.

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const hourFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = dateFormatters.get(timeZone);
  if (!fmt) {
    // en-CA renders YYYY-MM-DD directly.
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateFormatters.set(timeZone, fmt);
  }
  return fmt;
}

function hourFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = hourFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' });
    hourFormatters.set(timeZone, fmt);
  }
  return fmt;
}

/** Local calendar date (YYYY-MM-DD) of an ISO instant in a timezone. */
export function localDateOf(iso: string, timezone: string): string {
  return dateFormatter(timezone).format(new Date(iso));
}

/** Local hour of day (0..23) of an ISO instant in a timezone. */
export function localHourOf(iso: string, timezone: string): number {
  return Number.parseInt(hourFormatter(timezone).format(new Date(iso)), 10);
}

/** Calendar date arithmetic on YYYY-MM-DD strings. Noon UTC anchor avoids DST edges. */
export function addDays(dateStr: string, days: number): string {
  const anchor = new Date(`${dateStr}T12:00:00.000Z`);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}

/** Whole hours between two ISO instants (b minus a). */
export function hoursBetween(aIso: string, bIso: string): number {
  return (Date.parse(bIso) - Date.parse(aIso)) / 3_600_000;
}

/** ISO instant exactly n hours after the given ISO instant. */
export function addHoursIso(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString();
}
