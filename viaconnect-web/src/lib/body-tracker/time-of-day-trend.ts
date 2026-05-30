// =============================================================================
// Body Scan: time-of-day trend awareness + opt-in cycle-phase annotation.
// (Prompt #169b, Task 18, spec sections 11.1 to 11.2, incl. 11.2.3.)
//
// Pure, I/O-free decision logic. The project's vitest config runs node-env
// .test.ts only (see vitest.config.ts), so the testable contract lives here and
// the React components / hooks are thin wrappers, mirroring the established
// numbers-optional.ts / caq-freshness.ts pattern (pure decision tested directly).
//
// TIME SOURCE (decided against the REAL schema):
//   body_photo_sessions.session_date is DATE-only (no time component), so it
//   conveys NO time-of-day (a generated scan_time_of_day from session_date::time
//   would always be 00:00:00, see migration 20260516000070 which INTENTIONALLY
//   skipped that column). The scan-creation instant body_photo_sessions.created_at
//   (timestamptz, NOT NULL) is the time-of-day source. Each scan's LOCAL
//   time-of-day is derived from created_at in the user's own timezone (the
//   recommendation + annotation are about when the user physically scanned, so
//   the local wall-clock time is the meaningful quantity).
//
// WHAT IS HERE (logic only; the chart marker + the pre-capture banner are UI):
//   * minutesOfDayFromInstant / formatTimeOfDay  derive + format local time.
//   * computeTypicalScanMinute  the user's "typical" scan time across history.
//   * scanTimeDeltaMinutes / isAtypicalScanTime  the >4h delta decision
//     (section 11.2: a scan more than 4h from typical is annotated). Boundary at
//     exactly 4h is NOT atypical.
//   * buildSameTimeRecommendation  the post-first-scan "scan around the same
//     time" recommendation copy (section 11.1). Recommendation only, NEVER a
//     restriction; the caller surfaces it before/around capture.
//   * buildTimeOfDayAnnotation  the subtle trend-chart marker explanation.
//   * CYCLE PHASE (section 11.2.3, OPT-IN + sensitive):
//       - computeCyclePhase  expected phase from a cycle start + length (pure).
//       - DEFAULT_CYCLE_ANNOTATION_OPT_IN  the opt-in default (OFF).
//       - buildCyclePhaseAnnotation  the consumer-only annotation copy.
//       - stripCyclePhaseFromPractitionerPayload / assertNoCycleExposure  the
//         PRIVACY guard: cycle data must never reach a practitioner/naturopath
//         payload unless the patient explicitly shared. (The practitioner payload
//         in practitioner-scan.ts is already an explicit allow-list that omits
//         cycle; this is a belt-and-braces guard + the tested contract.)
//
// CYCLE-DATA SOURCE (important, see Task 18 report): computeCyclePhase takes an
// EXPLICIT cycleStartDate + cycleLengthDays. The structured menstrual-cycle data
// those inputs require (a last-menstrual-period date + cycle length) does NOT
// currently exist in the CAQ schema: clinical_assessments (CAQ Phase 1) carries
// biological_sex / date_of_birth / hormonal-symptom severity / a menopause
// health-concern flag, but NO cycle start date and NO cycle length. So the phase
// MATH is implemented + tested here, but the live wiring of the CAQ inputs is a
// reported gap (NEEDS_CONTEXT) rather than a guessed data source.
// =============================================================================

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR; // 1440

// Section 11.2: a scan captured MORE THAN 4 hours from the user's typical scan
// time is annotated. Exactly 4h is within tolerance (NOT annotated).
export const ATYPICAL_TIME_THRESHOLD_MINUTES = 4 * MINUTES_PER_HOUR; // 240

// ---------------------------------------------------------------------------
// Local time-of-day derivation (from created_at)
// ---------------------------------------------------------------------------

