-- Prompt 226 Module B (G17 de-identified): opaque patient_ref, no PHI names.
-- Practitioner verification requests for AB / NY (G18).
-- Gary Start B continue. Append-only.

-- ---------------------------------------------------------------------------
-- Practitioner jurisdiction for Module B gate
-- ---------------------------------------------------------------------------
ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS license_jurisdiction text
    CHECK (
      license_jurisdiction IS NULL
      OR license_jurisdiction IN ('AB', 'NY')
    );

ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS license_issuing_body text;

COMMENT ON COLUMN public.practitioners.license_jurisdiction IS
  'Prompt 226 Module B: AB (Alberta) or NY (New York) for initial verification scope.';

-- ---------------------------------------------------------------------------
-- License verification request queue (admin review)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_license_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jurisdiction text NOT NULL CHECK (jurisdiction IN ('AB', 'NY')),
  issuing_body text NOT NULL,
  license_number text NOT NULL,
  display_name_snapshot text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text NOT NULL DEFAULT '',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practitioner_license_vr_status_idx
  ON public.practitioner_license_verification_requests (status, created_at DESC);

ALTER TABLE public.practitioner_license_verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS practitioner_license_vr_select_own
  ON public.practitioner_license_verification_requests;
CREATE POLICY practitioner_license_vr_select_own
  ON public.practitioner_license_verification_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS practitioner_license_vr_insert_own
  ON public.practitioner_license_verification_requests;
CREATE POLICY practitioner_license_vr_insert_own
  ON public.practitioner_license_verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- De-identified peptide protocols (prescriber-authored)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practitioner_peptide_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Opaque reference only. Never store patient legal name here (G17 de-identified).
  patient_ref text NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  peptide_id uuid NOT NULL REFERENCES public.kb_peptides(id),
  -- Prescriber-entered regimen (originates from practitioner, not platform)
  dose_amount numeric NOT NULL CHECK (dose_amount > 0),
  dose_unit text NOT NULL CHECK (dose_unit IN ('mg', 'mcg', 'IU')),
  vial_amount numeric NOT NULL CHECK (vial_amount > 0),
  vial_unit text NOT NULL CHECK (vial_unit IN ('mg', 'mcg', 'IU')),
  diluent_ml numeric NOT NULL CHECK (diluent_ml > 0),
  frequency_text text NOT NULL DEFAULT '',
  timing_text text NOT NULL DEFAULT '',
  duration_text text NOT NULL DEFAULT '',
  route_text text NOT NULL DEFAULT 'subcutaneous',
  syringe_standard text NOT NULL CHECK (syringe_standard IN ('U-100', 'U-40')),
  barrel_size integer NOT NULL CHECK (barrel_size IN (100, 50, 30)),
  computed_concentration numeric,
  computed_volume_ml numeric,
  computed_units numeric,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'revoked')),
  attribution_version text NOT NULL DEFAULT '226-b-v1',
  signed_off_at timestamptz,
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practitioner_peptide_protocols_patient_ref_len CHECK (
    char_length(trim(patient_ref)) BETWEEN 1 AND 64
  )
);

CREATE INDEX IF NOT EXISTS practitioner_peptide_protocols_author_idx
  ON public.practitioner_peptide_protocols (practitioner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS practitioner_peptide_protocols_recipient_idx
  ON public.practitioner_peptide_protocols (recipient_user_id)
  WHERE recipient_user_id IS NOT NULL AND status = 'issued';

ALTER TABLE public.practitioner_peptide_protocols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS practitioner_peptide_protocols_author_all
  ON public.practitioner_peptide_protocols;
CREATE POLICY practitioner_peptide_protocols_author_all
  ON public.practitioner_peptide_protocols
  FOR ALL TO authenticated
  USING (author_user_id = auth.uid())
  WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS practitioner_peptide_protocols_recipient_select
  ON public.practitioner_peptide_protocols;
CREATE POLICY practitioner_peptide_protocols_recipient_select
  ON public.practitioner_peptide_protocols
  FOR SELECT TO authenticated
  USING (
    status = 'issued'
    AND recipient_user_id = auth.uid()
  );

COMMENT ON TABLE public.practitioner_peptide_protocols IS
  'Prompt 226 Module B: de-identified. patient_ref is opaque. Platform converts units only; regimen originates from verified practitioner.';

COMMENT ON COLUMN public.practitioner_peptide_protocols.patient_ref IS
  'Opaque practitioner-held key. Do not store patient legal name or MRN.';
