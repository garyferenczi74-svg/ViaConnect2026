import { describe, it, expect } from 'vitest';
import {
  isUsFederalHoliday,
  isWeekend,
  isUsFederalBusinessDay,
  addUsBusinessDays,
  subtractUsBusinessDays,
  businessDaysBetween,
  parseIsoDate,
  formatIsoDate,
} from '@/lib/customs/businessDays';

const iso = parseIsoDate;
const asIso = formatIsoDate;

describe('businessDays — holiday classification', () => {
  it('recognises Juneteenth 2026 as a holiday (Fri 2026-06-19)', () => {
    expect(isUsFederalHoliday(iso('2026-06-19'))).toBe(true);
  });

  it('recognises MLK 2026 as a holiday', () => {
    expect(isUsFederalHoliday(iso('2026-01-19'))).toBe(true);
  });

  it('observes July 4 2026 on Fri 2026-07-03 (Jul 4 is Saturday)', () => {
    expect(isUsFederalHoliday(iso('2026-07-03'))).toBe(true);
    expect(isUsFederalHoliday(iso('2026-07-04'))).toBe(false); // Saturday is weekend, not a stored holiday
    expect(isWeekend(iso('2026-07-04'))).toBe(true);
  });

  it('observes Juneteenth 2027 on Fri 2027-06-18 (Jun 19 is Saturday)', () => {
    expect(isUsFederalHoliday(iso('2027-06-18'))).toBe(true);
  });

  it('observes Christmas 2027 on Fri 2027-12-24 (Dec 25 is Saturday)', () => {
    expect(isUsFederalHoliday(iso('2027-12-24'))).toBe(true);
  });

  it('observes New Year 2028 on Fri 2027-12-31 (Jan 1 2028 is Saturday)', () => {
    expect(isUsFederalHoliday(iso('2027-12-31'))).toBe(true);
  });

  it('weekends are not business days', () => {
    expect(isUsFederalBusinessDay(iso('2026-04-25'))).toBe(false); // Saturday
    expect(isUsFederalBusinessDay(iso('2026-04-26'))).toBe(false); // Sunday
  });

  it('normal weekday is a business day', () => {
    expect(isUsFederalBusinessDay(iso('2026-04-23'))).toBe(true); // Thursday
  });
});

