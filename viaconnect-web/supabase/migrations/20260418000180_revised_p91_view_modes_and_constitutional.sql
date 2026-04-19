-- =============================================================================
-- Revised Prompt #91: tab-based portal architecture + naturopathic patient view
-- =============================================================================
-- Append-only. Three additive changes that the revised Phase 5/6/7 surface
-- depends on:
--
--   1. practitioners gains default_patient_view_mode + default_active_tab.
--      The onboarding flow sets these from the credential type so a fresh
--      ND/DC/LAc account lands on the Naturopath tab with the naturopathic
--      patient view, while every other credential lands on Practice with
--      the standard view. Each is a constrained TEXT column with a default
--      so existing rows are valid without backfill.
--
--   2. practitioner_patients gains patient_view_mode_override. NULL means
--      "use the practitioner default". 'standard' or 'naturopathic' pins
--      this specific patient regardless of the practitioner's preference.
--
--   3. constitutional_assessments captures the result of the Ayurveda dosha
--      assessment (and TCM / Homeopathic when those frameworks ship). Read
--      by the Naturopathic patient view to surface the constitutional type
--      prominently. RLS: patient self-read; practitioner read via the
--      practitioner_patients active relationship; practitioner write
--      through their practitioners.id.
--
--   4. supplement_protocols (the canonical protocol table from
--      20260326_three_portal_architecture.sql) is extended with
--      protocol_type, constitutional_framework, lifestyle_interventions,
--      energetic_notes, botanical_components. The Natural Protocols builder
--      writes these fields; both Standard and Naturopathic patient views
--      read them; only the Naturopathic view renders the rich naturopathic
--      sections distinctly.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Practitioner view + tab preferences
-- ---------------------------------------------------------------------------

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS default_patient_view_mode TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS default_active_tab        TEXT NOT NULL DEFAULT 'practice';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'practitioners_default_view_mode_check'
  ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_default_view_mode_check
      CHECK (default_patient_view_mode IN ('standard', 'naturopathic'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'practitioners_default_active_tab_check'
  ) THEN
    ALTER TABLE public.practitioners
      ADD CONSTRAINT practitioners_default_active_tab_check
      CHECK (default_active_tab IN ('practice', 'naturopath'));
  END IF;
END $$;

COMMENT ON COLUMN public.practitioners.default_patient_view_mode IS
  'Default patient detail view: standard or naturopathic. Practitioner can override per-patient via patient_view_mode_override on practitioner_patients.';
COMMENT ON COLUMN public.practitioners.default_active_tab IS
  'Default tab on portal entry. Only meaningful for credential types that show the Naturopath tab (nd, dc, lac).';

-- ---------------------------------------------------------------------------
-- 2. Per-patient view override
-- ---------------------------------------------------------------------------

ALTER TABLE public.practitioner_patients
  ADD COLUMN IF NOT EXISTS patient_view_mode_override TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'practitioner_patients_view_mode_override_check'
  ) THEN
    ALTER TABLE public.practitioner_patients
      ADD CONSTRAINT practitioner_patients_view_mode_override_check
      CHECK (patient_view_mode_override IS NULL
             OR patient_view_mode_override IN ('standard', 'naturopathic'));
  END IF;
END $$;

COMMENT ON COLUMN public.practitioner_patients.patient_view_mode_override IS
  'When NULL, the patient detail page falls back to the practitioner default. When set, this specific patient is always rendered in the chosen mode for this practitioner.';

-- ---------------------------------------------------------------------------
-- 3. constitutional_assessments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.constitutional_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES public.practitioners(id),
  framework TEXT NOT NULL CHECK (framework IN ('ayurveda', 'tcm', 'homeopathic')),

  primary_dosha   TEXT CHECK (primary_dosha   IS NULL OR primary_dosha   IN ('vata', 'pitta', 'kapha')),
  secondary_dosha TEXT CHECK (secondary_dosha IS NULL OR secondary_dosha IN ('vata', 'pitta', 'kapha')),
  vata_score  INTEGER,
  pitta_score INTEGER,
  kapha_score INTEGER,

  questionnaire_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  practitioner_notes TEXT,
  recommendations TEXT,

  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.constitutional_assessments IS
  'Patient constitutional assessment results. Naturopathic patient view reads this to surface the constitutional type prominently. Ayurveda fully functional Q1; TCM and Homeopathic placeholders.';

CREATE INDEX IF NOT EXISTS idx_constitutional_patient
  ON public.constitutional_assessments(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_constitutional_practitioner
  ON public.constitutional_assessments(practitioner_id) WHERE practitioner_id IS NOT NULL;

ALTER TABLE public.constitutional_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS constitutional_patient_read ON public.constitutional_assessments;
CREATE POLICY constitutional_patient_read
  ON public.constitutional_assessments FOR SELECT
  TO authenticated
  USING (patient_user_id = auth.uid());

-- Practitioners read via the canonical practitioner_patients relationship
-- (Path C made practitioner_patients the single source of truth) gated by
-- the existing CAQ consent flag, since constitutional assessment data
-- carries similar sensitivity.
DROP POLICY IF EXISTS constitutional_practitioner_read ON public.constitutional_assessments;
CREATE POLICY constitutional_practitioner_read
  ON public.constitutional_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.practitioner_patients pp
      WHERE pp.patient_id = constitutional_assessments.patient_user_id
        AND pp.practitioner_id = auth.uid()
        AND pp.status = 'active'
        AND pp.consent_share_caq = true
    )
  );

DROP POLICY IF EXISTS constitutional_practitioner_write ON public.constitutional_assessments;
CREATE POLICY constitutional_practitioner_write
  ON public.constitutional_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS constitutional_practitioner_update ON public.constitutional_assessments;
CREATE POLICY constitutional_practitioner_update
  ON public.constitutional_assessments FOR UPDATE
  TO authenticated
  USING (
    practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS constitutional_admin_all ON public.constitutional_assessments;
CREATE POLICY constitutional_admin_all
  ON public.constitutional_assessments FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- 4. supplement_protocols extension
-- ---------------------------------------------------------------------------
-- Natural Protocols builder + Naturopathic patient view both depend on these
-- columns. Existing standard protocols default to protocol_type='standard'.

ALTER TABLE public.supplement_protocols
  ADD COLUMN IF NOT EXISTS protocol_type             TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS constitutional_framework  TEXT,
  ADD COLUMN IF NOT EXISTS lifestyle_interventions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS energetic_notes           TEXT,
  ADD COLUMN IF NOT EXISTS botanical_components      JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'supplement_protocols_protocol_type_check'
  ) THEN
    ALTER TABLE public.supplement_protocols
      ADD CONSTRAINT supplement_protocols_protocol_type_check
      CHECK (protocol_type IN ('standard', 'natural_protocol', 'functional_medicine'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'supplement_protocols_constitutional_framework_check'
  ) THEN
    ALTER TABLE public.supplement_protocols
      ADD CONSTRAINT supplement_protocols_constitutional_framework_check
      CHECK (constitutional_framework IS NULL
             OR constitutional_framework IN ('ayurveda', 'tcm', 'homeopathic', 'none'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supplement_protocols_type
  ON public.supplement_protocols(protocol_type)
  WHERE protocol_type <> 'standard';

COMMENT ON COLUMN public.supplement_protocols.protocol_type IS
  'standard (default), natural_protocol (built in /naturopath/natural-protocols), or functional_medicine. Naturopathic patient view renders natural_protocol with its botanical_components and lifestyle_interventions broken out distinctly.';
