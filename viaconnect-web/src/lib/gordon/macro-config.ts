// Centralized Gordon macro constants (Prompt 173 Section 5.4).
//
// HARD RULE: this is the ONE place magic numbers live. Every macro consumer
// imports values from MACRO_CONFIG; no inlining. A future tuning pass changes
// MACRO_CONFIG only, and (a) the DB-owned authoritative goal-direction band
// lives in the fn_compute_weight_goal_direction trigger and must move in
// lockstep when maintain_threshold_kg changes here.
//
// All values match Prompt 173 Section 5.4 verbatim. The 173a amendment
// (lean-mass protein, per-diet fat split, fiber) lands in a later phase and
// extends this object; do not pre-bake those constants here.

export const MACRO_CONFIG = {
  // --- Calorie target adjustments ------------------------------------------

  // Goal-direction kcal adjustments as a share of TDEE.
  deficit_pct: 0.18,
  surplus_pct: 0.12,

  // Absolute daily caps on the kcal adjustment (max(|target - TDEE|) <= cap).
  max_deficit_kcal: 600,
  max_surplus_kcal: 500,

  // Hard sex-based calorie floors. Effective floor is max(sex floor, BMR);
  // see generateMacroTargets Step 3. Unspecified-sex defaults to the female
  // floor as the conservative choice (compliance memo decision).
  calorie_floor_female: 1200,
  calorie_floor_male: 1500,

  // --- Protein -------------------------------------------------------------

  // Goal-direction protein factor (g/kg of reference weight).
  // reference_weight_kg = goal_weight for Lose + Gain, current_weight for
  // Maintain (avoids over-prescribing protein for higher starting weights on
  // the Lose path).
  protein_factor_lose: 2.0,
  protein_factor_maintain: 1.6,
  protein_factor_gain: 1.8,

  // Sane band for the g/kg figure. The factor is clamped INTO this band
  // BEFORE the calorie-share sanity ceiling fires below.
  protein_band_min: 1.2,
  protein_band_max: 2.4,

  // Sanity ceiling: protein calories must not exceed this share of the
  // calorie target. When they would, the engine reduces the factor toward
  // protein_band_min and logs a clamp.
  protein_max_pct_of_kcal: 0.40,

  // --- Fat -----------------------------------------------------------------

  // Fat as a share of the calorie target.
  fat_pct: 0.28,

  // Hormonal-health minimum, applied per kg of CURRENT body weight (not goal
  // weight): a deficit-driven low fat target on a heavier user must still
  // satisfy this floor.
  min_fat_g_per_kg: 0.6,

  // --- Direction band ------------------------------------------------------

  // Maintain band: |goal_weight - current_weight| <= this many kg reads as
  // 'maintain'. Mirrors the SQL literal c_maintain_threshold_kg in
  // supabase/migrations/20260603100000_prompt_173_user_weight_goals.sql; the
  // DB value is authoritative for the STORED goal_direction. This constant
  // is the client-side preview mirror used by previewGoalDirection.
  maintain_threshold_kg: 1.0,

  // --- Rate cap ------------------------------------------------------------

  // Maximum recommended change per week, as a share of current body weight
  // (1% per week). Body Tracker timeline projections respect this cap too.
  weekly_rate_cap_pct: 0.01,

  // --- Safety thresholds ---------------------------------------------------

  // Healthy BMI lower bound (WHO / CDC). A goal weight implying a target BMI
  // strictly below this routes to the conservative (maintenance-only) path
  // per Section 5.5.
  healthy_bmi_min: 18.5,

  // Adult age threshold. Users under this age route to the conservative
  // path per Section 5.5 (no auto-prescribed deficit / surplus).
  adult_age_threshold: 18,

  // --- 173a Section 6 amendments (Phase 8) ---------------------------------
  //
  // Protein basis amendment: replaces the 173 g/kg total weight model with
  // a goal-multiplier on top of 0.8 g per POUND of lean body mass.
  //   protein_g = protein_g_per_lb_lbm * goal_multiplier[direction] * LBM_lbs
  // Pre-ratified 2026-06-03 (DP1): Loss 0.9, Maintenance 0.8, Gain 1.0,
  // Recomp 1.0 (Recomp is not yet a separate direction in the engine; it
  // maps to Maintain calorically with a Gain-style protein multiplier when
  // introduced). For non-Recomp users the three directions match Loss /
  // Maintain / Gain. Per ISSN literature on muscle preservation in deficit.
  protein_g_per_lb_lbm: 0.8,
  protein_multiplier_lose: 0.9,
  protein_multiplier_maintain: 0.8,
  protein_multiplier_gain: 1.0,

  // Per-diet fat share of calorie target (173a 6 + DP5). The non-keto
  // diets are direct shares; keto inverts (carbs anchored, fat balances).
  fat_pct_balanced: 0.30,
  fat_pct_mediterranean: 0.35,
  fat_pct_low_carb: 0.40,
  fat_pct_higher_carb: 0.25,
  fat_pct_plant_based: 0.30,

  // Low-carb carbohydrate cap as a share of calorie target. Any calories
  // freed by the cap reallocate to fat per 173a 5 Step 3.
  low_carb_cap_pct: 0.25,

  // Net carbohydrate cap per day under keto (grams). Fat is the balancer
  // on the keto path.
  keto_carb_cap_g: 30,

  // Fiber target: 14 g per 1000 kcal of the CALORIE TARGET (not consumed),
  // per 173a 6 + DP6. Dietary Guidelines figure.
  fiber_g_per_1000_kcal: 14,
} as const;

export type MacroConfig = typeof MACRO_CONFIG;

// Activity multipliers per Section 5.3 Step 2. Maps the Lifestyle phase's
// activity level enum to the TDEE multiplier.
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
} as const;

export type MacroActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

// Dietary choice (173a 4.2). Drives the fat + carbohydrate split. Plant-based
// follows the Balanced split per 173a 4.2 (it affects food sourcing and
// suggestions, not the macro targets).
export type DietaryChoice =
  | 'balanced'
  | 'mediterranean'
  | 'low_carb'
  | 'keto'
  | 'higher_carb'
  | 'plant_based';

// Pounds per kilogram. Mirrored from src/lib/weight-goals/guardrails to
// avoid an extra import for callers that only need the engine.
export const LBS_PER_KG_MACRO = 2.20462 as const;

