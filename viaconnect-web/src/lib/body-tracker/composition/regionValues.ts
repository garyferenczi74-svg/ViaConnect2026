// Pure mappers: CompositionSnapshot -> flat key-value shapes that buildBodyPartCards expects.
// null === UNKNOWN - never coerce a null region to 0.

import type { CompositionSnapshot } from './types';

export function fatValuesFromSnapshot(
  snap: CompositionSnapshot | null
): Record<string, number | null> {
  if (!snap) {
    return {
      right_arm_pct: null,
      left_arm_pct: null,
      trunk_pct: null,
      right_leg_pct: null,
      left_leg_pct: null,
      total_body_fat_pct: null,
    };
  }
  return {
    right_arm_pct: snap.regionFatPct.right_arm,
    left_arm_pct: snap.regionFatPct.left_arm,
    trunk_pct: snap.regionFatPct.trunk,
    right_leg_pct: snap.regionFatPct.right_leg,
    left_leg_pct: snap.regionFatPct.left_leg,
    total_body_fat_pct: snap.totalBodyFatPct,
  };
}

export function muscleValuesFromSnapshot(
  snap: CompositionSnapshot | null
): Record<string, number | null> {
  if (!snap) {
    return {
      right_arm_lbs: null,
      left_arm_lbs: null,
      trunk_lbs: null,
      right_leg_lbs: null,
      left_leg_lbs: null,
      total_muscle_mass_lbs: null,
      skeletal_muscle_mass_lbs: null,
    };
  }
  return {
    right_arm_lbs: snap.regionMuscleLbs.right_arm,
    left_arm_lbs: snap.regionMuscleLbs.left_arm,
    trunk_lbs: snap.regionMuscleLbs.trunk,
    right_leg_lbs: snap.regionMuscleLbs.right_leg,
    left_leg_lbs: snap.regionMuscleLbs.left_leg,
    total_muscle_mass_lbs: snap.totalMuscleMassLbs,
    skeletal_muscle_mass_lbs: snap.skeletalMuscleMassLbs,
  };
}
