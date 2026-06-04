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
