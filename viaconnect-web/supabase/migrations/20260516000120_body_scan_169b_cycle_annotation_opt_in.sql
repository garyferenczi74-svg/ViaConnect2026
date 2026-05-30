-- =============================================================================
-- Prompt #169b: Body Scan opt-in cycle-phase annotation (Task 18, spec 11.2.3)
-- Migration: 20260516000120_body_scan_169b_cycle_annotation_opt_in.sql
--
-- A per-user, CONSUMER-ONLY, GRANULAR opt-in (default OFF) for the cycle-phase
-- trend annotation. When ON, the consumer's own body-scan trend may annotate a
-- scan with the expected menstrual-cycle phase at the scan date (section 11.2.3),
-- a non-clinical "fluid retention is typical, compare across the same phase" note.
--
-- PRIVACY: cycle data is sensitive. This flag governs ONLY the consumer's own
-- surface. The annotation must never appear in a practitioner / naturopath view
-- (the practitioner Body Scan payload in src/lib/body-tracker/practitioner-scan.ts
-- is an explicit allow-list that omits cycle_phase_at_scan, and Task 18 adds a
-- belt-and-braces cycle-exposure guard). Default OFF: existing rows, and any user
-- who never opts in, are never assigned or shown a cycle phase.
--
-- PERSISTENCE: reuses the EXACT mechanism as the sibling #169b preference
-- numbers_optional (migration 20260516000090) and the existing unit_system: a
-- boolean column on the profiles table, read + written through the Supabase
-- browser client. No parallel settings system.
--
-- The per-scan computed phase itself is stored on body_photo_sessions
-- .cycle_phase_at_scan, which ALREADY EXISTS (migration 20260516000070, with a
-- CHECK constraint allowing menstrual / follicular / ovulation / luteal / unknown
-- / not_applicable). No new per-scan column is required.
--
-- Sorts AFTER the latest #169b migration 20260516000110 and BELOW the live #170
-- range (20260516120010+).
--
-- Append-only: no DROP, no ALTER on existing columns, no editing of prior files.
-- Idempotent: ADD COLUMN IF NOT EXISTS (consistent with 20260516000070/000090).
-- =============================================================================

-- profiles.cycle_phase_annotation_opt_in: the consumer-only cycle-phase
-- annotation opt-in. NOT NULL DEFAULT false so existing rows read as opted-OUT
-- (the safeguard default) and the app never has to handle a null tri-state.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cycle_phase_annotation_opt_in BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.cycle_phase_annotation_opt_in IS
  'Prompt #169b section 11.2.3: when true, the CONSUMER''s own body-scan trend may '
  'annotate scans with the expected menstrual-cycle phase at the scan date '
  '(non-clinical fluid-retention note). Granular, consumer-only opt-in; default '
  'false (OFF). Sensitive: the annotation must never appear in practitioner / '
  'naturopath views. Persisted on profiles alongside numbers_optional + unit_system.';
