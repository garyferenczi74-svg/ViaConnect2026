-- =============================================================================
-- Prompt 173 Task 2 (rebuild on main 2026-06-03): user_weight_goals
-- Migration: 20260603100000_prompt_173_user_weight_goals.sql
-- Entity: Farmceutica Wellness Ltd
--
-- WHY THIS EXISTS:
--   public.user_weight_goals is the SINGLE canonical source of weight-goal
--   intent, read by the CAQ, the Body Tracker (Arnold), and the Gordon macros
--   engine. This is the data-model foundation for later Prompt 173 phases; it
--   has no UI of its own.
--
-- COMPUTED IN ONE PLACE (mirrors the Bio Optimization discipline):
--   goal_direction is DB-OWNED. A BEFORE INSERT OR UPDATE trigger
--   (fn_compute_weight_goal_direction) derives it from current_weight_kg and
--   goal_weight_kg using a 1.0 kg maintain band and OVERWRITES whatever the
--   client sent, so a client can never forge the direction. The derived value
--   is set server-side, not trusted from the client, exactly like the Bio
--   Optimization "owned by a trigger, clients cannot write it" pattern.
--
-- ENUM STYLE: matches the closest sibling health/Gordon table
--   (20260514220000_prompt_168_meals_and_nutrition_targets.sql), which declares
--   small enums as Postgres ENUM types via an idempotent DO-block with a
--   duplicate_object catch. We follow that here with weight_goal_direction.
--
-- HARD RULES: trigger function is SECURITY DEFINER with a locked search_path
--   and schema-qualified objects; RLS enabled with owner-only policies scoped
--   to (select auth.uid()) = user_id; minimum grants to authenticated;
--   idempotent (DO-block enum catch, CREATE TABLE IF NOT EXISTS, CREATE INDEX
--   IF NOT EXISTS, guarded DROP POLICY then CREATE, CREATE OR REPLACE
--   FUNCTION, guarded trigger create). No em-dashes or en-dashes; ASCII only.
-- =============================================================================


-- =============================================================================
-- 1. ENUM weight_goal_direction
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE public.weight_goal_direction AS ENUM ('lose', 'gain', 'maintain');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- 2. TABLE public.user_weight_goals
--
--    current_weight_kg is a SNAPSHOT at capture time; a later Prompt 173 phase
--    resolves the live current weight separately (do not treat this column as
--    the authoritative live weight).
--
--    source records who wrote the row ('caq' by default) so later edits from
--    the Body Tracker or settings are attributable.
--
--    goal_direction is NOT trusted from the client: the trigger in section 3
--    overwrites it on every INSERT and UPDATE. It is declared NOT NULL with no
--    default because the trigger always supplies it BEFORE the row is written.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_weight_goals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_weight_kg numeric NOT NULL,
  goal_weight_kg    numeric NOT NULL,
  goal_direction    public.weight_goal_direction NOT NULL,
  source            text NOT NULL DEFAULT 'caq',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_user_weight_goals_current_positive CHECK (current_weight_kg > 0),
  CONSTRAINT chk_user_weight_goals_goal_positive    CHECK (goal_weight_kg > 0)
);

COMMENT ON TABLE public.user_weight_goals IS
  'Canonical source of weight-goal intent (Prompt 173 Task 2). Read by CAQ, Body Tracker (Arnold), and Gordon. goal_direction is DB-owned by fn_compute_weight_goal_direction (trigger overwrites any client value); current_weight_kg is a capture-time snapshot, not the live weight.';

COMMENT ON COLUMN public.user_weight_goals.goal_direction IS
  'DB-owned. Computed in exactly one place (fn_compute_weight_goal_direction) from current_weight_kg and goal_weight_kg with a 1.0 kg maintain band. Any client-supplied value is overwritten.';

CREATE INDEX IF NOT EXISTS idx_user_weight_goals_user_created
  ON public.user_weight_goals (user_id, created_at DESC);


-- =============================================================================
-- 3. TRIGGER FUNCTION fn_compute_weight_goal_direction()
--
--    BEFORE INSERT OR UPDATE. Derives NEW.goal_direction from
--    NEW.current_weight_kg and NEW.goal_weight_kg using a 1.0 kg maintain band:
--        goal - current >  1.0  -> 'gain'
--        current - goal >  1.0  -> 'lose'
--        otherwise (abs diff <= 1.0, inclusive boundary) -> 'maintain'
--    The threshold is a tunable SQL literal so a future migration can change
--    the band in one place. The function OVERWRITES whatever the client sent,
--    so direction can never be forged. On UPDATE it also refreshes
--    NEW.updated_at.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_compute_weight_goal_direction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  -- Tunable maintain band (kilograms). Keep in sync with
  -- MACRO_CONFIG.maintain_threshold_kg in src/lib/gordon/macro-config.ts, which
  -- is the CLIENT-SIDE PREVIEW mirror. This DB value is authoritative for the
  -- stored goal_direction.
  c_maintain_threshold_kg constant numeric := 1.0;
BEGIN
  IF (NEW.goal_weight_kg - NEW.current_weight_kg) > c_maintain_threshold_kg THEN
    NEW.goal_direction := 'gain';
  ELSIF (NEW.current_weight_kg - NEW.goal_weight_kg) > c_maintain_threshold_kg THEN
    NEW.goal_direction := 'lose';
  ELSE
    NEW.goal_direction := 'maintain';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_compute_weight_goal_direction() FROM public;

DROP TRIGGER IF EXISTS trg_user_weight_goals_direction ON public.user_weight_goals;
CREATE TRIGGER trg_user_weight_goals_direction
  BEFORE INSERT OR UPDATE ON public.user_weight_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_compute_weight_goal_direction();


-- =============================================================================
-- 4. ROW LEVEL SECURITY
--    Consumer health data: strictly owner-only, no cross-user access.
-- =============================================================================
ALTER TABLE public.user_weight_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_weight_goals_owner_select ON public.user_weight_goals;
CREATE POLICY user_weight_goals_owner_select
  ON public.user_weight_goals
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS user_weight_goals_owner_insert ON public.user_weight_goals;
CREATE POLICY user_weight_goals_owner_insert
  ON public.user_weight_goals
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS user_weight_goals_owner_update ON public.user_weight_goals;
CREATE POLICY user_weight_goals_owner_update
  ON public.user_weight_goals
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS user_weight_goals_owner_delete ON public.user_weight_goals;
CREATE POLICY user_weight_goals_owner_delete
  ON public.user_weight_goals
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);


-- =============================================================================
-- 5. GRANTS
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_weight_goals TO authenticated;
