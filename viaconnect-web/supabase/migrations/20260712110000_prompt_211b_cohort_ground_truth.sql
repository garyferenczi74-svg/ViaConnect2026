-- =============================================================================
-- Prompt 211b Workstream 1A: FormaVision cohort ground-truth schema
-- Migration: 20260712110000_prompt_211b_cohort_ground_truth.sql
-- =============================================================================
-- PURPOSE
-- -------
-- Creates the research data tables needed for the 211b Trust Layer:
--   - cohort_subjects      : demographics + consent + chain-of-custody
--   - cohort_labeled_measurements : predicted vs truth pairs per region
--   - cohort_validation_runs      : persisted ValidationReport blobs
--
-- These tables are RESEARCH records, not consumer own-row records. RLS scopes
-- them to admin/researcher roles only via is_research_admin(), modeled after
-- is_compliance_reader() in 20260424000500_marshall_compliance.sql.
--
-- DEXA IMPORT NOTE (W3 deferral)
-- --------------------------------
-- A dexa_imports table was considered here. Decision: deferred to W3 anchor
-- work. DEXA imports carry their own reference-instrument reliability metadata
-- and warrant a dedicated migration once the W3 anchor-fusion interface is
-- defined. cohort_subjects.protocol_version covers the anchor-type notation
-- for now ('tape' | 'dexa' | 'bodpod' values can be stored there).
--
-- IDEMPOTENCY
-- -----------
-- CREATE TABLE IF NOT EXISTS, ENABLE RLS (idempotent), policies in DO blocks
-- guarded by pg_policies. No existing table, column, policy, or migration is
-- modified. All functions use SET search_path = public, pg_temp.
--
-- DO NOT APPLY MANUALLY: deferred to merge per the 211b task contract.
-- =============================================================================

-- ============================================================================
-- 0. Admin/researcher guard function
--    Mirrors is_compliance_reader() in 20260424000500_marshall_compliance.sql.
--    Research tables are restricted to admin + superadmin roles; a 'researcher'
--    role is included so a future non-admin data scientist can be granted read
--    access without full admin privileges.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_research_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (select auth.uid())
      AND p.role IN ('admin', 'superadmin', 'researcher')
  );
$$;

-- ============================================================================
-- 1. cohort_subjects
--    One row per consented research participant.
--    chain-of-custody: collected_by + collected_at + protocol_version.
--    consent_ledger_id is a soft FK to public.consent_ledger; the cohort
--    subject cannot enroll without a valid consent record on that ledger.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cohort_subjects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Minimal demographics for stratification
  sex                  TEXT NOT NULL CHECK (sex IN ('male', 'female', 'other')),
  height_cm            NUMERIC(5, 1) NOT NULL CHECK (height_cm > 0),
  weight_kg            NUMERIC(6, 2)              CHECK (weight_kg IS NULL OR weight_kg > 0),
  -- Body type / size bucket (coarse, non-identifying classification used for
  -- stratified sampling per Section 10.1). Example values: 'S','M','L','XL','XXL'.
  body_size_bucket     TEXT,

  -- Consent chain-of-custody
  -- consent_ledger_id references the consent_ledger row for this participant.
  -- Nullable because some legacy tape-measure sessions predate the ledger, but
  -- new enrollments MUST supply a ledger reference (enforced at application layer).
  consent_ledger_id    UUID REFERENCES public.consent_ledger(id) ON DELETE SET NULL,

  -- Chain-of-custody
  collected_by         UUID NOT NULL REFERENCES auth.users(id),
  collected_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- protocol_version distinguishes tape-only from DEXA-anchored sessions.
  -- Values: 'tape-v1' (initial), 'dexa-v1' (W3 anchor), 'bodpod-v1'.
  protocol_version     TEXT NOT NULL DEFAULT 'tape-v1',
  notes                TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cohort_subjects IS
  'Research participants for the 211b FormaVision accuracy cohort. '
  'Admin/researcher-scoped RLS; never consumer-visible. '
  'Chain-of-custody via collected_by + collected_at + protocol_version. '
  'consent_ledger_id links to consent_ledger (consent_type=''tape_anchor'' or ''dexa_anchor'').';

ALTER TABLE public.cohort_subjects ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cohort_subjects_sex
  ON public.cohort_subjects(sex);
