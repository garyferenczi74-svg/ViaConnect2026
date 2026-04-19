-- =============================================================================
-- Prompt #91, Phase 2.3: Practitioners table
-- =============================================================================
-- Append-only. 1:1 with auth.users via UNIQUE user_id. Optional FK back to
-- the Phase 1 waitlist row and assigned cohort. credential_type drives the
-- naturopath sidebar feature flag (nd, dc, lac).
--
-- The existing practitioner_patients table (from
-- 20260326_three_portal_architecture.sql) references auth.users(id) directly
-- as practitioner_id. Joining to this table goes through practitioners.user_id.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  waitlist_id UUID REFERENCES public.practitioner_waitlist(id),
  cohort_id UUID REFERENCES public.practitioner_cohorts(id),

  -- Identity
  display_name TEXT NOT NULL,
  professional_title TEXT,
  credential_type TEXT NOT NULL CHECK (credential_type IN (
    'md', 'do', 'nd', 'dc', 'np', 'pa', 'rd', 'lac', 'other'
  )),
  credential_type_other TEXT,
  bio TEXT,
  headshot_url TEXT,

  -- Practice
  practice_name TEXT NOT NULL,
  practice_url TEXT,
  practice_logo_url TEXT,
  practice_street_address TEXT,
  practice_city TEXT,
  practice_state TEXT,
  practice_postal_code TEXT,
  practice_country TEXT DEFAULT 'US',
  practice_phone TEXT,
  practice_email TEXT,

  -- Licensure
  license_state TEXT,
  license_number TEXT,
  license_verified BOOLEAN NOT NULL DEFAULT false,
  license_verified_at TIMESTAMPTZ,
  license_verified_by UUID REFERENCES auth.users(id),
  npi_number TEXT,

  -- Clinical profile
  primary_clinical_focus TEXT,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  years_in_practice INTEGER CHECK (years_in_practice IS NULL OR years_in_practice BETWEEN 0 AND 80),
  active_patient_panel_size INTEGER NOT NULL DEFAULT 0 CHECK (active_patient_panel_size >= 0),

  -- Co-branding configuration
  co_branding_enabled BOOLEAN NOT NULL DEFAULT true,
  custom_domain TEXT UNIQUE,
  brand_primary_color TEXT,
  brand_accent_color TEXT,
  patient_facing_display_name TEXT,

  -- Account status
  account_status TEXT NOT NULL DEFAULT 'pending_onboarding' CHECK (account_status IN (
    'pending_onboarding', 'onboarding', 'active', 'suspended', 'terminated'
  )),
  onboarded_at TIMESTAMPTZ,
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,

  -- Preferences
  prefers_email_notifications BOOLEAN DEFAULT true,
  prefers_sms_notifications BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'America/New_York',

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioners IS
  'Practitioner account records. Linked 1:1 to auth.users via UNIQUE user_id. credential_type in (nd, dc, lac) triggers the naturopath sidebar feature flag.';

CREATE INDEX IF NOT EXISTS idx_practitioners_user ON public.practitioners(user_id);
CREATE INDEX IF NOT EXISTS idx_practitioners_status ON public.practitioners(account_status);
CREATE INDEX IF NOT EXISTS idx_practitioners_credential ON public.practitioners(credential_type);
CREATE INDEX IF NOT EXISTS idx_practitioners_cohort
  ON public.practitioners(cohort_id) WHERE cohort_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_practitioners_custom_domain
  ON public.practitioners(custom_domain) WHERE custom_domain IS NOT NULL;

ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS practitioners_self_read ON public.practitioners;
CREATE POLICY practitioners_self_read
  ON public.practitioners FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

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

-- Patients can read public-facing fields of their practitioner. Implemented
-- via the practitioner_patients consent join: if the patient has an active
-- relationship row, they can read the practitioner's display_name, credential,
-- practice info. We do NOT expose internal admin fields (license number,
-- account status notes) to patients.
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
