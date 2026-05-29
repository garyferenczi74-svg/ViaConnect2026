// =============================================================================
// Practitioner Body Scan tab: pure data-shaping + compliance logic.
// Prompt #169 Task 3 (spec section 12).
// =============================================================================
// This module holds the testable, framework-free logic the Practitioner /
// Naturopath Body Scan tab depends on. The React component is a thin wrapper
// that fetches rows (via practitioner-scoped RLS) and the aggregate engagement
// score (via the existing /api/practitioner/.../engagement-score route), then
// hands the data here for shaping and renders the result.
//
// HELIX FIREWALL: the practitioner-facing surface must expose ONLY the single
// aggregate engagement score (0 to 100). No Helix tokens, achievements,
// challenges, leaderboard, streaks, or balances may appear. The
// PractitionerScanPayload type below is an explicit allow-list; the build helper
// never copies any field that is not enumerated, and a runtime guard
// (assertNoHelixExposure) rejects any object that carries a Helix-shaped key.
// =============================================================================

// -----------------------------------------------------------------------------
// Engagement score (aggregate only)
// -----------------------------------------------------------------------------

/**
 * The shape returned by GET /api/practitioner/patients/[patientId]/engagement-score.
 * Mirrors that route's explicit whitelist; we re-declare it here so the
 * practitioner tab does not depend on Next route internals.
 */
export interface EngagementScoreResponse {
  score: number;
  components: {
    protocolAdherence: number;
    assessmentEngagement: number;
    trackingConsistency: number;
    outcomeTrajectory: number;
  };
  period: { start: string; end: string };
}

/**
 * The ONLY engagement representation shown to a practitioner: a single aggregate
 * number on a 0 to 100 scale, plus the period it covers. Component sub-scores
 * are intentionally omitted from the practitioner tab surface; the spec requires
 * the practitioner and naturopath views to show only the single aggregate.
 */
export interface AggregateEngagement {
  score: number;
  periodStart: string | null;
  periodEnd: string | null;
}

/**
 * Reduce the full engagement-score response to the single aggregate number the
 * practitioner surface is allowed to show. Clamps to 0 to 100 defensively.
 */
export function toAggregateEngagement(
  res: EngagementScoreResponse | null,
): AggregateEngagement | null {
  if (!res || typeof res.score !== 'number' || Number.isNaN(res.score)) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(res.score)));
  return {
    score: clamped,
    periodStart: res.period?.start ?? null,
    periodEnd: res.period?.end ?? null,
  };
}

// -----------------------------------------------------------------------------
// Helix firewall guard
// -----------------------------------------------------------------------------

/**
 * Substrings that, if present (case-insensitively) in any key of an object
 * destined for the practitioner surface, indicate a Helix-internal leak.
 */
const HELIX_FORBIDDEN_KEY_FRAGMENTS: readonly string[] = [
  'helix',
  'token',
  'achievement',
  'challenge',
  'leaderboard',
  'balance',
  'streak',
  'reward',
];

/**
 * Returns the list of forbidden Helix-shaped keys found on an object (deep,
 * one level into nested plain objects which is all the payload uses). Empty
 * array means clean.
 */
export function findHelixExposure(obj: unknown): string[] {
  const hits: string[] = [];
  const visit = (value: unknown, path: string): void => {
    if (!value || typeof value !== 'object') return;
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (HELIX_FORBIDDEN_KEY_FRAGMENTS.some((frag) => lower.includes(frag))) {
        hits.push(path ? `${path}.${key}` : key);
      }
      visit((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key);
    }
  };
  visit(obj, '');
  return hits;
}

/**
 * Throws if the supplied practitioner payload carries any Helix-shaped field.
 * Call this on the assembled payload before it crosses into the render layer so
 * a future refactor cannot silently leak Helix internals.
 */
export function assertNoHelixExposure(payload: unknown): void {
  const hits = findHelixExposure(payload);
  if (hits.length > 0) {
    throw new Error(
      `Helix exposure in practitioner scan payload: ${hits.join(', ')}`,
    );
  }
}

// -----------------------------------------------------------------------------
// Scan measurement rows -> trend series
// -----------------------------------------------------------------------------