/**
 * The number of minutes past LOCAL midnight (0..1439) for an instant.
 *
 * `instant` is the scan-creation moment (body_photo_sessions.created_at), an ISO
 * timestamptz string or a Date. The result is the wall-clock time in the supplied
 * timezone-offset frame: by default the host's local time (the consumer's own
 * device), which is the meaningful "what time did you scan" quantity.
 *
 * For deterministic testing, an optional `tzOffsetMinutes` pins the frame: it is
 * the offset to ADD to UTC to get local time (e.g. -300 for US Eastern standard,
 * matching Date.prototype.getTimezoneOffset()'s NEGATED sign). When omitted the
 * host local time is used.
 *
 * Returns null when the instant is missing or unparseable (caller treats null as
 * "no time-of-day available", e.g. a row with no created_at).
 */
export function minutesOfDayFromInstant(
  instant: string | Date | null | undefined,
  tzOffsetMinutes?: number,
): number | null {
  if (instant == null) return null;
  const ms = instant instanceof Date ? instant.getTime() : Date.parse(instant);
  if (Number.isNaN(ms)) return null;

  if (tzOffsetMinutes === undefined) {
    const d = new Date(ms);
    return d.getHours() * MINUTES_PER_HOUR + d.getMinutes();
  }

  // Pinned frame: shift the UTC instant by the offset, then read UTC fields so
  // the host timezone never leaks into the result (keeps tests deterministic).
  const shifted = new Date(ms + tzOffsetMinutes * 60_000);
  return shifted.getUTCHours() * MINUTES_PER_HOUR + shifted.getUTCMinutes();
}

/**
 * Format a minutes-of-day value (0..1439) as a short local clock time, e.g.
 * 0 -> "12:00 AM", 555 -> "9:15 AM", 825 -> "1:45 PM", 1439 -> "11:59 PM".
 *
 * 12-hour clock with AM/PM (US locale convention used across the consumer body
 * surfaces). Out-of-range inputs are wrapped into [0,1439) so a clock-skew value
 * never throws. Returns null for a null input so callers can omit the phrase.
 */