CREATE INDEX IF NOT EXISTS idx_cohort_subjects_collected_by
  ON public.cohort_subjects(collected_by);
CREATE INDEX IF NOT EXISTS idx_cohort_subjects_consent
  ON public.cohort_subjects(consent_ledger_id)
  WHERE consent_ledger_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'cohort_subjects'
      AND policyname = 'Research admins can select cohort subjects'
  ) THEN
    CREATE POLICY "Research admins can select cohort subjects"
      ON public.cohort_subjects FOR SELECT TO authenticated
      USING (public.is_research_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'cohort_subjects'
      AND policyname = 'Research admins can insert cohort subjects'
  ) THEN
    CREATE POLICY "Research admins can insert cohort subjects"
      ON public.cohort_subjects FOR INSERT TO authenticated
      WITH CHECK (public.is_research_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'cohort_subjects'
      AND policyname = 'Research admins can update cohort subjects'
  ) THEN
    CREATE POLICY "Research admins can update cohort subjects"
      ON public.cohort_subjects FOR UPDATE TO authenticated
      USING  (public.is_research_admin())
      WITH CHECK (public.is_research_admin());
  END IF;
END $$;

-- ============================================================================
-- 2. cohort_labeled_measurements
--    One row per measured girth pair (predicted vs tape-measure truth) for one
--    subject + region + session. measurer_id enables inter-rater ICC analysis.
--    region matches the GirthRegion union in accuracyTargets.ts exactly.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cohort_labeled_measurements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id     UUID NOT NULL REFERENCES public.cohort_subjects(id) ON DELETE CASCADE,

  -- GirthRegion values: neck | upperArm | forearm | upperLeg | lowerLeg | chest | waist | hip
  region         TEXT NOT NULL CHECK (
                   region IN ('neck', 'upperArm', 'forearm', 'upperLeg', 'lowerLeg',
                              'chest', 'waist', 'hip')
                 ),

  -- The pipeline's calibrated output for this session (correction factors already applied).
  -- Unit: centimetres. Must be positive.
  predicted_cm   NUMERIC(6, 2) NOT NULL CHECK (predicted_cm > 0),
  -- Ground truth from tape measure (or reference instrument). Unit: centimetres.
  truth_cm       NUMERIC(6, 2) NOT NULL CHECK (truth_cm > 0),

  -- Session identifier: groups all measurements taken in one scan session.
  session_id     UUID NOT NULL,
  -- measurer_id is the researcher who performed the tape measure (not the subject).
  -- Enables inter-rater ICC analysis across measurers. Required for multi-measurer studies.
  measurer_id    UUID NOT NULL REFERENCES auth.users(id),

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cohort_labeled_measurements IS
  'Per-region labeled measurement pairs (predicted vs tape-measure truth) for the '
  '211b accuracy cohort. region matches GirthRegion in accuracyTargets.ts. '
  'measurer_id enables inter-rater ICC. session_id groups one scan session. '
  'Admin/researcher-scoped RLS; never consumer-visible.';

ALTER TABLE public.cohort_labeled_measurements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cohort_meas_subject
  ON public.cohort_labeled_measurements(subject_id);
CREATE INDEX IF NOT EXISTS idx_cohort_meas_region
  ON public.cohort_labeled_measurements(region);
CREATE INDEX IF NOT EXISTS idx_cohort_meas_session
  ON public.cohort_labeled_measurements(session_id);
CREATE INDEX IF NOT EXISTS idx_cohort_meas_measurer
  ON public.cohort_labeled_measurements(measurer_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'cohort_labeled_measurements'
      AND policyname = 'Research admins can select labeled measurements'
  ) THEN
    CREATE POLICY "Research admins can select labeled measurements"
      ON public.cohort_labeled_measurements FOR SELECT TO authenticated
      USING (public.is_research_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'cohort_labeled_measurements'
      AND policyname = 'Research admins can insert labeled measurements'
  ) THEN
    CREATE POLICY "Research admins can insert labeled measurements"
      ON public.cohort_labeled_measurements FOR INSERT TO authenticated
      WITH CHECK (public.is_research_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'cohort_labeled_measurements'
      AND policyname = 'Research admins can update labeled measurements'
  ) THEN
    CREATE POLICY "Research admins can update labeled measurements"
      ON public.cohort_labeled_measurements FOR UPDATE TO authenticated
      USING  (public.is_research_admin())
      WITH CHECK (public.is_research_admin());
  END IF;
