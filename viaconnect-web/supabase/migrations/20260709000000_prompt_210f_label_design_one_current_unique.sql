-- =============================================================================
-- Migration: 20260709000000_prompt_210f_label_design_one_current_unique.sql
--
-- PURPOSE
-- -------
-- Adds a UNIQUE partial index on public.white_label_label_designs enforcing
-- that at most one row per (practitioner_id, product_catalog_id) pair carries
-- is_current_version = true.
--
-- MANDATE
-- -------
-- Required by the 210d whole-branch final review before F6 launch: the review
-- found that the "one current version per practitioner+product" invariant was
-- expressed only through application logic and the clone_label_design_revision
-- RPC, with no database-level uniqueness constraint backing it.
--
-- RELATIONSHIP TO F5 (20260708090000_prompt_210f_white_label_additive.sql)
-- -----------------------------------------------------------------------
-- The F5 migration's COMMENT ON FUNCTION public.clone_label_design_revision
-- already referenced this constraint by name:
--   '... so uq_label_design_one_current is never violated.'
-- That comment described a guarantee the constraint had not yet been created
-- to enforce.  This migration realizes the constraint, completing the integrity
-- guarantee the F5 clone RPC comment promised.  The F5 migration file is not
-- edited (applied migrations are immutable per standing rule #3).
--
-- SAFETY
-- ------
-- The table is EMPTY on live as of this migration's creation (F5 applied
-- 2026-07-08; F6 launch is gated on this index existing).  The unique index
-- therefore cannot conflict with any existing data.
--
-- DO NOT APPLY MANUALLY: the controller applies this migration and writes a
-- log row.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_label_design_one_current
  ON public.white_label_label_designs (practitioner_id, product_catalog_id)
  WHERE is_current_version = true;
