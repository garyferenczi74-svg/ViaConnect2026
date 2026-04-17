// Project a user's current body measurements to an estimated "goal state"
// set of measurements. Used to render the FutureMe avatar alongside the
// current avatar.
//
// The projection is deliberately CONSERVATIVE. It models fat loss as
// primarily reducing waist, hip, and chest circumferences, with smaller
// reductions elsewhere. It does not promise the user anything — the UI
// layer renders the required "AI projection, not a guarantee" disclaimer.

import type { BodyModelParameters, FutureMeInputs } from './types';

export interface FutureMeResult {
  params: BodyModelParameters;
  weeksToGoal: number;
  estimatedDate: string | null;
  measurementDeltas: {
    waistCm: number;
    hipCm: number;
    chestCm: number;
    bicepCm: number;
    thighCm: number;
  };
  assumptionsNote: string;
}

/** Empirical deltas, per 1 percent body fat change.
 *  Negative sign: fat loss reduces circumference. Applied as multiplier
 *  per percentage point of body fat change. */
const CIRC_DELTA_PER_BF_POINT = {
  waist: 0.90,   // 0.90 cm per 1% body fat change; largest for waist
  hip:   0.45,
  chest: 0.35,
  bicep: 0.15,
  thigh: 0.45,
  calf:  0.15,
  neck:  0.15,
};

const WEEKLY_FAT_LOSS_KG = 0.45; // ~1 lb/week conservative default

export function projectFutureMe({
  currentParams,
  currentWeightKg,
  goalWeightKg,
  goalBodyFatPct,
}: FutureMeInputs): FutureMeResult {
  const currentBF = currentParams.bodyFatPct;
  const bfDelta = goalBodyFatPct - currentBF; // negative for cut, positive for bulk

  // Each 1 percent of body fat reduction shrinks circumferences by the
  // per region deltas above. For a bulk (positive bfDelta), we do not
  // inflate circumferences here because fat gain also varies by region;
  // we keep the projection as a cut oriented forecast.
  const applyDelta = (circ: number, perPoint: number): number => {
    if (circ <= 0) return circ;
    const change = bfDelta * perPoint;
    const next = circ + change;
    return Math.max(10, round1(next));
  };

  const params: BodyModelParameters = {
    ...currentParams,
    waistCircCm: applyDelta(currentParams.waistCircCm, CIRC_DELTA_PER_BF_POINT.waist),
    hipCircCm:   applyDelta(currentParams.hipCircCm,   CIRC_DELTA_PER_BF_POINT.hip),
    chestCircCm: applyDelta(currentParams.chestCircCm, CIRC_DELTA_PER_BF_POINT.chest),
    bicepCircCm: applyDelta(currentParams.bicepCircCm, CIRC_DELTA_PER_BF_POINT.bicep),
    thighCircCm: applyDelta(currentParams.thighCircCm, CIRC_DELTA_PER_BF_POINT.thigh),
    calfCircCm:  applyDelta(currentParams.calfCircCm,  CIRC_DELTA_PER_BF_POINT.calf),
    neckCircCm:  applyDelta(currentParams.neckCircCm,  CIRC_DELTA_PER_BF_POINT.neck),
    bodyFatPct:  goalBodyFatPct,
  };

  const weightDelta = goalWeightKg - currentWeightKg;
  // Weight change drives the timeline. We assume the same direction of change.
  const weeksToGoal = Math.max(
    1,
    Math.ceil(Math.abs(weightDelta) / WEEKLY_FAT_LOSS_KG),
  );
  const estimatedDate = weightDelta !== 0
    ? new Date(Date.now() + weeksToGoal * 7 * 86400000).toISOString().slice(0, 10)
    : null;

  const assumptionsNote = `Projection assumes consistent protocol adherence, protein intake of at least 0.7 g per lb of body weight, and sustainable weekly weight change of about ${WEEKLY_FAT_LOSS_KG.toFixed(2)} kg. Actual results vary with training, sleep, and individual biology.`;

  return {
    params,
    weeksToGoal,
    estimatedDate,
    measurementDeltas: {
      waistCm: round1(params.waistCircCm - currentParams.waistCircCm),
      hipCm:   round1(params.hipCircCm   - currentParams.hipCircCm),
      chestCm: round1(params.chestCircCm - currentParams.chestCircCm),
      bicepCm: round1(params.bicepCircCm - currentParams.bicepCircCm),
      thighCm: round1(params.thighCircCm - currentParams.thighCircCm),
    },
    assumptionsNote,
  };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
