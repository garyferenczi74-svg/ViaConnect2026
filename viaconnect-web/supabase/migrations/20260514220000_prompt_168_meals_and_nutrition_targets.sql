-- =============================================================================
-- Prompt 168: Meals + Nutrition Targets foundation
-- =============================================================================
-- Establishes the unified Meal Object (single source of truth) and Gordon's
-- personalized nutrition_targets table.
--
-- Per Gary's locked OQ#2 decision (Outline phase 2026-05-14): the meals table
-- carries a legacy_nutrition_log_id column so the Path A dual-write window can
-- dedupe rows when Dashboard hooks read the meals UNION nutrition_logs feed.
-- The column is nullable; new entries from cutover onward populate it when the
-- analyze-text or analyze-photo route also writes a legacy nutrition_logs row.
--
-- Per Gary's locked OQ#3 decision: snack distribution is locked-on-save. The
-- aggregator handles share/count adherence on the daily summary side; this
-- migration only persists the per-meal score frozen at save time.
--
-- Idempotency: every statement is wrapped or qualified so this migration can
-- recover from a partial-failure state without manual cleanup. The enum
-- creation uses DO-blocks with duplicate_object catch, tables use IF NOT
-- EXISTS, indexes use IF NOT EXISTS, RLS policies use DO-block catches.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE meal_source AS ENUM ('quick_log', 'full_manual', 'photo_ai', 'tracker_api', 'wearable_cgm');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quality_tier AS ENUM ('poor', 'fair', 'good', 'excellent', 'perfection');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS meals (
  meal_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type               meal_type NOT NULL,
  source                  meal_source NOT NULL,
  source_confidence       NUMERIC(3,2) NOT NULL DEFAULT 0.70,
  protein_g               NUMERIC(6,2) NOT NULL DEFAULT 0,
  carbs_g                 NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_total_g             NUMERIC(6,2) NOT NULL DEFAULT 0,
  fat_healthy_g           NUMERIC(6,2) NOT NULL DEFAULT 0,
  fiber_g                 NUMERIC(6,2) NOT NULL DEFAULT 0,
  sugar_g                 NUMERIC(6,2) NOT NULL DEFAULT 0,
  sodium_mg               NUMERIC(7,2) NOT NULL DEFAULT 0,
  calories_kcal           NUMERIC(7,2) NOT NULL DEFAULT 0,
  calories_auto_calc      BOOLEAN NOT NULL DEFAULT TRUE,
  whole_food_flag         BOOLEAN,
  ingredients_list        JSONB,
  meal_name               TEXT,
  notes                   TEXT,
  raw_input               JSONB,
  legacy_nutrition_log_id UUID NULL,
  quality_score           INTEGER,
  quality_tier            quality_tier,
  score_breakdown         JSONB,
  scored_at               TIMESTAMPTZ,
  gordon_version          TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_healthy_fat_lte_total CHECK (fat_healthy_g <= fat_total_g),
  CONSTRAINT chk_source_confidence     CHECK (source_confidence >= 0 AND source_confidence <= 1),
  CONSTRAINT chk_quality_score_range   CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_meals_user_logged      ON meals(user_id, logged_at DESC);
-- Date filtering happens at the application layer using the user's profile
-- timezone; DATE(logged_at) is not IMMUTABLE on TIMESTAMPTZ so cannot live in
-- an index expression. The (user_id, meal_type, logged_at) ordering supports
-- the "today's breakfast for user X" query via a logged_at range condition.
CREATE INDEX IF NOT EXISTS idx_meals_user_type_logged ON meals(user_id, meal_type, logged_at);
CREATE INDEX IF NOT EXISTS idx_meals_legacy_link      ON meals(legacy_nutrition_log_id) WHERE legacy_nutrition_log_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS nutrition_targets (
  target_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_from         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  daily_kcal             NUMERIC(7,2) NOT NULL,
  daily_protein_g        NUMERIC(6,2) NOT NULL,
  daily_carbs_g          NUMERIC(6,2) NOT NULL,
  daily_fat_total_g      NUMERIC(6,2) NOT NULL,
  daily_fat_saturated_g  NUMERIC(6,2) NOT NULL,
  daily_fat_unsat_g      NUMERIC(6,2) NOT NULL,
  daily_fiber_g          NUMERIC(6,2) NOT NULL,
  daily_sugar_g          NUMERIC(6,2) NOT NULL,
  daily_sodium_mg        NUMERIC(7,2) NOT NULL,
  source_caq_snapshot    JSONB NOT NULL,
  source_body_snapshot   JSONB,
  bio_opt_day            INTEGER,
  meal_distribution      JSONB NOT NULL,
  generated_by_version   TEXT NOT NULL DEFAULT 'gordon-1.0.0',
  generated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at          TIMESTAMPTZ,
  CONSTRAINT chk_daily_kcal_positive CHECK (daily_kcal > 0)
);

CREATE INDEX IF NOT EXISTS idx_nutrition_targets_user_effective
  ON nutrition_targets(user_id, effective_from DESC)
  WHERE superseded_at IS NULL;

ALTER TABLE meals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY meals_owner_select ON meals FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY meals_owner_insert ON meals FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY meals_owner_update ON meals FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY meals_owner_delete ON meals FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY nutrition_targets_owner_select ON nutrition_targets FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY nutrition_targets_owner_insert ON nutrition_targets FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY nutrition_targets_owner_update ON nutrition_targets FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_meals_updated_at BEFORE UPDATE ON meals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
