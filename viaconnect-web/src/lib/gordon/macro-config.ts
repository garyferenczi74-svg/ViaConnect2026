// Centralized Gordon macro constants (Prompt 173 Section 5.4).
//
// Phase 2 of the 173 rebuild lands ONLY maintain_threshold_kg here so the
// weight-goals accessor can mirror the DB trigger band in client-side
// preview. Phase 4 (Gordon macro engine rewrite) fleshes the remaining
// constants out: deficit/surplus percentages, calorie floors, protein band,
// fat percentage, weekly rate cap, and so on (spec Section 5.4 table).
//
// HARD RULE: this is the ONE place magic numbers live. Callers import the
// values from MACRO_CONFIG, never inline them. A future tuning pass changes
// MACRO_CONFIG only; the DB-owned authoritative band lives in the
// fn_compute_weight_goal_direction trigger and must move in lockstep when
// maintain_threshold_kg changes here.

export const MACRO_CONFIG = {
  // Maintain band: when |goal_weight - current_weight| <= this many kg, the
  // direction reads as 'maintain'. Keep in sync with the SQL literal
  // c_maintain_threshold_kg in
  // supabase/migrations/20260603100000_prompt_173_user_weight_goals.sql.
  // The DB value is authoritative for the stored goal_direction; the value
  // here is the client-side preview mirror.
  maintain_threshold_kg: 1.0,
} as const;

export type MacroConfig = typeof MACRO_CONFIG;
