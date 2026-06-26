// Pure mapper: real scan data -> BodyParamVector (Prompt 210b, task P1-T2).
//
// This closes the FormaVision data loop: scan numbers -> param vector -> geometry,
// so the avatar body shape is a deterministic function of the user's own
// measurements and can never drift from them. The render layer (P1-T4) calls this
// then buildBodyGeometry. Pure and deterministic: no Math.random, no Date, no IO.
//
// UNKNOWN preservation is the core contract. A null or absent circumference stays
// null in the vector (the geometry layer substitutes the sex template and flags the
// ring estimated). Girth is NEVER fabricated from body fat percent, BMI, or any
// readout. Shape comes only from measured circumferences.

import { templateForSex } from './types';
import type { ArmParam, BodyParamVector, BodyRing, Sex } from './types';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementKey,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';

// Meters per inch and per centimeter. CircumferenceMeasurements values carry no
// embedded unit (the unit lives on CircumferenceRecord.entryUnit and is applied by
// the read hook), so the caller passes the display unit the values are currently in.
const METERS_PER_INCH = 0.0254;
const METERS_PER_CM = 0.01;

export interface ScanToParamInput {
  // Composition readouts (fat / muscle). Present for context only; this mapper does
  // NOT read girth from it. Accepted so the render layer can pass the same bundle.
  snapshot: CompositionSnapshot | null;
  // Measured circumferences, or null when none have been recorded.
  circumferences: CircumferenceMeasurements | null;
  sex: Sex;
  // Real standing height in centimeters if known (e.g. from clinical_assessments
  // per Prompt 209), else null to fall back to the sex template height.
  heightCm?: number | null;
  // The unit the circumference values are currently expressed in. Defaults to
  // inches, matching the body_tracker_weight hip storedUnit and the inch-first
  // measurement UI; pass 'cm' when the values are metric.
  unit?: MeasurementUnit;
}

// Ring id -> the circumference measurement key that fills it. shoulderWidth is a
// WIDTH, not a girth, so it is intentionally absent here and never feeds a ring.
const RING_TO_MEASUREMENT: Record<string, MeasurementKey> = {
  neck: 'neck',
  chest: 'chest',
  waist: 'waist',
  hip: 'hip',
  rThigh: 'rightQuadriceps',
  lThigh: 'leftQuadriceps',
  rCalf: 'rightCalf',
  lCalf: 'leftCalf',
};

function metersPerUnit(unit: MeasurementUnit): number {
  return unit === 'cm' ? METERS_PER_CM : METERS_PER_INCH;
}

// Convert a measurement to meters, preserving null (UNKNOWN stays UNKNOWN).
function toMeters(value: number | null | undefined, factor: number): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value * factor;
}

export function scanToParamVector(input: ScanToParamInput): BodyParamVector {
  const { sex } = input;
  const template = templateForSex(sex);
  const factor = metersPerUnit(input.unit ?? 'in');

  const heightM =
    input.heightCm !== null && input.heightCm !== undefined && input.heightCm > 0
      ? input.heightCm / 100
      : template.heightM;

  const circumferences = input.circumferences;

  // Build one ring per template ring, carrying the template's levelN and aspect
  // ratio (geometry hints) and filling the circumference from the matching
  // measurement in meters, or null when absent.
  const rings: BodyRing[] = template.rings.map((tplRing) => {
    const key = RING_TO_MEASUREMENT[tplRing.id];
    const raw = key && circumferences ? circumferences[key] : null;
    const circumferenceM = toMeters(raw, factor);
    return {
      id: tplRing.id,
      levelN: tplRing.levelN,
      circumferenceM,
      aspectRatio: tplRing.aspectRatio,
      estimated: circumferenceM === null,
    };
  });

  const arms: ArmParam[] = (['r', 'l'] as const).map((side) => {
    const bicepKey: MeasurementKey = side === 'r' ? 'rightBicep' : 'leftBicep';
    const forearmKey: MeasurementKey = side === 'r' ? 'rightForearm' : 'leftForearm';
    const bicepM = toMeters(circumferences ? circumferences[bicepKey] : null, factor);
    const forearmM = toMeters(circumferences ? circumferences[forearmKey] : null, factor);
    return {
      side,
      bicepM,
      forearmM,
      // An arm is estimated when either measurement is missing, so the geometry
      // backfills the template for that limb.
      estimated: bicepM === null || forearmM === null,
    };
  });

  return {
    sex,
    heightM,
    rings,
    arms,
  };
}