/**
 * One row from body_scan_measurements as the practitioner tab reads it. Only
 * the fields the trend + per-scan display use are declared.
 */
export interface ScanMeasurementRow {
  session_id: string;
  scan_date: string;
  waist_natural_circ_cm: number | null;
  hip_circ_cm: number | null;
  chest_circ_cm: number | null;
  waist_to_hip_ratio: number | null;
  body_fat_pct_mid: number | null;
  lean_mass_kg: number | null;
  fat_mass_kg: number | null;
  ffmi: number | null;
}

export interface TrendPoint {
  sessionId: string;
  date: string;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  fatMassKg: number | null;
  waistCm: number | null;
  waistToHipRatio: number | null;
}

/**
 * The trend metrics the practitioner chart can plot. Kept as a stable union so
 * the chart axis and the metric selector agree.
 */
export type TrendMetricKey = 'bodyFatPct' | 'leanMassKg' | 'fatMassKg' | 'waistCm';

export const TREND_METRICS: ReadonlyArray<{ key: TrendMetricKey; label: string; unit: string; preferDown: boolean }> = [
  { key: 'bodyFatPct', label: 'Body fat', unit: '%', preferDown: true },
  { key: 'leanMassKg', label: 'Lean mass', unit: 'kg', preferDown: false },
  { key: 'fatMassKg', label: 'Fat mass', unit: 'kg', preferDown: true },
  { key: 'waistCm', label: 'Waist', unit: 'cm', preferDown: true },
];

/**
 * Build an ascending-by-date trend series from raw measurement rows. Rows with
 * an unparseable date are dropped; ties keep input order. Pure and total.
 */
export function buildTrendSeries(rows: ScanMeasurementRow[]): TrendPoint[] {
  return rows
    .filter((r) => r.scan_date && !Number.isNaN(Date.parse(r.scan_date)))
    .map((r) => ({
      sessionId: r.session_id,
      date: r.scan_date,
      bodyFatPct: numOrNull(r.body_fat_pct_mid),
      leanMassKg: numOrNull(r.lean_mass_kg),
      fatMassKg: numOrNull(r.fat_mass_kg),
      waistCm: numOrNull(r.waist_natural_circ_cm),
      waistToHipRatio: numOrNull(r.waist_to_hip_ratio),
    }))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

/**
 * First-to-last delta for a metric across a trend series. Returns null when
 * fewer than two points carry a value for that metric.
 */
export function trendDelta(points: TrendPoint[], metric: TrendMetricKey): number | null {
  const withValue = points.filter((p) => p[metric] !== null) as Array<TrendPoint & Record<TrendMetricKey, number>>;
  if (withValue.length < 2) return null;
  const first = withValue[0][metric];
  const last = withValue[withValue.length - 1][metric];
  return Math.round((last - first) * 10) / 10;
}

function numOrNull(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

// -----------------------------------------------------------------------------
// Practitioner scan payload (explicit allow-list)
// -----------------------------------------------------------------------------

/**
 * The complete, Helix-free data the practitioner Body Scan tab renders. This is
 * an explicit allow-list: nothing outside these fields reaches the surface.
 */
export interface PractitionerScanPayload {
  patientDisplayName: string;
  scanCount: number;
  latestScanDate: string | null;
  trend: TrendPoint[];
  engagement: AggregateEngagement | null;
}

/**
 * Assemble the practitioner payload from already-fetched parts. Runs the Helix
 * firewall guard before returning so an accidental leak fails loudly in tests
 * and in development.
 */
export function buildPractitionerScanPayload(input: {
  patientDisplayName: string;
  measurementRows: ScanMeasurementRow[];
  engagement: EngagementScoreResponse | null;
}): PractitionerScanPayload {
  const trend = buildTrendSeries(input.measurementRows);
  const payload: PractitionerScanPayload = {
    patientDisplayName: input.patientDisplayName,
    scanCount: input.measurementRows.length,
    latestScanDate: trend.length > 0 ? trend[trend.length - 1].date : null,
    trend,
    engagement: toAggregateEngagement(input.engagement),
  };
  assertNoHelixExposure(payload);
  return payload;
}