describe('businessDays — addUsBusinessDays, statute-critical deadlines', () => {
  it('7 BDs after Fri before Thanksgiving 2026 (Nov 20) lands on Wed Dec 2 (Thanksgiving skipped)', () => {
    const notice = iso('2026-11-20');
    expect(asIso(addUsBusinessDays(notice, 7))).toBe('2026-12-02');
  });

  it('7 BDs after Dec 22 2026 (Tue) crosses Christmas + New Year, lands on Mon Jan 4 2027', () => {
    // Dec 22 Tue → BD1 Dec 23 Wed, BD2 Dec 24 Thu, (skip Fri Dec 25 holiday + weekend),
    // BD3 Dec 28, BD4 Dec 29, BD5 Dec 30, BD6 Dec 31, (skip Fri Jan 1 holiday + weekend),
    // BD7 Mon Jan 4 2027.
    const notice = iso('2026-12-22');
    expect(asIso(addUsBusinessDays(notice, 7))).toBe('2027-01-04');
  });

  it('7 BDs after Tue after Memorial Day 2026 (May 26), no holiday skip in window', () => {
    const notice = iso('2026-05-26');
    expect(asIso(addUsBusinessDays(notice, 7))).toBe('2026-06-04');
  });

  it('7 BDs after Juneteenth 2026 notice (Fri Jun 19 — a holiday)', () => {
    // Starting on a holiday still advances 7 BDs forward. The first BD after Jun 19
    // is Mon Jun 22; so 7 BDs lands on Tue Jun 30.
    const notice = iso('2026-06-19');
    expect(asIso(addUsBusinessDays(notice, 7))).toBe('2026-06-30');
  });

  it('7 BDs after Mon Oct 13 2026 (day after Columbus Day weekend) skips Columbus Day correctly', () => {
    // Oct 12 2026 is Columbus Day (Mon). Notice dated Oct 13 (Tue) → 7 BDs later.
    const notice = iso('2026-10-13');
    expect(asIso(addUsBusinessDays(notice, 7))).toBe('2026-10-22');
  });

  it('7 BDs after notice on Sun rolls through Mon-Fri normally', () => {
    // Sun 2026-04-26 → first BD counted is Mon Apr 27. 7 BDs lands on Tue May 5.
    const notice = iso('2026-04-26');
    expect(asIso(addUsBusinessDays(notice, 7))).toBe('2026-05-05');
  });

  it('30 BDs after seizure date spanning Thanksgiving + Christmas + New Year', () => {
    // Seizure Mon Nov 23 2026 + 30 BDs = Thu Jan 7 2027 (Thanksgiving, Christmas,
    // New Year all skipped inside the window).
    const seizure = iso('2026-11-23');
    expect(asIso(addUsBusinessDays(seizure, 30))).toBe('2027-01-07');
  });

  it('leap day Feb 29 2028 does not cause off-by-one in addition', () => {
    const notice = iso('2028-02-25'); // Friday
    // BD 1 = Mon Feb 28, BD 2 = Tue Feb 29 (leap day), BD 3 = Wed Mar 1, ...
    // 5 BDs lands on Fri Mar 3 2028.
    expect(asIso(addUsBusinessDays(notice, 5))).toBe('2028-03-03');
  });

  it('Friday notice + 1 BD is the following Monday', () => {
    const notice = iso('2026-04-24'); // Friday
    expect(asIso(addUsBusinessDays(notice, 1))).toBe('2026-04-27');
  });

  it('0 BDs returns the start date at midnight UTC (no advance)', () => {
    const notice = iso('2026-05-15');
    expect(asIso(addUsBusinessDays(notice, 0))).toBe('2026-05-15');
  });
});

describe('businessDays — subtractUsBusinessDays', () => {
  it('subtract 7 BDs from Tue Jan 5 2027 returns Wed Dec 23 2026 (Christmas + NY skip)', () => {
    const deadline = iso('2027-01-05');
    expect(asIso(subtractUsBusinessDays(deadline, 7))).toBe('2026-12-23');
  });

  it('subtract 30 BDs from Mon Jan 11 2027 returns Wed Nov 25 2026 (inverse of 30 BDs forward)', () => {
    const deadline = iso('2027-01-11');
    expect(asIso(subtractUsBusinessDays(deadline, 30))).toBe('2026-11-25');
  });

  it('round-trip: start → addUsBusinessDays(30) → subtractUsBusinessDays(30) returns start', () => {
    const start = iso('2026-11-23');
    const forward = addUsBusinessDays(start, 30);
    const back = subtractUsBusinessDays(forward, 30);
    expect(asIso(back)).toBe(asIso(start));
  });

  it('negative count in subtract acts as add', () => {
    const d = iso('2026-05-15'); // Fri
    expect(asIso(subtractUsBusinessDays(d, -2))).toBe(asIso(addUsBusinessDays(d, 2)));
  });
});

describe('businessDays — businessDaysBetween', () => {
  it('counts 7 BDs from Fri 2026-11-20 to Wed 2026-12-02 (skipping Thanksgiving)', () => {
    expect(businessDaysBetween(iso('2026-11-20'), iso('2026-12-02'))).toBe(7);
  });

  it('returns negative when end is before start', () => {
    expect(businessDaysBetween(iso('2026-12-02'), iso('2026-11-20'))).toBe(-7);
  });

  it('same day returns 0', () => {
    expect(businessDaysBetween(iso('2026-05-15'), iso('2026-05-15'))).toBe(0);
  });

  it('consecutive weekdays: Mon→Fri = 4 BDs', () => {
    expect(businessDaysBetween(iso('2026-04-20'), iso('2026-04-24'))).toBe(4);
  });

  it('Fri→following Mon = 1 BD (skip Sat/Sun)', () => {
    expect(businessDaysBetween(iso('2026-04-24'), iso('2026-04-27'))).toBe(1);
  });
});