export function formatTimeOfDay(minuteOfDay: number | null | undefined): string | null {
  if (minuteOfDay == null || Number.isNaN(minuteOfDay)) return null;
  const wrapped = ((Math.round(minuteOfDay) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours24 = Math.floor(wrapped / MINUTES_PER_HOUR);
  const minutes = wrapped % MINUTES_PER_HOUR;
  const period = hours24 < 12 ? 'AM' : 'PM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  const mm = String(minutes).padStart(2, '0');
  return `${hours12}:${mm} ${period}`;
}

// ---------------------------------------------------------------------------
// Typical scan time (circular mean over history)
// ---------------------------------------------------------------------------

/**
 * The user's "typical" scan time, in minutes-of-day (0..1439), across their
 * scan history. Returns null when there are no prior times.
 *
 * Time-of-day is CIRCULAR (23:30 and 00:30 are one hour apart, not 23 hours), so
 * a naive arithmetic mean is wrong near midnight. This uses the circular mean:
 * map each minute to an angle on the 24h circle, average the unit vectors, and
 * read the resulting angle back to minutes. With a single time the result is that
 * time. When the averaged vector is (near) zero  i.e. times spread symmetrically
 * around the clock with no central tendency  the mean is undefined; we fall back
 * to the first sample so the result is always defined and deterministic.
 */
export function computeTypicalScanMinute(
  minutesOfDay: ReadonlyArray<number | null | undefined>,
): number | null {
  const valid = minutesOfDay.filter(
    (m): m is number => m != null && Number.isFinite(m),
  );
  if (valid.length === 0) return null;
  if (valid.length === 1) return wrapMinute(valid[0]);

  let sumSin = 0;
  let sumCos = 0;
  for (const m of valid) {
    const angle = (wrapMinute(m) / MINUTES_PER_DAY) * 2 * Math.PI;
    sumSin += Math.sin(angle);
    sumCos += Math.cos(angle);
  }
  const magnitude = Math.hypot(sumSin, sumCos);
  // Degenerate: vectors cancel out (no central tendency). Deterministic fallback.
  if (magnitude < 1e-9) return wrapMinute(valid[0]);

  let meanAngle = Math.atan2(sumSin, sumCos);
  if (meanAngle < 0) meanAngle += 2 * Math.PI;
  return wrapMinute(Math.round((meanAngle / (2 * Math.PI)) * MINUTES_PER_DAY));
}

// ---------------------------------------------------------------------------
// >4h delta decision (section 11.2)
// ---------------------------------------------------------------------------

/**
 * The circular distance, in minutes (0..720), between two times-of-day. Circular
 * so e.g. 23:00 and 01:00 are 120 minutes apart, not 1320. Returns null when
 * either side is null.
 */
export function scanTimeDeltaMinutes(
  scanMinute: number | null | undefined,
  typicalMinute: number | null | undefined,
): number | null {
  if (scanMinute == null || typicalMinute == null) return null;
  if (!Number.isFinite(scanMinute) || !Number.isFinite(typicalMinute)) return null;
  const raw = Math.abs(wrapMinute(scanMinute) - wrapMinute(typicalMinute));
  return Math.min(raw, MINUTES_PER_DAY - raw);
}

/**
 * Whether a scan was taken at an ATYPICAL time, i.e. MORE THAN 4 hours from the
 * user's typical scan time (section 11.2). Exactly 4h (240 min) is NOT atypical.
 *
 * Returns false (not atypical) when the delta is unavailable (e.g. no typical
 * time yet, or no created_at): absence of signal must never raise a marker.
 * `thresholdMinutes` defaults to ATYPICAL_TIME_THRESHOLD_MINUTES but is a
 * parameter so the boundary is trivially testable.
 */
export function isAtypicalScanTime(
  scanMinute: number | null | undefined,
  typicalMinute: number | null | undefined,
  thresholdMinutes: number = ATYPICAL_TIME_THRESHOLD_MINUTES,
): boolean {
  const delta = scanTimeDeltaMinutes(scanMinute, typicalMinute);
  if (delta == null) return false;
  return delta > thresholdMinutes;
}

// ---------------------------------------------------------------------------
// Copy builders
// ---------------------------------------------------------------------------

/**
 * The post-first-scan "scan around the same time" recommendation (section 11.1).
 * Surfaced before / around capture once the user has at least one prior scan.
 *
 * RECOMMENDATION ONLY, never a restriction (the caller never blocks capture on
 * it). Returns null when there is no prior scan time to anchor on (nothing to
 * recommend yet  the very first scan has no "last scan time"). When a last time
 * is available the copy names it, per spec ("Your last scan was at TIME.").
 */
export function buildSameTimeRecommendation(
  lastScanMinute: number | null | undefined,
): string | null {
  const timeLabel = formatTimeOfDay(lastScanMinute ?? null);
  if (timeLabel == null) return null;
  return (
    'For the most reliable trend, try to scan around the same time of day. ' +
    `Your last scan was at ${timeLabel}.`
  );
}

/**
 * The subtle trend-chart annotation explanation for a scan flagged as atypical
 * (section 11.2). The chart renders a small marker; this is its explanation copy.
 * Non-alarming and non-restrictive by design.
 */
export function buildTimeOfDayAnnotation(): string {
  return (
    'This scan was taken at a different time than your usual. ' +
    'Some daily variation is normal.'
  );
}

// ---------------------------------------------------------------------------
// Cycle phase (section 11.2.3)  OPT-IN + sensitive
// ---------------------------------------------------------------------------

// The opt-in DEFAULTS OFF (section 11.2.3 + privacy posture). Mirrors the
// numbers_optional default-OFF preference; the live flag lives on a per-user
// column (profiles.cycle_phase_annotation_opt_in, migration 20260516000120).
export const DEFAULT_CYCLE_ANNOTATION_OPT_IN = false;

// The phases stored in body_photo_sessions.cycle_phase_at_scan (the CHECK in
// migration 20260516000070 allows exactly these strings).
export const CYCLE_PHASES = [
  'menstrual',
  'follicular',
  'ovulation',
  'luteal',
  'unknown',
  'not_applicable',
] as const;
export type CyclePhase = (typeof CYCLE_PHASES)[number];

// Human-readable phase label for the annotation copy.
const CYCLE_PHASE_LABEL: Readonly<Record<CyclePhase, string>> = {
  menstrual: 'menstrual',
  follicular: 'follicular',
  ovulation: 'ovulation',
  luteal: 'luteal',
  unknown: 'unknown',
  not_applicable: 'not applicable',
};

export interface CyclePhaseInput {
  // The user opted IN to cycle-phase annotation (default OFF). When false, the
  // phase is never computed and never annotated.
  optedIn: boolean;
  // The start date of the user's most recent known cycle (day 1 = first day of
  // menstruation), as an ISO date ('YYYY-MM-DD'). Null when unknown.
  cycleStartDate: string | null;
  // The user's typical cycle length in days (e.g. 28). Null when unknown.
  cycleLengthDays: number | null;
  // The scan date (body_photo_sessions.session_date, DATE-only ISO). Null when
  // unknown.
  scanDate: string | null;
}

/**
 * Compute the EXPECTED cycle phase for a scan date from a cycle start + length
 * (section 11.2.3). Pure: the caller has already resolved opt-in + the inputs.
 *
 * Phase model (proportional to cycle length L, the standard 4-phase split):
 *   day 1..5            menstrual   (first ~5 days; clamped to < L)
 *   menses..~50% of L   follicular
 *   ovulation window    ovulation   (a 3-day window centered on L/2: floor(L/2)
 *                       to floor(L/2)+2 inclusive)
 *   after ovulation     luteal      (to the end of the cycle, then wraps)
 *
 * Cycle day is 1-based: ((scanDate - cycleStartDate) mod L) + 1, so dates before
 * the start, or many cycles later, still map correctly. A non-positive / invalid
 * length or any missing/unparseable input yields 'unknown' (never a guess).
 *
 * Returns 'unknown' (not null) when not opted in is NOT this function's job: it
 * assumes the caller only calls it when relevant. To respect the opt-in use
 * resolveCyclePhaseForScan, which gates on optedIn first.
 */
export function computeCyclePhase(
  scanDate: string | null | undefined,
  cycleStartDate: string | null | undefined,
  cycleLengthDays: number | null | undefined,
): CyclePhase {
  if (!scanDate || !cycleStartDate) return 'unknown';
  if (cycleLengthDays == null || !Number.isFinite(cycleLengthDays) || cycleLengthDays <= 0) {
    return 'unknown';
  }
  const scanMs = Date.parse(scanDate);
  const startMs = Date.parse(cycleStartDate);
  if (Number.isNaN(scanMs) || Number.isNaN(startMs)) return 'unknown';

  const L = Math.round(cycleLengthDays);
  const daysSinceStart = Math.floor((scanMs - startMs) / 86_400_000);
  // 1-based cycle day, wrapped into [1, L] (handles negative + multi-cycle).
  const cycleDay = (((daysSinceStart % L) + L) % L) + 1;

  // Menses: first up to 5 days, but never the whole cycle for a very short L.
  const mensesEnd = Math.min(5, Math.max(1, L - 1));
  if (cycleDay <= mensesEnd) return 'menstrual';

  // Ovulation: a 3-day window centered on the midpoint.
  const ovStart = Math.floor(L / 2);
  const ovEnd = ovStart + 2;
  if (cycleDay >= ovStart && cycleDay <= ovEnd) return 'ovulation';

  // Before the ovulation window -> follicular; after -> luteal.
  if (cycleDay < ovStart) return 'follicular';
  return 'luteal';
}

/**
 * Respect the opt-in, then compute the phase. Returns 'unknown' when the user has
 * NOT opted in (so a non-opted-in user is never assigned a phase), otherwise
 * delegates to computeCyclePhase.
 *
 * This is the single entry point the consumer surface + the per-scan write
 * should use, so the opt-in gate is never bypassed.
 */
export function resolveCyclePhaseForScan(input: CyclePhaseInput): CyclePhase {
  if (!input.optedIn) return 'unknown';
  return computeCyclePhase(input.scanDate, input.cycleStartDate, input.cycleLengthDays);
}

/**
 * The consumer-only cycle-phase annotation copy (section 11.2.3). Non-clinical,
 * non-prescriptive. Returns null for phases that carry no fluid-retention note
 * (unknown / not_applicable), or when not opted in, so the surface shows nothing.
 *
 * PRIVACY: this string is for the CONSUMER's own surface only. It must never be
 * placed on a practitioner/naturopath payload (see stripCyclePhaseFromPractitionerPayload).
 */
export function buildCyclePhaseAnnotation(
  phase: CyclePhase,
  optedIn: boolean = true,
): string | null {
  if (!optedIn) return null;
  if (phase === 'unknown' || phase === 'not_applicable') return null;
  const label = CYCLE_PHASE_LABEL[phase];
  return (
    `This scan was during your ${label} phase, when fluid retention is typical. ` +
    'Consider comparing across the same phase for cleaner trends.'
  );
}

// ---------------------------------------------------------------------------
// PRIVACY guard: cycle data must NOT reach practitioner / naturopath views
// ---------------------------------------------------------------------------

// Key fragments that indicate cycle / menstrual data leaking into a payload that
// is bound for a practitioner or naturopath surface.
const CYCLE_FORBIDDEN_KEY_FRAGMENTS: readonly string[] = [
  'cycle_phase',
  'cyclephase',
  'cycle_start',
  'cyclestart',
  'cycle_length',
  'cyclelength',
  'menstrual',
  'menstruation',
];

/**
 * Returns the list of cycle/menstrual-shaped keys found on an object (deep over
 * nested plain objects + arrays). Empty array means clean.
 */
export function findCycleExposure(obj: unknown): string[] {
  const hits: string[] = [];
  const visit = (value: unknown, path: string): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, path ? `${path}[${i}]` : `[${i}]`));
      return;
    }
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (CYCLE_FORBIDDEN_KEY_FRAGMENTS.some((frag) => lower.includes(frag))) {
        hits.push(path ? `${path}.${key}` : key);
      }
      visit((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
    }
  };
  visit(obj, '');
  return hits;
}

