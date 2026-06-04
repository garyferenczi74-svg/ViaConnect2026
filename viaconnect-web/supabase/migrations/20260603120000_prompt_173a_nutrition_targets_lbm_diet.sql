-- =============================================================================
-- Prompt 173a Phase 8 (rebuild on main 2026-06-03): nutrition_targets LBM +
-- dietary-choice extension.
--
-- WHY THIS EXISTS:
--   The 173a Phase 8 engine rewrite changes the protein basis to 0.8 g per
--   pound of lean body mass (instead of g per kg of total weight) and lets
--   the user pick a dietary choice that drives the fat + carbohydrate split.
--   The Phase 5 macro_basis JSON column now carries lbmKg + lbmSource +
--   bodyFatFraction + effectiveDietaryChoice; this migration lifts those
--   four fields out into top-level columns so support queries + audits do
--   not have to jq into JSON.
--
-- APPEND-ONLY: this is a NEW migration. The latest existing one is
--   ...20260603110000 (Prompt 173 Phase 5 macro extension). The writer
--   continues to set macro_basis verbatim; the four new columns are a
--   convenience mirror, not a divergent source.
--
-- daily_fiber_g already exists on nutrition_targets (Prompt 168 schema);
-- the Phase 8 engine begins writing the 14-g-per-1000-kcal computed value
-- there instead of the USDA default.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS; column comments are refreshed.
-- ASCII only, no em-dashes or en-dashes.
-- =============================================================================

ALTER TABLE public.nutrition_targets
  -- Lean body mass (kilograms) the protein target was computed against.
  -- Nullable because legacy rows predate the 173a engine.
  ADD COLUMN IF NOT EXISTS lbm_kg numeric,
  -- 'measured' when LBM was derived from a known body fat fraction
  -- (FormaVision Platinum or manual Body Tracker entry), 'estimated' when
  -- the Boer fallback supplied it. NULL on legacy rows.
  ADD COLUMN IF NOT EXISTS lbm_source text,
  -- Body fat as a fraction in (0,1) when LBM was measured; NULL when LBM
  -- was estimated via Boer (no fraction was used).
  ADD COLUMN IF NOT EXISTS body_fat_fraction numeric,
  -- The dietary choice the engine actually USED (not necessarily what the
  -- user picked; the conservative path overrides keto and low_carb to
  -- 'balanced' per 173a Section 9). NULL on legacy rows.
  ADD COLUMN IF NOT EXISTS dietary_choice text;

COMMENT ON COLUMN public.nutrition_targets.lbm_kg IS
  'Lean body mass (kg) the 173a protein target was computed against. Protein = 0.8 g per lb LBM times the goal multiplier (Loss 0.9 / Maintain 0.8 / Gain 1.0).';

COMMENT ON COLUMN public.nutrition_targets.lbm_source IS
  'Origin of lbm_kg: measured (body fat fraction known) or estimated (Boer equation). UI surfaces this so users can see when their target is an estimate.';

COMMENT ON COLUMN public.nutrition_targets.body_fat_fraction IS
  'Body fat fraction in (0,1) when LBM was measured. NULL when the Boer estimate was used (no fraction is part of the estimate).';

COMMENT ON COLUMN public.nutrition_targets.dietary_choice IS
  'Dietary choice the engine USED for this row (balanced / mediterranean / low_carb / keto / higher_carb / plant_based). Conservative path overrides keto and low_carb to balanced; this column records the effective value, not the user pick.';
