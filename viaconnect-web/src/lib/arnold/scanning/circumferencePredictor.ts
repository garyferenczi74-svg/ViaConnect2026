// Circumference prediction from front width + side depth.
// Primary model: Ramanujan ellipse perimeter approximation.
// Correction factors: derived from published anthropometric studies
// that relate front/side projections to tape-measured circumferences.
// NOTE: these correction factors are rough heuristics, not calibrated to
// any single population. Errors on individual measurements are typically
// +/- 3 to 7 percent; trend accuracy over repeat scans is much better.

import type { BiologicalSex, ConfidenceLevel, MeasuredValue } from './types';

export interface EllipseInputs {
  frontWidthCm: number;   // width of body at the landmark height, from front silhouette
  sideDepthCm?: number;   // depth at same height from side silhouette (optional)
  region: Region;
  sex: BiologicalSex;
}

export type Region =
  | 'neck' | 'shoulder' | 'chest' | 'under_bust'
  | 'waist_natural' | 'waist_navel' | 'hip'
  | 'bicep' | 'forearm' | 'thigh' | 'calf';

/** Region-specific correction factors applied after the Ramanujan ellipse math.
 *  Values > 1 expand the ellipse estimate; < 1 contract. Empirical heuristics. */
const REGION_CORRECTION: Record<Region, { male: number; female: number }> = {
  neck:          { male: 1.02, female: 1.02 },
  shoulder:      { male: 0.95, female: 0.96 },   // shoulder is flatter than an ellipse
  chest:         { male: 1.00, female: 1.04 },
  under_bust:    { male: 1.00, female: 1.00 },
  waist_natural: { male: 1.01, female: 1.02 },
  waist_navel:   { male: 1.02, female: 1.02 },
  hip:           { male: 1.03, female: 1.05 },   // hip cross section is not truly elliptical
  bicep:         { male: 0.98, female: 0.98 },
  forearm:       { male: 0.97, female: 0.97 },
  thigh:         { male: 1.02, female: 1.03 },
  calf:          { male: 0.99, female: 0.99 },
};

/** Ramanujan's approximation (series I) for ellipse perimeter, in cm.
 *  C ~= pi * (3(a + b) - sqrt((3a + b)(a + 3b)))  where a, b are semi-axes. */
export function ramanujanEllipsePerimeter(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

export interface CircumferencePrediction {
  circumferenceCm: number;
  uncertaintyCm: number;
  confidence: ConfidenceLevel;
  method: string;
}

/** Predict a circumference from front width plus (optional) side depth.
 *  If sideDepth is missing, assumes depth ~= 0.7 * width as a crude heuristic
 *  with widened uncertainty. */
export function predictCircumference(inputs: EllipseInputs): CircumferencePrediction {
  const { frontWidthCm, sideDepthCm, region, sex } = inputs;
  if (frontWidthCm <= 0) {
    return { circumferenceCm: 0, uncertaintyCm: 0, confidence: 'low', method: 'invalid_input' };
  }

  let depth = sideDepthCm ?? 0;
  let sideProvided = depth > 0;
  if (!sideProvided) {
    depth = frontWidthCm * depthRatioGuess(region);
  }

  const a = frontWidthCm / 2;
  const b = depth / 2;
  const raw = ramanujanEllipsePerimeter(a, b);
  const correction = REGION_CORRECTION[region][sex];
  const corrected = raw * correction;

  const uncertaintyPct = sideProvided ? 0.04 : 0.08; // 4% with side view, 8% without
  const uncertaintyCm = corrected * uncertaintyPct;

  const confidence: ConfidenceLevel =
    sideProvided && frontWidthCm > 5 ? 'moderate' :
    frontWidthCm > 5 ? 'low' :
    'low';

  return {
    circumferenceCm: round1(corrected),
    uncertaintyCm: round1(uncertaintyCm),
    confidence,
    method: sideProvided ? 'ellipse_frontSide' : 'ellipse_frontOnly',
  };
}

/** Rough default depth-to-width ratio per body region, used when only
 *  front view is available. Based on general anthropometric averages. */
function depthRatioGuess(region: Region): number {
  switch (region) {
    case 'neck':          return 0.95;
    case 'shoulder':      return 0.40;
    case 'chest':         return 0.75;
    case 'under_bust':    return 0.75;
    case 'waist_natural': return 0.80;
    case 'waist_navel':   return 0.85;
    case 'hip':           return 0.80;
    case 'bicep':         return 0.95;
    case 'forearm':       return 0.95;
    case 'thigh':         return 0.80;
    case 'calf':          return 0.95;
  }
}

export function wrapAsMeasured(p: CircumferencePrediction): MeasuredValue {
  return {
    cm: p.circumferenceCm,
    uncertaintyCm: p.uncertaintyCm,
    confidence: p.confidence,
    source: p.method,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