/**
 * Throws if a payload destined for a practitioner / naturopath surface carries
 * any cycle/menstrual-shaped field. Belt-and-braces alongside the explicit
 * allow-list in practitioner-scan.ts.
 */
export function assertNoCycleExposure(payload: unknown): void {
  const hits = findCycleExposure(payload);
  if (hits.length > 0) {
    throw new Error(
      `Cycle/menstrual data must not appear in practitioner payload: ${hits.join(', ')}`,
    );
  }
}

/**
 * Return a SHALLOW copy of a per-scan record with every cycle/menstrual-shaped
 * field removed, for safe use building a practitioner/naturopath payload from a
 * consumer scan row. (The practitioner payload type is already an allow-list, so
 * this is defensive: it makes "no cycle data crosses the boundary" explicit and
 * tested.) Non-object input is returned unchanged.
 */
export function stripCyclePhaseFromPractitionerPayload<T>(record: T): T {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    const lower = key.toLowerCase();
    if (CYCLE_FORBIDDEN_KEY_FRAGMENTS.some((frag) => lower.includes(frag))) continue;
    out[key] = value;
  }
  return out as T;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/** Wrap a (possibly out-of-range / negative) minute value into [0, 1439]. */
function wrapMinute(m: number): number {
  return ((Math.round(m) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}
