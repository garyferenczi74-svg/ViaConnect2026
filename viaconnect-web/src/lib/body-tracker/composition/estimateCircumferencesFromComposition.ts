// Explicit Analyze-overlay girths from a FormaVision composition estimate.
//
// scanToParamVector NEVER invents girth from body fat — a null ring stays null
// (INVARIANT 2 / future-self honesty). After persist-ok Analyze, the landing
// page may pass THESE measurements as circumferences so the 3D avatar morphs
// from BF/WHR. Callers that must stay honest (future-self, journey, A/B) do
// not use this helper.
//
// AVATAR MORPH ONLY — never write the cards SSOT table. Cards stay on the
// geometric / manual circ write path, not this BF→girth estimate.

import { CIRC_DELTA_PER_BF_POINT, FLOOR_CM } from '@/lib/arnold/scanning/futureMeProjector';
import { emptyMeasurements } from '@/lib/body-tracker/circumference';
import type {
  CircumferenceMeasurements,
  MeasurementKey,
  MeasurementUnit,
} from '@/lib/body-tracker/circumference';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';
import { templateForSex, type Sex } from '@/lib/formavision/geometry/types';

const TEMPLATE_BF_PCT: Record<Sex, number> = { male: 18, female: 26 };

const KEY_TO_DELTA: Partial<Record<MeasurementKey, keyof typeof CIRC_DELTA_PER_BF_POINT>> = {
  neck: 'neck',
  chest: 'chest',
  waist: 'waist',
  hip: 'hip',
  rightBicep: 'bicep',
  leftBicep: 'bicep',
  rightQuadriceps: 'thigh',
  leftQuadriceps: 'thigh',
  rightCalf: 'calf',
  leftCalf: 'calf',
};

const RING_FOR_KEY: Partial<Record<MeasurementKey, string>> = {
  neck: 'neck',
  chest: 'chest',
  waist: 'waist',
  hip: 'hip',
  rightQuadriceps: 'rThigh',
  leftQuadriceps: 'lThigh',
  rightCalf: 'rCalf',
  leftCalf: 'lCalf',
};

function resolveEstimateBfPct(snapshot: CompositionSnapshot): number | null {
  const mid = snapshot.totalBodyFatPct;
  if (typeof mid === 'number' && Number.isFinite(mid) && mid > 0) return mid;
  const min = snapshot.estimatedBodyFatMin;
  const max = snapshot.estimatedBodyFatMax;
  if (typeof min === 'number' && typeof max === 'number' && Number.isFinite(min) && Number.isFinite(max)) {
    return (min + max) / 2;
  }
  return null;
}

function resolveEstimateWhr(snapshot: CompositionSnapshot): number | null {
  const min = snapshot.estimatedWhrMin;
  const max = snapshot.estimatedWhrMax;
  if (typeof min === 'number' && typeof max === 'number' && Number.isFinite(min) && Number.isFinite(max)) {
    const mid = (min + max) / 2;
    return mid > 0.5 && mid < 1.4 ? mid : null;
  }
  return null;
}

function templateMetersForKey(sex: Sex, key: MeasurementKey): number | null {
  const template = templateForSex(sex);
  const ringId = RING_FOR_KEY[key];
  if (ringId) {
    const ring = template.rings.find((r) => r.id === ringId);
    return ring ? ring.circumferenceM : null;
  }
  if (key === 'rightBicep' || key === 'leftBicep') return template.arm.bicepM;
  if (key === 'rightForearm' || key === 'leftForearm') return template.arm.forearmM;
  return null;
}

/**
 * Build display-unit circumferences from a composition estimate so the avatar
 * can morph. Returns null when BF is unknown — never invents a body from
 * an empty snapshot.
 */
export function estimateCircumferencesFromComposition(
  snapshot: CompositionSnapshot | null,
  sex: Sex,
  unit: MeasurementUnit,
): CircumferenceMeasurements | null {
  if (!snapshot) return null;
  const bfPct = resolveEstimateBfPct(snapshot);
  if (bfPct === null) return null;

  const out = emptyMeasurements();
  const keys = Object.keys(out) as MeasurementKey[];
  for (const key of keys) {
    const templateM = templateMetersForKey(sex, key);
    if (templateM === null) {
      out[key] = null;
      continue;
    }
    const region = KEY_TO_DELTA[key];
    const deltaCm = region
      ? (bfPct - TEMPLATE_BF_PCT[sex]) * CIRC_DELTA_PER_BF_POINT[region]
      : key === 'rightForearm' || key === 'leftForearm'
        ? (bfPct - TEMPLATE_BF_PCT[sex]) * CIRC_DELTA_PER_BF_POINT.bicep * 0.6
        : 0;
    const meters = Math.max(FLOOR_CM / 100, templateM + deltaCm / 100);
    out[key] = unit === 'cm' ? meters * 100 : meters / 0.0254;
  }

  const bfWaist = out.waist;
  const whr = resolveEstimateWhr(snapshot);
  if (whr !== null && out.hip !== null) {
    const hipM = unit === 'cm' ? out.hip / 100 : out.hip * 0.0254;
    const whrWaistM = Math.max(FLOOR_CM / 100, hipM * whr);
    const bfWaistM =
      typeof bfWaist === 'number' && Number.isFinite(bfWaist)
        ? unit === 'cm'
          ? bfWaist / 100
          : bfWaist * 0.0254
        : null;
    // A moderate/default WHR (e.g. 0.84–0.88) must not collapse a high-BF
    // waist back onto the sex template (male 0.9m). WHR may only widen the
    // midsection (apple shape), never undo the BF-driven silhouette.
    const waistM =
      bfWaistM !== null ? Math.max(bfWaistM, whrWaistM) : whrWaistM;
    out.waist = unit === 'cm' ? waistM * 100 : waistM / 0.0254;
  }

  return out;
}
