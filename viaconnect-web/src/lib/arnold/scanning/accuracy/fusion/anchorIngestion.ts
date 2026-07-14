// Task 211b-W3b - Anchor ingestion: maps raw DB rows to AnchorReading, and
// gates anchors on consent_ledger state. Consumes the W3a-approved
// anchorTypes.ts shape only; does not modify or fork W3a.
//
// Sources (per docs/formavision/211b-baseline.md Workstream 3):
//   - scale : body_tracker_weight (the Prompt 201 pipeline's projection of
//     body_composition_readings), OR body_composition_readings directly.
//   - tape / dexa : user_measurement_anchors (this task's new table).
//
// Honesty: a row that cannot be mapped cleanly (unknown region, unknown unit,
// missing value) is DROPPED, never guessed or defaulted to zero. Fail-open DB
// reads return an empty list on error/timeout rather than throwing, per
// CLAUDE.md's resilience patterns; an ingestion failure must never fabricate
// an anchor or crash a caller.
//
// No em or en dashes, no emojis, zero any, TS strict.

import type { Region } from '../../types';
import type { AnchorReading, AnchorSource, StatedReliability } from './anchorTypes';
import { withTimeout } from '@/lib/utils/with-timeout';
import { getCircuitBreaker } from '@/lib/utils/circuit-breaker';
import { safeLog } from '@/lib/utils/safe-log';

