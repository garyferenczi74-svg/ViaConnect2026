-- =============================================================================
-- Prompt #169b: Body Scan "Hide specific numbers" mode (Task 15, spec section 3.2.4)
-- Migration: 20260516000090_body_scan_169b_numbers_optional.sql
--
-- A per-user, all-users body-image safeguard. When ON, the body-scan results
-- surfaces hide precise numbers and show only trend arrows + confidence ranges
-- (and hide body fat percentage + visceral fat index entirely); the user can tap
-- a metric to temporarily reveal its value.
--
-- PERSISTENCE: reuses the SAME mechanism as the existing per-user body-tracker
-- preference unit_system, which is a column on the profiles table
-- (profiles.unit_system, read in src/components/body-tracker/manual-input/
-- useCurrentUser.ts). This adds a sibling boolean column profiles.numbers_optional
-- on the SAME table, read + written through the Supabase browser client exactly
-- as unit_system and the #169a free_body_scan_used flag are. No parallel settings
-- system is introduced.
--
-- Sorts AFTER the latest #169b migration 20260516000080 and BELOW the live #170
-- range (20260516120010+).
--
-- Append-only: no DROP, no ALTER on existing columns, no editing of prior files.
-- Idempotent: ADD COLUMN IF NOT EXISTS (consistent with 20260516000070).
-- =============================================================================

-- profiles.numbers_optional: the "Hide specific numbers" preference.
-- NOT NULL DEFAULT false so existing rows read as "show numbers" (opt-in
-- safeguard, default OFF) and the app never has to handle a null tri-state.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS numbers_optional BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.numbers_optional IS
  'Prompt #169b section 3.2.4: when true, body-scan results hide precise numbers '
  '(show trend arrows + confidence ranges only) and hide body fat % + visceral '
  'fat index entirely. Per-user body-image safeguard, available to all users. '
  'Default false. Persisted on profiles alongside unit_system.';
