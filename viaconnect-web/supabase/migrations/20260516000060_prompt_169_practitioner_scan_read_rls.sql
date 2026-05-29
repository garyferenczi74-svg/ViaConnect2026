-- =============================================================================
-- Prompt #169 (Task 3): Practitioner + Naturopath read-only access to patient
-- body-scan data.
-- Migration: 20260516000060_prompt_169_practitioner_scan_read_rls.sql
-- =============================================================================
-- The body-scan data tables created in 20260416000090 / 20260416000100 /
-- 20260516000010 currently carry OWNER-ONLY RLS ("Users manage own ..."),
-- so a practitioner cannot read a patient's scans. The Practitioner Body Scan
-- tab (spec section 12) needs read-only access to a patient's scan history.
--
-- ACCESS PARADIGM: practitioner-scoped RLS. This mirrors every other patient
-- data read in StandardPatientView / NaturopathicPatientView / ScanResultsPanel
-- which use the browser client and rely on RLS, gated by an active
-- practitioner_patients relationship. We add SELECT-only policies; no write,
-- no UPDATE/INSERT/DELETE, and no changes to the existing owner policies.
--
-- CANONICAL RELATIONSHIP TABLE: practitioner_patients.
--   columns: practitioner_id (-> auth.users), patient_id (-> auth.users), status
-- The Prompt #92 patient_practitioner_relationships table was DROPPED CASCADE
-- in 20260418000160_practitioners_schema_reconciliation.sql, so any policy that
-- still references it (notably the "Practitioner manages notes for active
-- patients" policy in 20260516000010) is non-functional. This migration:
--   1. Adds practitioner SELECT policies on the five scan-data tables using the
--      canonical practitioner_patients table.
--   2. Adds a corrected practitioner ALL policy on body_scan_practitioner_notes
--      (distinct name) so create/read/update of notes works against the live
--      relationship table.
--
-- Append-only. Idempotent. No DROP TABLE, no ALTER TABLE on existing tables,
-- no changes to existing policies.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. body_photo_sessions: practitioner read for active patients
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_photo_sessions'
      AND policyname = 'Practitioner reads scan sessions for active patients'
  ) THEN
    CREATE POLICY "Practitioner reads scan sessions for active patients"
      ON body_photo_sessions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.practitioner_patients pp
          WHERE pp.patient_id      = body_photo_sessions.user_id
            AND pp.practitioner_id = auth.uid()
            AND pp.status          = 'active'
        )
      );
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 2. body_scan_composition: practitioner read for active patients
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_composition'
      AND policyname = 'Practitioner reads scan composition for active patients'
  ) THEN
    CREATE POLICY "Practitioner reads scan composition for active patients"
      ON body_scan_composition FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.practitioner_patients pp
          WHERE pp.patient_id      = body_scan_composition.user_id
            AND pp.practitioner_id = auth.uid()
            AND pp.status          = 'active'
        )
      );
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 3. body_scan_measurements: practitioner read for active patients
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_measurements'
      AND policyname = 'Practitioner reads scan measurements for active patients'
  ) THEN
    CREATE POLICY "Practitioner reads scan measurements for active patients"
      ON body_scan_measurements FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.practitioner_patients pp
          WHERE pp.patient_id      = body_scan_measurements.user_id
            AND pp.practitioner_id = auth.uid()
            AND pp.status          = 'active'
        )
      );
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 4. body_scan_quality: practitioner read for active patients
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_quality'
      AND policyname = 'Practitioner reads scan quality for active patients'
  ) THEN
    CREATE POLICY "Practitioner reads scan quality for active patients"
      ON body_scan_quality FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.practitioner_patients pp
          WHERE pp.patient_id      = body_scan_quality.user_id
            AND pp.practitioner_id = auth.uid()
            AND pp.status          = 'active'
        )
      );
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 5. body_scan_tier_log: practitioner read for active patients
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_tier_log'
      AND policyname = 'Practitioner reads tier log for active patients'
  ) THEN
    CREATE POLICY "Practitioner reads tier log for active patients"
      ON body_scan_tier_log FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.practitioner_patients pp
          WHERE pp.patient_id      = body_scan_tier_log.user_id
            AND pp.practitioner_id = auth.uid()
            AND pp.status          = 'active'
        )
      );
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 6. body_scan_practitioner_notes: corrected practitioner ALL policy
--
-- The original policy "Practitioner manages notes for active patients"
-- (20260516000010) joins through patient_practitioner_relationships, which was
-- dropped in 20260418000160. We add a distinct, correctly-scoped policy using
-- the canonical practitioner_patients table so practitioner create / read /
-- update of body-scan notes works. The patient self-read policy
-- ("Patient reads own practitioner notes") is unchanged and still applies.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'body_scan_practitioner_notes'
      AND policyname = 'Practitioner manages scan notes via practitioner_patients'
  ) THEN
    CREATE POLICY "Practitioner manages scan notes via practitioner_patients"
      ON body_scan_practitioner_notes FOR ALL
      USING (
        auth.uid() = practitioner_user_id
        AND EXISTS (
          SELECT 1 FROM public.practitioner_patients pp
          WHERE pp.patient_id      = body_scan_practitioner_notes.patient_user_id
            AND pp.practitioner_id = auth.uid()
            AND pp.status          = 'active'
        )
      )
      WITH CHECK (
        auth.uid() = practitioner_user_id
        AND EXISTS (
          SELECT 1 FROM public.practitioner_patients pp
          WHERE pp.patient_id      = body_scan_practitioner_notes.patient_user_id
            AND pp.practitioner_id = auth.uid()
            AND pp.status          = 'active'
        )
      );
  END IF;
END $$;
