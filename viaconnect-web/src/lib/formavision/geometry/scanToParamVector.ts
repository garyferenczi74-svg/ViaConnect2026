// Pure mapper: real scan data -> BodyParamVector (Prompt 210b, task P1-T2).
//
// This closes the FormaVision data loop: scan numbers -> param vector -> geometry,
// so the avatar body shape is a deterministic function of the user's own
// measurements and can never drift from them. The render layer (P1-T4) calls this
// then buildBodyGeometry. Pure and deterministic: no Math.random, no Date, no IO.
//
// UNKNOWN preservation is the core contract for *measured* girths. A null or
// absent circumference stays null unless a composition estimate (body-fat range
// and optional WHR) is present. Measured circumferences always win. Estimate
// fill is flagged estimated=true so the mesh can morph from a FormaVision
// upload/live analyze when the geometric girth write is empty.

import { CIRC_DELTA_PER_BF_POINT, FLOOR_CM } from '@/lib/arnold/scanning/futureMeProjector';
import { templateForSex } from './types';
import type { ArmParam, BodyParamVector, BodyRing, Sex } from './types';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import type {
  CircumferenceMeasurements,
  MeasurementKey,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';

// Meters per inch and per centimeter. CircumferenceMeasurements values carry no
// embedded unit. useCircumferenceData returns values ALREADY converted to its
// opts.displayUnit (see useCircumferenceData.ts where latest/previous are run
// through convertAllMeasurements into displayUnit, not entryUnit), so the caller
// (P1-T4) MUST pass that SAME displayUnit into the unit field below. Passing
// entryUnit, or assuming inches when the values are in cm, silently yields a
// wrong-size body.
const METERS_PER_INCH = 0.0254;
const METERS_PER_CM = 0.01;

// Optional per-level scan semi-axes in cm (210c Task 8 / 210h Rev C).
export interface ScanSemiAxesCm {
  aCm: number | null;
  bCm: number | null;
}

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
  // Prompt 210h: optional measured semi-axes (cm) keyed by ring id (neck, chest,
  // waist, hip, rThigh, ...). When present, mesh uses user contours directly.
  semiAxesByRingId?: Partial<Record<string, ScanSemiAxesCm>> | null;
}

// Sex-template bodies are roughly this body-fat. Estimate fill deltas off this
// so a 12% scan looks leaner than the template and a 30% scan looks fuller.
const TEMPLATE_BF_PCT: Record<Sex, number> = { male: 18, female: 26 };

const RING_TO_BF_DELTA: Record<string, keyof typeof CIRC_DELTA_PER_BF_POINT> = {
  neck: 'neck',
  chest: 'chest',
  waist: 'waist',
  hip: 'hip',
  rThigh: 'thigh',
  lThigh: 'thigh',
  rCalf: 'calf',
  lCalf: 'calf',
};

function resolveEstimateBfPct(snapshot: CompositionSnapshot | null): number | null {
  if (!snapshot) return null;
  const mid = snapshot.totalBodyFatPct;
  if (typeof mid === 'number' && Number.isFinite(mid) && mid > 0) return mid;
  const min = snapshot.estimatedBodyFatMin;
  const max = snapshot.estimatedBodyFatMax;
  if (typeof min === 'number' && typeof max === 'number' && Number.isFinite(min) && Number.isFinite(max)) {
    return (min + max) / 2;
  }
  return null;
}

function resolveEstimateWhr(snapshot: CompositionSnapshot | null): number | null {
  if (!snapshot) return null;
  const min = snapshot.estimatedWhrMin;
  const max = snapshot.estimatedWhrMax;
  if (typeof min === 'number' && typeof max === 'number' && Number.isFinite(min) && Number.isFinite(max)) {
    const mid = (min + max) / 2;
    return mid > 0.5 && mid < 1.4 ? mid : null;
  }
  return null;
}

