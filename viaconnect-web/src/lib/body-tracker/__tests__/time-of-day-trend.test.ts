// Tests for time-of-day-trend.ts (Prompt #169b, Task 18, spec 11.1 to 11.2.3).
//
// Covers (project convention: pure node-env logic, the components are thin):
//   * minutesOfDayFromInstant: derive local time-of-day from a created_at instant
//     (pinned tz frame for determinism) + null handling.
//   * formatTimeOfDay: 12h AM/PM formatting at boundaries + wrap.
//   * computeTypicalScanMinute: circular mean (incl. the midnight-wrap case).
//   * scanTimeDeltaMinutes + isAtypicalScanTime: the >4h decision with the
//     boundary at EXACTLY 4h (NOT atypical) and just over (atypical), circular.
//   * buildSameTimeRecommendation: recommendation copy + names the last time +
//     null before first scan.
//   * computeCyclePhase / resolveCyclePhaseForScan: each phase from a start +
//     length, multi-cycle wrap, the opt-in gate, and 'unknown' on missing data.
//   * cycle opt-in default OFF + the privacy exclusion from a practitioner payload.

import { describe, it, expect } from 'vitest';
import {
  MINUTES_PER_HOUR,
  ATYPICAL_TIME_THRESHOLD_MINUTES,
  minutesOfDayFromInstant,
  formatTimeOfDay,
  computeTypicalScanMinute,
  scanTimeDeltaMinutes,
  isAtypicalScanTime,
  buildSameTimeRecommendation,
  buildTimeOfDayAnnotation,
  DEFAULT_CYCLE_ANNOTATION_OPT_IN,
  computeCyclePhase,
  resolveCyclePhaseForScan,
  buildCyclePhaseAnnotation,
  findCycleExposure,
  assertNoCycleExposure,
  stripCyclePhaseFromPractitionerPayload,
  type CyclePhase,
} from '../time-of-day-trend';

// ---------------------------------------------------------------------------
// minutesOfDayFromInstant
// ---------------------------------------------------------------------------

