// Pure functions: derive + ids -> insert payloads for body_tracker_entries,
// body_tracker_segmental_fat, and (Task 10) body_tracker_circumference.
//
// Honest model: only total_body_fat_pct is written from a photo scan.
// Regional fat, visceral fat, and body water are UNKNOWN - never written as 0, never included.
//
// buildCircumferenceWrite (Task 10):
//   Maps ExtractedMeasurements -> { circ, hips } DB row shapes.
//   RULE 9: UNKNOWN (cm null) -> null in every DB column. Never 0.
//   Confidence mapping: high->0.85, moderate->0.60, low->0.35, null->null.

import type { ScanDerived } from './types';
import type { ExtractedMeasurements, MeasuredValue, ConfidenceLevel } from '@/lib/arnold/scanning/types';
import { CALIBRATION_VERSION } from '@/lib/arnold/scanning/accuracy/calibrationConfig';

// ---- confidenceToNumeric ----------------------------------------------------

/**
 * Maps a ConfidenceLevel string to a numeric score for DB storage.
 * Returns null for null or undefined inputs (honest UNKNOWN, RULE 9).
 * Mapping: high=0.85, moderate=0.60, low=0.35
 */
export function confidenceToNumeric(
  level: ConfidenceLevel | null | undefined,
): number | null {
  if (level === 'high') return 0.85;
  if (level === 'moderate') return 0.60;
  if (level === 'low') return 0.35;
  return null;
}

// ---- buildCircumferenceWrite ------------------------------------------------

/** Round to 1 decimal place (cm measurements). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Extract cm value from a MeasuredValue; null when UNKNOWN (RULE 9: never 0). */
function cmOrNull(v: MeasuredValue): number | null {
  return v.cm !== null ? round1(v.cm) : null;
}

/**
 * Numeric confidence for a MeasuredValue.
 * Returns null (not 0) when cm is null (UNKNOWN) so the confidence column
 * also reads as UNKNOWN. A present-but-low-quality measurement carries 0.35,
 * which is distinct from the null "not measured at all" state.
 */
function confOrNull(v: MeasuredValue): number | null {
  return v.cm !== null ? confidenceToNumeric(v.confidence) : null;
}

/**
 * Map ExtractedMeasurements to DB row shapes for the circumference write.
 *
 * Returns:
 *   circ - payload for body_tracker_circumference INSERT
 *   hips - { hips_in, hips_confidence } for body_tracker_weight INSERT
 *          (hip is stored in inches per MEASUREMENT_EXTERNAL_KEYS pattern)
 *
 * RULE 9: every null cm field writes NULL to the DB column (and null to
 * the matching _confidence column). Zero is NEVER written for absent measurements.
 */
export function buildCircumferenceWrite(args: {
  userId: string;
  entryId: string;
  scanId?: string;
  measurements: ExtractedMeasurements;
}): {
  circ: Record<string, unknown>;
  hips: { hips_in: number | null; hips_confidence: number | null };
} {
  const { userId, entryId, scanId = null, measurements: m } = args;

  const circ: Record<string, unknown> = {
    user_id:   userId,
    entry_id:  entryId,
    entry_unit: 'cm',
    source:    'scan',
    // body_tracker_circumference.scan_id has a FK -> body_photo_sessions(id).
    // The 209 in-memory vision scanId comes from body_tracker_photo_scans (the
    // body-scan-analyze edge function), which is NOT a body_photo_sessions id.
    // Writing the vision scanId here would cause a FK violation and silently
    // drop the circumference row. The row is already linked to the scan via
    // entry_id (which is correct and unconstrained). Always write null here.
    scan_id:   null,
    scan_calibration_version: CALIBRATION_VERSION,

    // 12 girth columns (excludes hip which lives in body_tracker_weight)
    neck:                        cmOrNull(m.neckCirc),
    neck_confidence:             confOrNull(m.neckCirc),

    shoulder_width:              cmOrNull(m.shoulderCirc),
    shoulder_width_confidence:   confOrNull(m.shoulderCirc),

    chest:                       cmOrNull(m.chestCirc),
    chest_confidence:            confOrNull(m.chestCirc),

    waist:                       cmOrNull(m.waistNaturalCirc),
    waist_confidence:            confOrNull(m.waistNaturalCirc),

    right_upper_arm:             cmOrNull(m.rightBicepCirc),
    right_upper_arm_confidence:  confOrNull(m.rightBicepCirc),

    left_upper_arm:              cmOrNull(m.leftBicepCirc),
    left_upper_arm_confidence:   confOrNull(m.leftBicepCirc),

    right_forearm:               cmOrNull(m.rightForearmCirc),
    right_forearm_confidence:    confOrNull(m.rightForearmCirc),

    left_forearm:                cmOrNull(m.leftForearmCirc),
    left_forearm_confidence:     confOrNull(m.leftForearmCirc),

    right_upper_thigh:           cmOrNull(m.rightThighCirc),
    right_upper_thigh_confidence: confOrNull(m.rightThighCirc),

    left_upper_thigh:            cmOrNull(m.leftThighCirc),
    left_upper_thigh_confidence:  confOrNull(m.leftThighCirc),

    right_calf:                  cmOrNull(m.rightCalfCirc),
    right_calf_confidence:       confOrNull(m.rightCalfCirc),

    left_calf:                   cmOrNull(m.leftCalfCirc),
    left_calf_confidence:        confOrNull(m.leftCalfCirc),
  };

  // Hip is stored in body_tracker_weight.hips_in (inches) per MEASUREMENT_EXTERNAL_KEYS.
  // Convert cm -> inches (round 1dp). Null when UNKNOWN (RULE 9: never 0).
  const hipCm = m.hipCirc.cm;
  const hips: { hips_in: number | null; hips_confidence: number | null } = {
    hips_in:         hipCm !== null ? round1(hipCm / 2.54) : null,
    hips_confidence: hipCm !== null ? confidenceToNumeric(m.hipCirc.confidence) : null,
  };

  return { circ, hips };
}

// ---- buildScanWrite (existing, preserved) -----------------------------------

export function buildScanWrite(args: {
  userId: string;
  scanId: string;
  scanDate: string;
  derived: ScanDerived;
}): { entry: Record<string, unknown>; segFat: Record<string, unknown> } {
  const { userId, scanId, scanDate, derived } = args;

  const entry: Record<string, unknown> = {
    user_id: userId,
    scan_id: scanId,
    source: 'scan',
    device_name: 'FormaVision',
    entry_date: scanDate,
    confidence: derived.confidence,
  };

  // entry_id is filled by the route after the entry insert returns its id.
  // Only write total_body_fat_pct - all other segmental fields are UNKNOWN from a photo scan.
  const segFat: Record<string, unknown> = {
    user_id: userId,
    total_body_fat_pct: derived.totalBodyFatPct,
  };

  return { entry, segFat };
}