const SCOPE = 'formavision.fusion.anchor-ingestion';
const READ_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Region validity (runtime companion to the Region type; no such array exists
// elsewhere in the codebase to import - GirthRegion's own local validation set
// in cohortLoader.ts covers the unrelated 8-region cohort taxonomy).
// ---------------------------------------------------------------------------

const VALID_REGIONS: ReadonlySet<string> = new Set<Region>([
  'neck', 'shoulder', 'chest', 'under_bust',
  'waist_natural', 'waist_navel', 'hip',
  'bicep', 'forearm', 'thigh', 'calf',
]);

function isRegion(v: string): v is Region {
  return VALID_REGIONS.has(v);
}

const LBS_TO_KG = 0.45359237;

// ---------------------------------------------------------------------------
// Raw row shapes (as returned by the DB client; callers inject the reader)
// ---------------------------------------------------------------------------

/** One row of body_tracker_weight (the Prompt 201 pipeline's projected table),
 *  exactly as the DB client returns it (snake_case column names). */
export interface ScaleWeightRow {
  weight_lbs: number | null;
  created_at: string;
}

/** One 'weight' row of body_composition_readings (raw Prompt 201 source),
 *  exactly as the DB client returns it. */
export interface BodyCompositionWeightRow {
  value: number | null;
  unit: string;
  measured_at: string;
}

/** One row of user_measurement_anchors (tape / dexa; source may include 'scale'
 *  per the table's CHECK, but this ingestion path never receives scale rows
 *  from that table - scale anchors come from the two functions above), exactly
 *  as the DB client returns it. source and stated_reliability are narrowed
 *  from plain strings (CHECK-constrained in the DB, not in the TS type). */
export interface UserMeasurementAnchorRow {
  source: string;
  region: string | null;
  value_cm: number | null;
  weight_kg: number | null;
  stated_reliability: string;
  taken_at: string;
}

/** One row of consent_ledger, narrowed to the fields ingestion needs, exactly
 *  as the DB client returns it. */
export interface ConsentLedgerRow {
  consent_type: string;
  granted: boolean;
  granted_at: string;
  revoked_at: string | null;
}

export type AnchorConsentType = 'scale_anchor' | 'tape_anchor' | 'dexa_anchor';

// ---------------------------------------------------------------------------
// Pure mappers (one row -> AnchorReading | null)
// ---------------------------------------------------------------------------

function isStatedReliability(v: string): v is StatedReliability {
  return v === 'high' || v === 'medium' || v === 'low';
}

/** Maps one body_tracker_weight row to a scale AnchorReading (kg). */
export function scaleAnchorFromBodyTrackerWeightRow(row: ScaleWeightRow): AnchorReading | null {
  if (row.weight_lbs === null || !Number.isFinite(row.weight_lbs) || row.weight_lbs <= 0) return null;
  return {
    source: 'scale',
    region: 'weight',
    value: Math.round(row.weight_lbs * LBS_TO_KG * 100) / 100,
    takenAt: row.created_at,
    statedReliability: 'medium',
  };
}

/** Maps one body_composition_readings 'weight' row to a scale AnchorReading (kg).
 *  Unknown units are dropped rather than guessed. */
export function scaleAnchorFromBodyCompositionReadingRow(
  row: BodyCompositionWeightRow,
): AnchorReading | null {
  if (row.value === null || !Number.isFinite(row.value) || row.value <= 0) return null;
  const unit = row.unit.toLowerCase();
  let kg: number;
  if (unit === 'kg') {
    kg = row.value;
  } else if (unit === 'lb' || unit === 'lbs') {
    kg = row.value * LBS_TO_KG;
  } else {
    return null;
  }
  return {
    source: 'scale',
    region: 'weight',
    value: Math.round(kg * 100) / 100,
    takenAt: row.measured_at,
    statedReliability: 'medium',
  };
}

/** Maps one user_measurement_anchors row to a tape or dexa AnchorReading.
 *  Drops rows whose source is not 'tape' or 'dexa', whose region is not a
 *  valid Region, whose stated_reliability is unrecognized, or whose value is
 *  missing/non-positive. */
export function anchorFromUserMeasurementAnchorRow(row: UserMeasurementAnchorRow): AnchorReading | null {
  if (row.source !== 'tape' && row.source !== 'dexa') return null;
  if (row.region === null || !isRegion(row.region)) return null;
  if (row.value_cm === null || !Number.isFinite(row.value_cm) || row.value_cm <= 0) return null;
  if (!isStatedReliability(row.stated_reliability)) return null;

  const source: AnchorSource = row.source;
  return {
    source,
    region: row.region,
    value: row.value_cm,
    takenAt: row.taken_at,
    statedReliability: row.stated_reliability,
  };
}

// ---------------------------------------------------------------------------
// Batch builders (pure)
// ---------------------------------------------------------------------------

export function buildScaleAnchorsFromWeightRows(rows: ScaleWeightRow[]): AnchorReading[] {
  const out: AnchorReading[] = [];
  for (const row of rows) {
    const anchor = scaleAnchorFromBodyTrackerWeightRow(row);
    if (anchor) out.push(anchor);
  }
  return out;
}

export function buildScaleAnchorsFromCompositionReadings(
  rows: BodyCompositionWeightRow[],
): AnchorReading[] {
  const out: AnchorReading[] = [];
  for (const row of rows) {
    const anchor = scaleAnchorFromBodyCompositionReadingRow(row);
    if (anchor) out.push(anchor);
  }
  return out;
}

/** Maps tape/dexa rows to AnchorReading[], dropping unmappable rows.
 *  Consent is NOT applied here - callers gate on hasActiveConsent separately
 *  so the pure mapping stays testable without a ledger fixture. */
export function buildTapeDexaAnchors(rows: UserMeasurementAnchorRow[]): AnchorReading[] {
  const out: AnchorReading[] = [];
  for (const row of rows) {
    const anchor = anchorFromUserMeasurementAnchorRow(row);
    if (anchor) out.push(anchor);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Consent gate
// ---------------------------------------------------------------------------

/**
 * True when the user's most recent consent_ledger row for consentType is
 * granted and not revoked. Anchor timestamp conflicts across sources are not
 * this function's concern - see personalCorrection.ts's residual-SE backstop
 * (W3a review handoff #2), which is what actually catches disagreeing anchors.
 */
export function hasActiveConsent(ledger: ConsentLedgerRow[], consentType: AnchorConsentType): boolean {
  const rows = ledger.filter(r => r.consent_type === consentType);
  if (rows.length === 0) return false;
  const latest = rows.reduce((a, b) => (a.granted_at >= b.granted_at ? a : b));
  return latest.granted && latest.revoked_at === null;
}

// ---------------------------------------------------------------------------
// Fail-open read wrapper (withTimeout + circuit breaker + safeLog, per
// CLAUDE.md's resilience patterns). Returns [] on any failure - an anchor read
// failure must never fabricate data or throw into the caller.
// ---------------------------------------------------------------------------

const anchorReadBreaker = getCircuitBreaker('formavision-fusion-anchor-reads');

export async function readAnchorsFailOpen<T>(
  operation: string,
  reader: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await anchorReadBreaker.execute(() => withTimeout(reader(), READ_TIMEOUT_MS, operation));
  } catch (error) {
    safeLog.warn(SCOPE, 'anchor read failed; failing open with empty list', {
      operation,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
