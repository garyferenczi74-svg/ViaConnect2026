// Prompt 210g / 210e-2 Revision C: angular shape-correction for parametric rings.
//
// Pure ellipse rings produce the "barrel" look (uniform tubes). Each vertex is
// modulated by an angle-dependent factor keyed by anatomical region and sex, then
// the ring is re-normalized so circumference still matches the measured perimeter.
//
// Convention (matches buildBodyGeometry foot +Z = forward):
//   theta = 0   -> +X (right side)
//   theta = PI/2  -> +Z (front)
//   theta = PI    -> -X (left side)
//   theta = 3PI/2 -> -Z (back)

import type { Sex } from './types';

export type ShapeRegion =
  | 'head'
  | 'neck'
  | 'shoulder'
  | 'chest'
  | 'waist'
  | 'hip'
  | 'glute'
  | 'thigh'
  | 'knee'
  | 'calf'
  | 'ankle'
  | 'arm'
  | 'default';

// Map trunk / arm level ids onto a shape region for correction selection.
export function regionForLevelId(levelId: string): ShapeRegion {
  switch (levelId) {
    case 'neckBase':
    case 'neck':
      return 'neck';
    case 'shoulder':
      return 'shoulder';
    case 'chest':
      return 'chest';
    case 'navelWaist':
    case 'lowWaist':
    case 'waist':
      return 'waist';
    case 'hip':
      return 'hip';
    case 'glute':
      return 'glute';
    case 'midThigh':
    case 'rThigh':
    case 'lThigh':
      return 'thigh';
    case 'knee':
      return 'knee';
    case 'midCalf':
    case 'rCalf':
    case 'lCalf':
      return 'calf';
    case 'ankle':
      return 'ankle';
    case 'midUpperArm':
    case 'elbow':
    case 'midForearm':
    case 'wrist':
      return 'arm';
    case 'head':
      return 'head';
    default:
      return 'default';
  }
}

/**
 * Multiplier applied to the pure-ellipse radius at angle theta.
 * Values intentionally stay away from 1.0 across the circumference for torso
 * regions so a pure-ellipse (unity) render can be detected by tests.
 */
export function shapeCorrectionFactor(
  theta: number,
  region: ShapeRegion,
  sex: Sex,
): number {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const side = Math.abs(c); // 1 at left/right, 0 at front/back
  const front = Math.max(0, s); // 1 at front
  const back = Math.max(0, -s); // 1 at back

  switch (region) {
    case 'chest': {
      // Male V-taper / female bust: wider sides, front fill, flatter back plane.
      const bust = sex === 'female' ? 0.1 * front : 0.04 * front;
      const pec = sex === 'male' ? 0.05 * front : 0;
      return 1 + 0.12 * side - 0.05 * back + bust + pec;
    }
    case 'shoulder': {
      // Broad laterally, soft front.
      return 1 + 0.16 * side - 0.03 * Math.abs(s) + (sex === 'male' ? 0.04 : 0) * side;
    }
    case 'waist': {
      // Narrower, slightly oval; female more cinched at sides.
      const cinch = sex === 'female' ? -0.06 * side : -0.02 * side;
      return 1 + cinch + 0.03 * front;
    }
    case 'hip': {
      // Wide sides; female stronger hip shelf.
      const shelf = sex === 'female' ? 0.16 * side : 0.1 * side;
      return 1 + shelf + 0.04 * front;
    }
    case 'glute': {
      // Rear mass, wide sides.
      const glute = sex === 'female' ? 0.14 * back : 0.1 * back;
      return 1 + 0.1 * side + glute - 0.03 * front;
    }
    case 'thigh':
      return 1 + 0.06 * side + 0.04 * front - 0.02 * back;
    case 'knee':
      return 1 + 0.03 * Math.abs(s);
    case 'calf':
      return 1 + 0.05 * front + 0.02 * side;
    case 'ankle':
      return 1 + 0.02 * side;
    case 'neck':
      return 1 + 0.03 * side;
    case 'head':
      // Soft ovoid face plane: slightly wider sides, flatter back of skull.
      return 1 + 0.05 * side - 0.04 * back + 0.03 * front;
    case 'arm':
      return 1 + 0.04 * Math.abs(s);
    default:
      return 1 + 0.02 * side;
  }
}

/** Peak-to-trough spread of correction over a full ring (0 when unity). */
export function correctionSpread(region: ShapeRegion, sex: Sex, samples = 64): number {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < samples; i += 1) {
    const theta = (i / samples) * Math.PI * 2;
    const f = shapeCorrectionFactor(theta, region, sex);
    if (f < min) min = f;
    if (f > max) max = f;
  }
  return max - min;
}