function estimateCircumferenceM(
  templateM: number,
  ringId: string,
  bfPct: number,
  sex: Sex,
): number {
  const region = RING_TO_BF_DELTA[ringId];
  if (!region) return templateM;
  const deltaCm = (bfPct - TEMPLATE_BF_PCT[sex]) * CIRC_DELTA_PER_BF_POINT[region];
  return Math.max(FLOOR_CM / 100, templateM + deltaCm / 100);
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
  const estimateBfPct = resolveEstimateBfPct(input.snapshot);
  const estimateWhr = resolveEstimateWhr(input.snapshot);

  // Build one ring per template ring, carrying the template's levelN and aspect
  // ratio (geometry hints) and filling the circumference from the matching
  // measurement in meters. UNKNOWN rings stay null unless a composition
  // estimate can scale the sex-template girth (still flagged estimated).
  const semi = input.semiAxesByRingId ?? null;
  const rings: BodyRing[] = template.rings.map((tplRing) => {
    const key = RING_TO_MEASUREMENT[tplRing.id];
    const raw = key && circumferences ? circumferences[key] : null;
    let circumferenceM = toMeters(raw, factor);
    let estimated = circumferenceM === null;
    if (circumferenceM === null && estimateBfPct !== null) {
      circumferenceM = estimateCircumferenceM(tplRing.circumferenceM, tplRing.id, estimateBfPct, sex);
      estimated = true;
    }
    const axes = semi ? semi[tplRing.id] : undefined;
    // Semi-axes from the scan engine are always in cm.
    const aM =
      axes?.aCm !== null && axes?.aCm !== undefined && axes.aCm > 0
        ? axes.aCm * METERS_PER_CM
        : null;
    const bM =
      axes?.bCm !== null && axes?.bCm !== undefined && axes.bCm > 0
        ? axes.bCm * METERS_PER_CM
        : null;
    const aspectRatio =
      aM !== null && bM !== null && aM > 0 ? bM / aM : tplRing.aspectRatio;
    return {
      id: tplRing.id,
      levelN: tplRing.levelN,
      circumferenceM,
      aspectRatio,
      aM,
      bM,
      estimated,
    };
  });

  if (estimateWhr !== null) {
    const waist = rings.find((r) => r.id === 'waist');
    const hip = rings.find((r) => r.id === 'hip');
    if (waist && hip && waist.estimated && hip.estimated && hip.circumferenceM !== null) {
      waist.circumferenceM = Math.max(FLOOR_CM / 100, hip.circumferenceM * estimateWhr);
    }
  }

  const arms: ArmParam[] = (['r', 'l'] as const).map((side) => {
    const bicepKey: MeasurementKey = side === 'r' ? 'rightBicep' : 'leftBicep';
    const forearmKey: MeasurementKey = side === 'r' ? 'rightForearm' : 'leftForearm';
    const measuredBicepM = toMeters(circumferences ? circumferences[bicepKey] : null, factor);
    const measuredForearmM = toMeters(circumferences ? circumferences[forearmKey] : null, factor);
    let bicepM = measuredBicepM;
    let forearmM = measuredForearmM;
    if (bicepM === null && estimateBfPct !== null) {
      const deltaCm = (estimateBfPct - TEMPLATE_BF_PCT[sex]) * CIRC_DELTA_PER_BF_POINT.bicep;
      bicepM = Math.max(FLOOR_CM / 100, template.arm.bicepM + deltaCm / 100);
    }
    if (forearmM === null && estimateBfPct !== null) {
      const deltaCm = (estimateBfPct - TEMPLATE_BF_PCT[sex]) * CIRC_DELTA_PER_BF_POINT.bicep * 0.6;
      forearmM = Math.max(FLOOR_CM / 100, template.arm.forearmM + deltaCm / 100);
    }
    return {
      side,
      bicepM,
      forearmM,
      // Measured-missing (or estimate-filled) arms stay estimated so geometry
      // can still mark the limb as non-tape.
      estimated: measuredBicepM === null || measuredForearmM === null,
    };
  });

  return {
    sex,
    heightM,
    rings,
    arms,
  };
}
