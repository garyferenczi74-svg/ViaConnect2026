// Pure parameter-vector interpolation for the FormaVision live morph (Prompt 210b,
// task P2-T2a). Phase 2's headline motion moment and the Phase 3 time machine both
// reduce to interpolating this vector (210a Section 2.2), so this is the shared math
// core. It is pure and deterministic: no Math.random, no Date, no IO; the same
// inputs always yield deeply equal output.
//
// Template resolution: a null (UNKNOWN) circumference is resolved to the SAME sex
// and region template default that buildBodyGeometry renders, by reading
// templateForSex (the single source of those numbers, not duplicated here), BEFORE
// the lerp runs. This keeps the morph smooth with no holes or NaN: both endpoints
// are concrete, so every intermediate state is concrete too.
//
// Estimated flags follow the TARGET (to) side. An interpolated body is a visual
// transition only; the honest known/unknown set is the destination scan's, so the
// result reports a ring or arm as estimated exactly when the target does.

import { templateForSex } from './types';
import type { ArmParam, BodyParamVector, BodyRing, Sex } from './types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Resolve a ring circumference to a concrete number: the measured value when present,
// otherwise the sex/region template default (matched by ring id). Falls back to the
// to-side aspect-derived neutral only if the id is unknown to the template.
function resolveRingCircumference(
  sex: Sex,
  ringId: string,
  circumferenceM: number | null,
): number {
  if (circumferenceM !== null && circumferenceM !== undefined) {
    return circumferenceM;
  }
  const template = templateForSex(sex);
  const templateRing = template.rings.find((r) => r.id === ringId);
  return templateRing ? templateRing.circumferenceM : 0.5;
}

function resolveArmCircumference(
  sex: Sex,
  which: 'bicep' | 'forearm',
  valueM: number | null,
): number {
  if (valueM !== null && valueM !== undefined) {
    return valueM;
  }
  const template = templateForSex(sex);
  return which === 'bicep' ? template.arm.bicepM : template.arm.forearmM;
}

// Interpolate between two body states by a caller-eased t in [0, 1] (this function
// lerps linearly; the caller applies any easing curve). heightM, every ring
// circumferenceM and aspectRatio, and every arm bicepM/forearmM are interpolated.
// Topology is preserved: the result has the same ring ids, arm sides, levels and
// count as the target, so a downstream position-attribute lerp on a fixed-topology
// geometry is valid.
export function lerpParamVector(
  from: BodyParamVector,
  to: BodyParamVector,
  t: number,
): BodyParamVector {
  // The target sex defines the result's identity and its template resolution.
  const sex = to.sex;

  const rings: BodyRing[] = to.rings.map((toRing) => {
    const fromRing = from.rings.find((r) => r.id === toRing.id);
    const fromCirc = resolveRingCircumference(
      sex,
      toRing.id,
      fromRing ? fromRing.circumferenceM : null,
    );
    const toCirc = resolveRingCircumference(sex, toRing.id, toRing.circumferenceM);
    const fromAspect = fromRing ? fromRing.aspectRatio : toRing.aspectRatio;
    return {
      id: toRing.id,
      levelN: toRing.levelN,
      circumferenceM: lerp(fromCirc, toCirc, t),
      aspectRatio: lerp(fromAspect, toRing.aspectRatio, t),
      // Honest known/unknown set follows the destination scan.
      estimated: toRing.estimated,
    };
  });

  const arms: ArmParam[] = to.arms.map((toArm) => {
    const fromArm = from.arms.find((a) => a.side === toArm.side);
    const fromBicep = resolveArmCircumference(sex, 'bicep', fromArm ? fromArm.bicepM : null);
    const toBicep = resolveArmCircumference(sex, 'bicep', toArm.bicepM);
    const fromForearm = resolveArmCircumference(sex, 'forearm', fromArm ? fromArm.forearmM : null);
    const toForearm = resolveArmCircumference(sex, 'forearm', toArm.forearmM);
    return {
      side: toArm.side,
      bicepM: lerp(fromBicep, toBicep, t),
      forearmM: lerp(fromForearm, toForearm, t),
      estimated: toArm.estimated,
    };
  });

  return {
    sex,
    heightM: lerp(from.heightM, to.heightM, t),
    rings,
    arms,
  };
}