describe('minutesOfDayFromInstant', () => {
  it('derives local minutes-of-day in a pinned UTC frame (offset 0)', () => {
    // 2026-05-28T09:15:00Z, read in UTC -> 9*60 + 15 = 555.
    expect(minutesOfDayFromInstant('2026-05-28T09:15:00Z', 0)).toBe(9 * 60 + 15);
  });

  it('applies a negative tz offset (US Eastern standard, -300)', () => {
    // 13:45Z shifted by -300 minutes -> 08:45 local -> 525.
    expect(minutesOfDayFromInstant('2026-05-28T13:45:00Z', -300)).toBe(8 * 60 + 45);
  });

  it('wraps across midnight with a negative offset', () => {
    // 02:00Z shifted by -300 -> 21:00 previous day -> 1260.
    expect(minutesOfDayFromInstant('2026-05-28T02:00:00Z', -300)).toBe(21 * 60);
  });

  it('accepts a Date and a positive offset', () => {
    // 22:30Z + 120 -> 00:30 next day -> 30.
    const d = new Date('2026-05-28T22:30:00Z');
    expect(minutesOfDayFromInstant(d, 120)).toBe(30);
  });

  it('returns null for null/undefined/unparseable input', () => {
    expect(minutesOfDayFromInstant(null, 0)).toBeNull();
    expect(minutesOfDayFromInstant(undefined, 0)).toBeNull();
    expect(minutesOfDayFromInstant('not-a-date', 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatTimeOfDay
// ---------------------------------------------------------------------------

describe('formatTimeOfDay', () => {
  it('formats key boundaries on a 12h clock', () => {
    expect(formatTimeOfDay(0)).toBe('12:00 AM');     // midnight
    expect(formatTimeOfDay(555)).toBe('9:15 AM');
    expect(formatTimeOfDay(12 * 60)).toBe('12:00 PM'); // noon
    expect(formatTimeOfDay(13 * 60 + 45)).toBe('1:45 PM');
    expect(formatTimeOfDay(23 * 60 + 59)).toBe('11:59 PM');
  });

  it('pads minutes and wraps out-of-range values', () => {
    expect(formatTimeOfDay(7 * 60 + 5)).toBe('7:05 AM');
    expect(formatTimeOfDay(1440)).toBe('12:00 AM'); // wraps to 0
    expect(formatTimeOfDay(1440 + 555)).toBe('9:15 AM');
  });

  it('returns null for null/NaN', () => {
    expect(formatTimeOfDay(null)).toBeNull();
    expect(formatTimeOfDay(undefined)).toBeNull();
    expect(formatTimeOfDay(Number.NaN)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeTypicalScanMinute (circular mean)
// ---------------------------------------------------------------------------

describe('computeTypicalScanMinute', () => {
  it('returns null with no valid samples', () => {
    expect(computeTypicalScanMinute([])).toBeNull();
    expect(computeTypicalScanMinute([null, undefined])).toBeNull();
  });

  it('returns the single sample exactly', () => {
    expect(computeTypicalScanMinute([480])).toBe(480); // 8:00 AM
  });

  it('averages clustered morning times to their mean', () => {
    // 8:00, 8:30, 9:00 -> ~8:30 (510). Circular mean of a tight cluster equals
    // the arithmetic mean within rounding.
    const m = computeTypicalScanMinute([480, 510, 540]);
    expect(m).not.toBeNull();
    expect(Math.abs((m as number) - 510)).toBeLessThanOrEqual(1);
  });

  it('handles the midnight wrap (23:30 and 00:30 average to 00:00, not noon)', () => {
    // Naive arithmetic mean would be 720 (noon); circular mean is ~0/1440.
    const m = computeTypicalScanMinute([23 * 60 + 30, 30]) as number;
    const distFromMidnight = Math.min(m, 1440 - m);
    expect(distFromMidnight).toBeLessThanOrEqual(1);
  });

  it('ignores null entries among valid ones', () => {
    expect(computeTypicalScanMinute([null, 600, undefined])).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// scanTimeDeltaMinutes + isAtypicalScanTime (the >4h decision)
// ---------------------------------------------------------------------------

describe('scanTimeDeltaMinutes', () => {
  it('is circular: 23:00 and 01:00 are 120 minutes apart', () => {
    expect(scanTimeDeltaMinutes(23 * 60, 1 * 60)).toBe(120);
  });

  it('is symmetric and zero for identical times', () => {
    expect(scanTimeDeltaMinutes(540, 540)).toBe(0);
    expect(scanTimeDeltaMinutes(540, 600)).toBe(60);
    expect(scanTimeDeltaMinutes(600, 540)).toBe(60);
  });

  it('caps at half a day (720)', () => {
    expect(scanTimeDeltaMinutes(0, 12 * 60)).toBe(720);
  });

  it('returns null when either side is null', () => {
    expect(scanTimeDeltaMinutes(null, 540)).toBeNull();
    expect(scanTimeDeltaMinutes(540, null)).toBeNull();
  });
});

describe('isAtypicalScanTime (boundary at exactly 4 hours)', () => {
  it('confirms the threshold constant is 4 hours', () => {
    expect(ATYPICAL_TIME_THRESHOLD_MINUTES).toBe(4 * MINUTES_PER_HOUR);
    expect(ATYPICAL_TIME_THRESHOLD_MINUTES).toBe(240);
  });

  it('is NOT atypical at EXACTLY 4 hours (240 min)', () => {
    // typical 8:00 (480), scan 12:00 (720): delta 240 -> not atypical.
    expect(isAtypicalScanTime(720, 480)).toBe(false);
  });

  it('IS atypical at just over 4 hours (241 min)', () => {
    // typical 8:00 (480), scan 12:01 (721): delta 241 -> atypical.
    expect(isAtypicalScanTime(721, 480)).toBe(true);
  });

  it('is not atypical for a small delta', () => {
    expect(isAtypicalScanTime(500, 480)).toBe(false);
  });

  it('uses the circular distance (late-night vs early-morning)', () => {
    // typical 23:00 (1380), scan 04:00 (240): circular delta = 300 > 240 -> atypical.
    expect(isAtypicalScanTime(240, 1380)).toBe(true);
    // typical 23:00, scan 02:00 (120): circular delta = 180 <= 240 -> not.
    expect(isAtypicalScanTime(120, 1380)).toBe(false);
  });

  it('is never atypical when the signal is absent (no typical time / no scan time)', () => {
    expect(isAtypicalScanTime(null, 480)).toBe(false);
    expect(isAtypicalScanTime(720, null)).toBe(false);
  });

  it('honors a custom threshold parameter', () => {
    expect(isAtypicalScanTime(600, 480, 60)).toBe(true);  // 120 > 60
    expect(isAtypicalScanTime(540, 480, 60)).toBe(false); // 60 == 60, not >
  });
});

// ---------------------------------------------------------------------------
// Copy builders
// ---------------------------------------------------------------------------

describe('buildSameTimeRecommendation', () => {
  it('returns null before the first scan (no last time to anchor)', () => {
    expect(buildSameTimeRecommendation(null)).toBeNull();
    expect(buildSameTimeRecommendation(undefined)).toBeNull();
  });

  it('names the last scan time and is phrased as a recommendation', () => {
    const msg = buildSameTimeRecommendation(555) as string; // 9:15 AM
    expect(msg).toContain('same time of day');
    expect(msg).toContain('9:15 AM');
    // Recommendation, never a restriction: no blocking language.
    expect(msg.toLowerCase()).not.toContain('cannot');
    expect(msg.toLowerCase()).not.toContain('must');
  });

  it('contains no em or en dashes (standing rule)', () => {
    const msg = buildSameTimeRecommendation(555) as string;
    expect(msg).not.toMatch(/[–—]/);
  });
});

describe('buildTimeOfDayAnnotation', () => {
  it('is the subtle, non-alarming chart explanation', () => {
    const a = buildTimeOfDayAnnotation();
    expect(a).toContain('different time than your usual');
    expect(a).toContain('Some daily variation is normal');
    expect(a).not.toMatch(/[–—]/);
  });
});

// ---------------------------------------------------------------------------
// Cycle phase computation (section 11.2.3)
// ---------------------------------------------------------------------------

describe('computeCyclePhase (28-day cycle, start 2026-05-01)', () => {
  const start = '2026-05-01';
  const len = 28;
  const phaseOn = (scan: string): CyclePhase => computeCyclePhase(scan, start, len);

  it('day 1 to 5 is menstrual', () => {
    expect(phaseOn('2026-05-01')).toBe('menstrual'); // day 1
    expect(phaseOn('2026-05-03')).toBe('menstrual'); // day 3
    expect(phaseOn('2026-05-05')).toBe('menstrual'); // day 5
  });

  it('after menses and before ovulation is follicular', () => {
    expect(phaseOn('2026-05-06')).toBe('follicular'); // day 6
    expect(phaseOn('2026-05-10')).toBe('follicular'); // day 10
  });

  it('the mid-cycle window is ovulation (days 14 to 16 for L=28)', () => {
    expect(phaseOn('2026-05-14')).toBe('ovulation'); // day 14 = floor(28/2)
    expect(phaseOn('2026-05-15')).toBe('ovulation'); // day 15
    expect(phaseOn('2026-05-16')).toBe('ovulation'); // day 16
  });

  it('after ovulation is luteal', () => {
    expect(phaseOn('2026-05-17')).toBe('luteal'); // day 17
    expect(phaseOn('2026-05-28')).toBe('luteal'); // day 28
  });

  it('wraps into the next cycle (day 29 == day 1 == menstrual)', () => {
    expect(phaseOn('2026-05-29')).toBe('menstrual'); // 28 days later -> day 1
    expect(phaseOn('2026-06-11')).toBe('ovulation'); // day 14 of cycle 2
  });

  it('covers every phase value at least once across a cycle', () => {
    const seen = new Set<CyclePhase>();
    for (let day = 0; day < len; day += 1) {
      const dt = new Date(Date.parse(start) + day * 86_400_000)
        .toISOString()
        .slice(0, 10);
      seen.add(phaseOn(dt));
    }
    expect(seen.has('menstrual')).toBe(true);
    expect(seen.has('follicular')).toBe(true);
    expect(seen.has('ovulation')).toBe(true);
    expect(seen.has('luteal')).toBe(true);
  });

  it('returns unknown for missing or invalid inputs (never a guess)', () => {
    expect(computeCyclePhase(null, start, len)).toBe('unknown');
    expect(computeCyclePhase('2026-05-10', null, len)).toBe('unknown');
    expect(computeCyclePhase('2026-05-10', start, null)).toBe('unknown');
    expect(computeCyclePhase('2026-05-10', start, 0)).toBe('unknown');
    expect(computeCyclePhase('2026-05-10', start, -5)).toBe('unknown');
    expect(computeCyclePhase('bad', start, len)).toBe('unknown');
  });
});

describe('resolveCyclePhaseForScan (opt-in gate)', () => {
  it('returns unknown when NOT opted in even with full data', () => {
    expect(
      resolveCyclePhaseForScan({
        optedIn: false,
        cycleStartDate: '2026-05-01',
        cycleLengthDays: 28,
        scanDate: '2026-05-03',
      }),
    ).toBe('unknown');
  });

  it('computes the phase when opted in', () => {
    expect(
      resolveCyclePhaseForScan({
        optedIn: true,
        cycleStartDate: '2026-05-01',
        cycleLengthDays: 28,
        scanDate: '2026-05-03',
      }),
    ).toBe('menstrual');
  });

  it('returns unknown when opted in but cycle data is absent (CAQ has none yet)', () => {
    expect(
      resolveCyclePhaseForScan({
        optedIn: true,
        cycleStartDate: null,
        cycleLengthDays: null,
        scanDate: '2026-05-03',
      }),
    ).toBe('unknown');
  });
});

describe('buildCyclePhaseAnnotation', () => {
  it('builds the consumer note for a real phase', () => {
    const note = buildCyclePhaseAnnotation('luteal', true) as string;
    expect(note).toContain('luteal phase');
    expect(note).toContain('fluid retention is typical');
    expect(note).toContain('comparing across the same phase');
    expect(note).not.toMatch(/[–—]/);
  });

  it('returns null for unknown / not_applicable phases', () => {
    expect(buildCyclePhaseAnnotation('unknown', true)).toBeNull();
    expect(buildCyclePhaseAnnotation('not_applicable', true)).toBeNull();
  });

  it('returns null when not opted in (defensive)', () => {
    expect(buildCyclePhaseAnnotation('luteal', false)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Opt-in default OFF + privacy exclusion from practitioner payloads
// ---------------------------------------------------------------------------

describe('cycle opt-in default + privacy', () => {
  it('the cycle annotation opt-in DEFAULTS OFF', () => {
    expect(DEFAULT_CYCLE_ANNOTATION_OPT_IN).toBe(false);
  });

  it('findCycleExposure flags cycle/menstrual-shaped keys (deep + arrays)', () => {
    expect(findCycleExposure({ scanCount: 3, latestScanDate: '2026-05-01' })).toEqual([]);
    expect(findCycleExposure({ cycle_phase_at_scan: 'luteal' })).toContain('cycle_phase_at_scan');
    expect(
      findCycleExposure({ trend: [{ date: 'x', cycleStartDate: 'y' }] }),
    ).toContain('trend[0].cycleStartDate');
    expect(findCycleExposure({ patient: { menstrual_note: 'x' } })).toContain('patient.menstrual_note');
  });

  it('assertNoCycleExposure passes a clean practitioner-shaped payload and throws on a leak', () => {
    const clean = {
      patientDisplayName: 'Jordan',
      scanCount: 4,
      latestScanDate: '2026-05-20',
      trend: [{ sessionId: 's1', date: '2026-05-20', bodyFatPct: 21 }],
      engagement: { score: 80, periodStart: null, periodEnd: null },
    };
    expect(() => assertNoCycleExposure(clean)).not.toThrow();
    expect(() => assertNoCycleExposure({ ...clean, cycle_phase_at_scan: 'luteal' })).toThrow(
      /cycle/i,
    );
  });

  it('stripCyclePhaseFromPractitionerPayload removes cycle fields, keeps the rest', () => {
    const row = {
      session_id: 's1',
      scan_date: '2026-05-20',
      body_fat_pct_mid: 21,
      cycle_phase_at_scan: 'luteal',
      cycle_start_date: '2026-05-01',
    };
    const stripped = stripCyclePhaseFromPractitionerPayload(row) as Record<string, unknown>;
    expect(stripped.session_id).toBe('s1');
    expect(stripped.body_fat_pct_mid).toBe(21);
    expect('cycle_phase_at_scan' in stripped).toBe(false);
    expect('cycle_start_date' in stripped).toBe(false);
    // And the result is clean by the guard.
    expect(() => assertNoCycleExposure(stripped)).not.toThrow();
  });
});
