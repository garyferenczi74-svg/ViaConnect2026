-- =============================================================================
-- Path C reconciliation: merge Prompt #91 + Prompt #92 practitioner schemas
-- =============================================================================
-- Two parallel sessions both touched the practitioner domain on 2026-04-18:
--
--   * Prompt #92 (`_050_helix_phase1_integration.sql`, runs first lexically)
--     created `practitioners` as a 6-column STUB with `status` column, and
--     created a NEW `patient_practitioner_relationships` table with
--     `consent_share_engagement_score` for the engagement-score firewall.
--
--   * Prompt #91 (`_080_practitioners.sql`, runs second) tried to create a
--     30-column `practitioners` schema with `account_status` instead. Because
--     the table already existed from `_050`, the CREATE TABLE IF NOT EXISTS
--     was a no-op and the full schema was never applied. Phase 5/6/7 app code
--     reads `account_status`, `practice_name`, `credential_type` etc. — all
--     missing in production after `_050` + `_080` apply. Phase 7 also reads
--     `practitioner_patients` (extended in `_110`), not the new
--     `patient_practitioner_relationships`.
--
-- Path C: single source of truth.
--   1. ALTER `practitioners` to add every column my Phase 2 schema needed.
--   2. Backfill `status` → `account_status` (5-state superset of the stub's
--      4-state CHECK), then drop the old `status` column.
--   3. DROP `patient_practitioner_relationships` CASCADE — the only consumer
--      was the engagement-score RLS policy, which we recreate on
--      `practitioner_patients` (the canonical relationship table).
--   4. Apply the practitioners RLS that `_080` intended.
--
-- Append-only. Idempotent. Safe with or without rows in either table.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend practitioners with the full Phase 2 column set
-- ---------------------------------------------------------------------------

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS waitlist_id                 UUID REFERENCES public.practitioner_waitlist(id),
  ADD COLUMN IF NOT EXISTS cohort_id                   UUID REFERENCES public.practitioner_cohorts(id),
  ADD COLUMN IF NOT EXISTS professional_title          TEXT,
  ADD COLUMN IF NOT EXISTS credential_type             TEXT,
  ADD COLUMN IF NOT EXISTS credential_type_other       TEXT,
  ADD COLUMN IF NOT EXISTS bio                         TEXT,
  ADD COLUMN IF NOT EXISTS headshot_url                TEXT,
  ADD COLUMN IF NOT EXISTS practice_name               TEXT,
  ADD COLUMN IF NOT EXISTS practice_url                TEXT,
  ADD COLUMN IF NOT EXISTS practice_logo_url           TEXT,
  ADD COLUMN IF NOT EXISTS practice_street_address     TEXT,
  ADD COLUMN IF NOT EXISTS practice_city               TEXT,
  ADD COLUMN IF NOT EXISTS practice_state              TEXT,
  ADD COLUMN IF NOT EXISTS practice_postal_code        TEXT,
  ADD COLUMN IF NOT EXISTS practice_country            TEXT DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS practice_phone              TEXT,
  ADD COLUMN IF NOT EXISTS practice_email              TEXT,
  ADD COLUMN IF NOT EXISTS license_state               TEXT,
  ADD COLUMN IF NOT EXISTS license_number              TEXT,
  ADD COLUMN IF NOT EXISTS license_verified            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS license_verified_by         UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS npi_number                  TEXT,
  ADD COLUMN IF NOT EXISTS primary_clinical_focus      TEXT,
  ADD COLUMN IF NOT EXISTS specialties                 TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS years_in_practice           INTEGER,
  ADD COLUMN IF NOT EXISTS active_patient_panel_size   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS co_branding_enabled         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_domain               TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary_color         TEXT,
  ADD COLUMN IF NOT EXISTS brand_accent_color          TEXT,
  ADD COLUMN IF NOT EXISTS patient_facing_display_name TEXT,
  ADD COLUMN IF NOT EXISTS account_status              TEXT,
  ADD COLUMN IF NOT EXISTS onboarded_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason            TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS prefers_email_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS prefers_sms_notifications   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS timezone                    TEXT DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS metadata                    JSONB DEFAULT '{}'::jsonb;

-- Tighten credential_type with a CHECK constraint matching the spec's 9 values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'practitioners_credential_type_check'
  ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_credential_type_check
      CHECK (credential_type IS NULL OR credential_type IN (
        'md', 'do', 'nd', 'dc', 'np', 'pa', 'rd', 'lac', 'other'
      ));
  END IF;
END $$;

-- UNIQUE on custom_domain when present (partial index avoids null collisions).
CREATE UNIQUE INDEX IF NOT EXISTS practitioners_custom_domain_uq
  ON public.practitioners(custom_domain) WHERE custom_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_practitioners_status_legacy
  ON public.practitioners(account_status);
CREATE INDEX IF NOT EXISTS idx_practitioners_credential
  ON public.practitioners(credential_type);
CREATE INDEX IF NOT EXISTS idx_practitioners_cohort
  ON public.practitioners(cohort_id) WHERE cohort_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Backfill account_status from the stub's status, then drop status
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'practitioners'
      AND column_name  = 'status'
  ) THEN
    -- Map: pending → pending_onboarding, revoked → terminated, others pass through
    UPDATE public.practitioners
       SET account_status = CASE status
         WHEN 'pending'   THEN 'pending_onboarding'
         WHEN 'active'    THEN 'active'
         WHEN 'suspended' THEN 'suspended'
         WHEN 'revoked'   THEN 'terminated'
         ELSE 'pending_onboarding'
       END
     WHERE account_status IS NULL;

    -- Drop policies that depend on the column, if any (none expected; the
    -- _050 policies use user_id only).
    ALTER TABLE public.practitioners DROP COLUMN status;
  END IF;
END $$;

-- Default + NOT NULL + CHECK on account_status now that backfill is complete.
ALTER TABLE public.practitioners
  ALTER COLUMN account_status SET DEFAULT 'pending_onboarding';

UPDATE public.practitioners
   SET account_status = 'pending_onboarding'
 WHERE account_status IS NULL;

ALTER TABLE public.practitioners
  ALTER COLUMN account_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'practitioners_account_status_check'
  ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_account_status_check
      CHECK (account_status IN (
        'pending_onboarding', 'onboarding', 'active', 'suspended', 'terminated'
      ));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Add the Phase 2 RLS policies that `_080` intended
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS practitioners_self_update ON public.practitioners;
CREATE POLICY practitioners_self_update
  ON public.practitioners FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS practitioners_admin_all ON public.practitioners;
CREATE POLICY practitioners_admin_all
  ON public.practitioners FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS practitioners_patient_read_public ON public.practitioners;
CREATE POLICY practitioners_patient_read_public
  ON public.practitioners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practitioner_patients pp
      WHERE pp.practitioner_id = practitioners.user_id
        AND pp.patient_id = auth.uid()
        AND pp.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Drop patient_practitioner_relationships and re-anchor engagement RLS
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS public.patient_practitioner_relationships CASCADE;

-- Recreate the engagement-score practitioner-read policy on practitioner_patients.
-- practitioner_patients references auth.users directly, so the join through
-- practitioners.id is unnecessary.
DROP POLICY IF EXISTS engagement_scores_practitioner_read_with_consent
  ON public.engagement_score_snapshots;

CREATE POLICY engagement_scores_practitioner_read_with_consent
  ON public.engagement_score_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practitioner_patients pp
      WHERE pp.patient_id = engagement_score_snapshots.user_id
        AND pp.practitioner_id = auth.uid()
        AND pp.status = 'active'
        AND pp.consent_share_engagement_score = true
    )
  );