END $$;

-- ============================================================================
-- 3. cohort_validation_runs
--    Append-only log of every runValidation() output.
--    report JSONB holds the full ValidationReport.
--    held_out_pass mirrors report.heldOutPass for fast SQL filtering.
--    gary_signed_off is a Gary-gated boolean that must be set to TRUE (by
--    admin update) before the claim gate exposes any accuracy figure.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cohort_validation_runs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  calibration_version   TEXT NOT NULL,
  -- Full ValidationReport from runValidation() serialised as JSONB.
  report                JSONB NOT NULL,
  -- Denormalised from report.heldOutPass for fast querying without JSONB extraction.
  held_out_pass         BOOLEAN NOT NULL DEFAULT false,
  -- Gary-gated: must be manually set TRUE by an admin/superadmin before the
  -- accuracy claim is exposed. Defaults FALSE so no claim leaks on first insert.
  gary_signed_off       BOOLEAN NOT NULL DEFAULT false,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cohort_validation_runs IS
  'Append-only log of FormaVision accuracy validation runs (211b). '
  'report is the full ValidationReport JSONB from runValidation(). '
  'held_out_pass is denormalised from report.heldOutPass. '
  'gary_signed_off must be manually set TRUE by Gary before any accuracy claim '
  'is surfaced to users; defaults FALSE so the gate stays closed on insert.';

ALTER TABLE public.cohort_validation_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_cohort_runs_run_at
  ON public.cohort_validation_runs(run_at DESC);
CREATE INDEX IF NOT EXISTS idx_cohort_runs_held_out_pass
  ON public.cohort_validation_runs(held_out_pass, run_at DESC)
  WHERE held_out_pass = true;
CREATE INDEX IF NOT EXISTS idx_cohort_runs_gary_signed
  ON public.cohort_validation_runs(gary_signed_off, run_at DESC)
  WHERE gary_signed_off = true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'cohort_validation_runs'
      AND policyname = 'Research admins can select validation runs'
  ) THEN
    CREATE POLICY "Research admins can select validation runs"
      ON public.cohort_validation_runs FOR SELECT TO authenticated
      USING (public.is_research_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'cohort_validation_runs'
      AND policyname = 'Research admins can insert validation runs'
  ) THEN
    CREATE POLICY "Research admins can insert validation runs"
      ON public.cohort_validation_runs FOR INSERT TO authenticated
      WITH CHECK (public.is_research_admin());
  END IF;
END $$;

-- UPDATE is intentionally allowed only for gary_signed_off flipping.
-- A more granular policy would check (NEW.gary_signed_off != OLD.gary_signed_off)
-- but Postgres RLS WITH CHECK sees only the NEW row, so we gate the entire
-- UPDATE to admin/superadmin (not researcher) to prevent silent mutation of
-- the report blob or held_out_pass field.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'cohort_validation_runs'
      AND policyname = 'Admins can update validation run sign-off'
  ) THEN
    CREATE POLICY "Admins can update validation run sign-off"
      ON public.cohort_validation_runs FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (select auth.uid())
          AND p.role IN ('admin', 'superadmin')
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (select auth.uid())
          AND p.role IN ('admin', 'superadmin')
      ));
  END IF;
END $$;

-- =============================================================================
-- DEXA import: DEFERRED TO W3
-- A dexa_imports table for DEXA/bodpod reference instrument imports is deferred
-- to Workstream 3 (anchor fusion). The protocol_version column on
-- cohort_subjects already encodes the anchor type. W3 will add dexa_imports
-- with its own reference-instrument metadata (scan_date, device_model,
-- operator_id, dxa_body_fat_pct, regional_lean_mass_kg[] etc.) and FK it here.
-- =============================================================================

-- =============================================================================
-- Done.
-- Tables: cohort_subjects + cohort_labeled_measurements + cohort_validation_runs
-- RLS: admin/superadmin/researcher SELECT+INSERT; admin/superadmin UPDATE only.
-- gary_signed_off defaults FALSE; no accuracy claim can surface until it is TRUE.
-- DEXA imports deferred to W3.
-- APPEND-ONLY: no existing table, column, policy, or migration touched.
-- =============================================================================
