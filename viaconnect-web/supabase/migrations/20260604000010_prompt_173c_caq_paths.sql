-- =============================================================================
-- Prompt 173c Phase D (2026-06-04): caq_paths storage + upgrade flag.
--
-- WHY THIS EXISTS:
--   173c 2.5 stores the user's selected CAQ path (quick or complete) on the
--   session so the protocol engine can read it alongside the set of
--   completed phases to determine confidence. The path choice is membership
--   tier agnostic (NOT gated by Free/Gold/Platinum). Quick is upgradeable;
--   when a Quick user later completes the remaining phases we capture the
--   upgrade timestamp here so the re-engagement loop has an honest record.
--
-- APPEND-ONLY: new migration file. The latest existing one is
--   ...20260603120000 (Prompt 173a Phase 8 LBM + dietary extension). No
--   prior migration is edited.
--
-- IDEMPOTENT: DO-block enum guard, CREATE TABLE IF NOT EXISTS, guarded
--   DROP POLICY then CREATE. ASCII only, no em-dashes or en-dashes.
-- =============================================================================


-- =============================================================================
-- 1. ENUM caq_path
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.caq_path AS ENUM ('quick', 'complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- 2. TABLE public.caq_paths
--    One row per user. picked_at records the original selection; if the
--    user picks quick and later finishes the remaining phases we set
--    upgraded_to_complete_at and update path to 'complete' in place. The
--    history is preserved through the two timestamps + the audit trail in
--    the protocol engine; we deliberately do NOT keep a separate history
--    table because the picked-once vs upgraded distinction is all the
--    confidence engine needs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.caq_paths (
  user_id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  path                     public.caq_path NOT NULL,
  picked_at                timestamptz NOT NULL DEFAULT now(),
  upgraded_to_complete_at  timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.caq_paths IS
  'CAQ path selection per user (Prompt 173c 2.5). path is the active value; picked_at is the original pick, upgraded_to_complete_at is set when a quick user later finishes the remaining phases.';

COMMENT ON COLUMN public.caq_paths.path IS
  'Active CAQ path (quick or complete). A user upgrading from quick to complete writes path = complete and sets upgraded_to_complete_at.';


-- =============================================================================
-- 3. updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION public.fn_caq_paths_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_caq_paths_set_updated_at() FROM public;

DROP TRIGGER IF EXISTS trg_caq_paths_updated_at ON public.caq_paths;
CREATE TRIGGER trg_caq_paths_updated_at
  BEFORE UPDATE ON public.caq_paths
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_caq_paths_set_updated_at();


-- =============================================================================
-- 4. ROW LEVEL SECURITY
--    Owner-only SELECT / INSERT / UPDATE scoped to (select auth.uid()) =
--    user_id. No DELETE policy: deletes are not part of the consumer
--    surface; the row clears via the auth.users CASCADE when a user
--    closes their account.
-- =============================================================================

ALTER TABLE public.caq_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS caq_paths_owner_select ON public.caq_paths;
CREATE POLICY caq_paths_owner_select
  ON public.caq_paths
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS caq_paths_owner_insert ON public.caq_paths;
CREATE POLICY caq_paths_owner_insert
  ON public.caq_paths
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS caq_paths_owner_update ON public.caq_paths;
CREATE POLICY caq_paths_owner_update
  ON public.caq_paths
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);


-- =============================================================================
-- 5. GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON public.caq_paths TO authenticated;
