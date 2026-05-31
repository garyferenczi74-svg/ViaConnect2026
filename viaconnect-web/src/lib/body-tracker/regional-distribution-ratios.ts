// =============================================================================
// Regional fat distribution ratios (sex-banded).
// ViaConnect Prompt #169e(a), Section 4.4. Phase 1 regional composition overlay.
// =============================================================================
//
// These are the locked sex-banded constants that apportion a single whole-body
// fat mass across four anatomical regions (trunk, arms, legs, head_neck). They
// describe the TYPICAL regional SHARE of body fat for a sex-typical distribution
// pattern, not a measurement of any individual. Each set sums to ~1.00.
//
// The overlay multiplies a user's whole-body fat_mass_kg by these shares to get a
// per-region estimated fat mass, then divides by per-region VOLUME (taken from
// the existing primitive avatar segment geometry, NOT SMPL params) to get a
// per-region adiposity density that drives the color ramp. The numbers here are
// the ONLY ratio constants; nothing downstream invents others.
//
// REFERENCES (Section 3.1). These are the peer-reviewed sources the sex-banded
// android/gynoid apportionment is grounded in. The exact percentages below are a
// curated, auditable consolidation chosen to (a) reproduce the well established
// sex difference (male android/trunk-dominant, female gynoid/lower-body-dominant)
// and (b) sum to 1.00 per sex; they are a transparent model, not a direct quote
// of any single figure, and are easy to retune in one place.
//
//   1. Karastergiou K, Smith SR, Greenberg AS, Fried SK. "Sex differences in
//      human adipose tissues - the biology of pear shape." Biology of Sex
//      Differences. 2012;3:13. (Android vs gynoid fat patterning by sex.)
//   2. Borga M, West J, Bell JD, et al. "Advanced body composition assessment:
//      from body mass index to body composition profiling." Journal of
//      Investigative Medicine. 2018;66(5):1-9. (Regional adipose compartments by
//      imaging; trunk vs limb distribution.)
//   3. Schorr M, Dichtel LE, Gerweck AV, et al. "Sex differences in body
//      composition and association with cardiometabolic risk." Biology of Sex
//      Differences. 2018;9:28. (Sex differences in trunk vs extremity fat and
//      their metabolic correlates.)
// =============================================================================

/** The four anatomical regions the overlay apportions fat across. */
export type BodyRegion = 'trunk' | 'arms' | 'legs' | 'head_neck';

export const BODY_REGIONS: readonly BodyRegion[] = [
  'trunk',
  'arms',
  'legs',
  'head_neck',
] as const;

/** A complete set of regional fat shares. Each set sums to ~1.00. */
export type RegionalRatioSet = Readonly<Record<BodyRegion, number>>;

/**
 * The distribution PATTERN a user's overlay is computed against. 'male' and
 * 'female' are the two sex-typical bands; 'averaged' is the sex-neutral midpoint
 * recommended for non-binary / intersex / prefer-not-to-say users (Section 5.1).
 */
export type DistributionPattern = 'male' | 'female' | 'averaged';

export const DISTRIBUTION_PATTERNS: readonly DistributionPattern[] = [
  'male',
  'female',
  'averaged',
] as const;

// ---------------------------------------------------------------------------
// The locked sex-banded constants (Section 4.4). DO NOT alter without a spec
// revision: the male/female sets are the source numbers; 'averaged' is their
// per-region arithmetic mean (also listed in Section 4.4 as 0.463 / 0.150 /
// 0.288 / 0.090).
// ---------------------------------------------------------------------------

/** Male sex-typical (android) pattern. Sum = 1.000. */
export const MALE_DISTRIBUTION: RegionalRatioSet = {
  trunk: 0.525,
  arms: 0.16,
  legs: 0.225,
  head_neck: 0.09,
};

/** Female sex-typical (gynoid) pattern. Sum = 0.980 (within ~1.00 tolerance). */
export const FEMALE_DISTRIBUTION: RegionalRatioSet = {
  trunk: 0.4,
  arms: 0.14,
  legs: 0.35,
  head_neck: 0.09,
};

/**
 * Sex-neutral averaged pattern (Section 4.4): the per-region mean of the male
 * and female sets. Listed in the spec as 0.463 / 0.150 / 0.288 / 0.090.
 */
export const AVERAGED_DISTRIBUTION: RegionalRatioSet = {
  trunk: 0.463,
  arms: 0.15,
  legs: 0.288,
  head_neck: 0.09,
};

/** Lookup table keyed by distribution pattern. */
export const DISTRIBUTION_BY_PATTERN: Readonly<
  Record<DistributionPattern, RegionalRatioSet>
> = {
  male: MALE_DISTRIBUTION,
  female: FEMALE_DISTRIBUTION,
  averaged: AVERAGED_DISTRIBUTION,
};

/**
 * Resolve the ratio set for a chosen distribution pattern. Total + pure; an
 * unrecognized value falls back to the averaged (sex-neutral) set so a future or
 * garbled value can never apply a sex-specific pattern by accident.
 */
export function ratiosForPattern(pattern: DistributionPattern): RegionalRatioSet {
  return DISTRIBUTION_BY_PATTERN[pattern] ?? AVERAGED_DISTRIBUTION;
}

/** Sum of a ratio set's four region shares (for validation / tests). */
export function sumRatios(set: RegionalRatioSet): number {
  return BODY_REGIONS.reduce((acc, region) => acc + set[region], 0);
}
