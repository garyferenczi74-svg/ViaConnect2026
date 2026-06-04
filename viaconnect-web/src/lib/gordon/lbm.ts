// =============================================================================
// Prompt 173a Phase 8 (rebuild on main 2026-06-03): lean body mass resolver.
// PURE, I/O-free.
//
// LBM is the basis the 173a protein target rests on (replacing 173 5.3 Step 4
// g/kg total weight with 0.8 g/lb LBM * goal multiplier). Precedence per
// 173a 4.1:
//   1. MEASURED: when a body fat fraction is known (FormaVision Platinum or
//      a manual Body Tracker entry), LBM_kg = weight_kg * (1 - body_fat_fraction).
//      Mark the target as based on a measured value (lbmSource = 'measured').
//   2. ESTIMATED: when no body fat fraction exists, use the Boer equation
//      per 173a 4.1. Mark the target as an estimate (lbmSource = 'estimated').
//      Unspecified-sex averages the male + female Boer results; the average
//      is routed through ONE named constant (UNSPECIFIED_BOER_HEIGHT_TERM +
//      UNSPECIFIED_BOER_WEIGHT_TERM + UNSPECIFIED_BOER_OFFSET) so the
//      fallback is auditable.
//
// Direction is NOT computed here (DB trigger owns it); fat-share and keto
// rules are NOT computed here either. This module only resolves LBM.
// =============================================================================

import type { BiologicalSex } from './generateMacroTargets';

export type LbmSource = 'measured' | 'estimated';

export interface LbmResolution {
  lbmKg: number;
  // The fraction the resolver actually used (a number in (0,1) when measured;
  // null when estimated).
  bodyFatFraction: number | null;
  source: LbmSource;
}

// Boer equation constants per 173a 4.1, kept as named values for audit.
const BOER_MALE_WEIGHT_TERM = 0.407;
const BOER_MALE_HEIGHT_TERM = 0.267;
const BOER_MALE_OFFSET = 19.2;

const BOER_FEMALE_WEIGHT_TERM = 0.252;
const BOER_FEMALE_HEIGHT_TERM = 0.473;
const BOER_FEMALE_OFFSET = 48.3;

// Unspecified sex averages the male + female Boer formulas. Derived once so
// the fallback is a single named computation rather than scattered math.
const UNSPECIFIED_BOER_WEIGHT_TERM = (BOER_MALE_WEIGHT_TERM + BOER_FEMALE_WEIGHT_TERM) / 2;
const UNSPECIFIED_BOER_HEIGHT_TERM = (BOER_MALE_HEIGHT_TERM + BOER_FEMALE_HEIGHT_TERM) / 2;
const UNSPECIFIED_BOER_OFFSET = (BOER_MALE_OFFSET + BOER_FEMALE_OFFSET) / 2;

function isPositiveFinite(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function boerEstimate(weightKg: number, heightCm: number, sex: BiologicalSex): number {
  if (sex === 'male') {
    return BOER_MALE_WEIGHT_TERM * weightKg + BOER_MALE_HEIGHT_TERM * heightCm - BOER_MALE_OFFSET;
  }
  if (sex === 'female') {
    return BOER_FEMALE_WEIGHT_TERM * weightKg + BOER_FEMALE_HEIGHT_TERM * heightCm - BOER_FEMALE_OFFSET;
  }
  return (
    UNSPECIFIED_BOER_WEIGHT_TERM * weightKg +
    UNSPECIFIED_BOER_HEIGHT_TERM * heightCm -
    UNSPECIFIED_BOER_OFFSET
  );
}

export interface ResolveLbmInput {
  weightKg: number;
  heightCm: number;
  biologicalSex: BiologicalSex;
  // Body fat as a fraction in (0,1). Null or out-of-range -> Boer estimate.
  bodyFatFraction: number | null;
}

/**
 * Resolve LBM with measured precedence + Boer estimate fallback. Returns
 * null when the required Boer inputs are missing (positive weight + height
 * + a recognized sex) so the engine can route the user to the
 * estimate_unavailable state rather than guess.
 */
export function resolveLeanBodyMass(input: ResolveLbmInput): LbmResolution | null {
  if (!isPositiveFinite(input.weightKg) || !isPositiveFinite(input.heightCm)) return null;

  // Measured path: only when fraction is in a plausible band (1% to 70%).
  if (
    input.bodyFatFraction !== null &&
    Number.isFinite(input.bodyFatFraction) &&
    input.bodyFatFraction > 0.01 &&
    input.bodyFatFraction < 0.70
  ) {
    const lbmKg = input.weightKg * (1 - input.bodyFatFraction);
    if (lbmKg > 0) {
      return {
        lbmKg,
        bodyFatFraction: input.bodyFatFraction,
        source: 'measured',
      };
    }
  }

  // Boer estimate.
  const lbmKg = boerEstimate(input.weightKg, input.heightCm, input.biologicalSex);
  if (!Number.isFinite(lbmKg) || lbmKg <= 0) return null;
  return {
    lbmKg,
    bodyFatFraction: null,
    source: 'estimated',
  };
}
