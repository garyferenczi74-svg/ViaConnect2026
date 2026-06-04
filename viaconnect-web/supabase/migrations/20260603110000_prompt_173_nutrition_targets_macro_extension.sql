-- =============================================================================
-- Prompt 173 Phase 5 (rebuild on main 2026-06-03): nutrition_targets macro
-- extension + single-writer RLS.
--
-- WHY THIS EXISTS:
--   Phase 4 introduced the weight-goal-driven macro engine in pure code
--   (src/lib/gordon/generateMacroTargets.ts). Phase 5 wires the persistence:
--   add the columns the engine's basis JSON + the effective inputs need, and
--   tighten RLS so the table has exactly ONE writer (the service-role API
--   route in src/app/api/nutrition/generate-targets/route.ts) per Section 8.
--
-- APPEND-ONLY: this is a NEW migration file. The latest existing migration is
--   ...20260603100000 (Prompt 173 Phase 2 user_weight_goals). The prior
--   nutrition_targets writer policies were declared in 20260514220000
--   (Prompt 168); this migration DROPS the client INSERT and UPDATE policies
--   only. The owner SELECT policy is KEPT so users read via the hook.
--
-- ENUM REUSE: goal_direction uses the public.weight_goal_direction enum
--   declared in 20260603100000 (Phase 2) so the three allowed values
--   (lose / gain / maintain) stay defined in exactly one place and match
--   user_weight_goals.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS; DROP POLICY IF EXISTS; comments
--   refreshed via COMMENT ON. No em-dashes / en-dashes; ASCII only.
-- =============================================================================


-- =============================================================================
-- 1. New columns on public.nutrition_targets
--    All nullable (except conservative_path, which has a safe default) so the
--    single existing active row per user is unaffected and historical rows
--    remain valid. The writer fills these on every new INSERT.
-- =============================================================================

ALTER TABLE public.nutrition_targets
  -- Effective goal direction AFTER the Section 5.5 safety paths (reuses the
  -- same enum + values as user_weight_goals.goal_direction). Nullable
  -- because legacy rows predate the weight-goal engine.
  ADD COLUMN IF NOT EXISTS goal_direction public.weight_goal_direction,
  -- The goal weight the targets were computed against (kilograms). Nullable.
  ADD COLUMN IF NOT EXISTS goal_weight_kg numeric,
  -- The resolved live current weight used for BMR/TDEE (kilograms). This is
  -- the value the resolver picked (most recent logged weight wins, else the
  -- weight-goal snapshot, else demographics). Nullable.
  ADD COLUMN IF NOT EXISTS current_weight_kg numeric,
  -- TRUE when a Section 5.5 safety path forced the conservative
  -- (maintenance-only) target. NOT NULL with a safe default so the column
  -- is always meaningful.
  ADD COLUMN IF NOT EXISTS conservative_path boolean NOT NULL DEFAULT false,
  -- Why the conservative path fired (de_safety_mode / under_18 /
  -- goal_bmi_below_floor), null when not conservative.
  ADD COLUMN IF NOT EXISTS conservative_reason text,
  -- The full Phase 4 auditable basis (jsonb): bmr, tdee, activityMultiplier,
  -- effectiveDirection, conservativePath + conservativeReason, sexEstimated,
  -- goalBmi, referenceWeightKg, effectiveFloorKcal, weeklyRateKg,
  -- weeklyRateExceedsCap, and the ordered list of clamps that fired.
  ADD COLUMN IF NOT EXISTS macro_basis jsonb;

COMMENT ON COLUMN public.nutrition_targets.macro_basis IS
  'Audit trail (Prompt 173 Section 5.6) for the weight-goal macro engine. Records how every number was produced (bmr, tdee, activity multiplier, effective direction, conservative path + reason, sex-estimated flag, goal BMI, reference weight, effective calorie floor, implied weekly rate) and exactly which safe-range clamps fired (deficit_cap, surplus_cap, calorie_floor, protein_band_min, protein_band_max, protein_pct_ceiling, fat_hormonal_floor, carb_reconcile_fat, carb_reconcile_protein). Support and compliance use this to explain a target.';

COMMENT ON COLUMN public.nutrition_targets.goal_direction IS
  'Effective goal direction (lose/gain/maintain) applied AFTER the Section 5.5 safety paths. Mirrors the user_weight_goals.goal_direction enum; for a conservative-path row this is maintain even when the stored weight-goal direction differs.';

COMMENT ON COLUMN public.nutrition_targets.current_weight_kg IS
  'Resolved live current weight (kilograms) used for BMR/TDEE: most recent body_tracker_weight log wins, else the user_weight_goals snapshot, else CAQ demographics (Section 7).';

COMMENT ON COLUMN public.nutrition_targets.goal_weight_kg IS
  'The goal weight (kilograms) the targets were computed against. Equals the user_weight_goals.goal_weight_kg row that was active at generation time.';

COMMENT ON COLUMN public.nutrition_targets.conservative_path IS
  'TRUE when a Section 5.5 safety path (DE safe mode, target BMI < 18.5, under-18) forced the conservative maintenance-only target. UI surfaces the corresponding referral note.';

COMMENT ON COLUMN public.nutrition_targets.conservative_reason IS
  'When conservative_path is TRUE this records WHY: de_safety_mode (169b body_scan_de_response active history), under_18 (age < 18 at generation), or goal_bmi_below_floor (target BMI < 18.5). NULL when conservative_path is FALSE.';


-- =============================================================================
-- 2. ONE WRITER: tighten RLS
--    Migration 20260514220000 created owner INSERT and UPDATE policies that
--    let a client write nutrition_targets rows directly. Section 8 requires
--    this table to be written in exactly ONE place. The authoritative writer
--    is the service-role Next.js API route
--    (src/app/api/nutrition/generate-targets/route.ts), which derives the
--    user from the session and BYPASSES RLS. We therefore DROP the client
--    INSERT and UPDATE policies so no client can forge or hand-edit a
--    targets row (e.g. a fabricated calorie target). The owner SELECT
--    policy is KEPT so users still read their own targets via the hook.
--
--    SAFETY: nothing client-side writes this table today. The existing
--    useNutritionTargets hook only SELECTs and (in Phase 5) calls the new
--    API route; the read path is unchanged.
-- =============================================================================

DROP POLICY IF EXISTS nutrition_targets_owner_insert ON public.nutrition_targets;
DROP POLICY IF EXISTS nutrition_targets_owner_update ON public.nutrition_targets;
-- nutrition_targets_owner_select is intentionally LEFT in place (owner-only read).
