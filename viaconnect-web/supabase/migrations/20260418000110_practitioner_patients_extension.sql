-- =============================================================================
-- Prompt #91, Phase 2.6: Extend practitioner_patients with Phase 2 columns
-- =============================================================================
-- Append-only. The practitioner_patients table from
-- 20260326_three_portal_architecture.sql already models the patient ↔
-- practitioner relationship with consent flags (can_view_genetics,
-- can_view_labs, can_view_supplements, can_view_compliance, can_view_wearables,
-- can_view_ai_conversations, can_prescribe_protocols, can_order_panels,
-- can_view_medications). Phase 2 adds:
--
--   * Practitioner-initiated invitation flow (token, accept, note)
--   * Patient relationship metadata (chief_complaint, tags, notes,
--     first_visit_date)
--   * Granular Phase 2 consent flags that the new patient-facing UI gates on:
--     consent_share_caq, consent_share_engagement_score,
--     consent_share_protocols, consent_share_nutrition
--
-- Pre-existing can_view_* columns are kept untouched for backward compat with
-- existing app code. Both naming conventions coexist.
-- =============================================================================

ALTER TABLE public.practitioner_patients
  ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invitation_note TEXT,
  ADD COLUMN IF NOT EXISTS first_visit_date DATE,
  ADD COLUMN IF NOT EXISTS chief_complaint TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS practitioner_notes TEXT,
  ADD COLUMN IF NOT EXISTS consent_share_caq BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_share_engagement_score BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_share_protocols BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_share_nutrition BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS relationship_ended_at TIMESTAMPTZ;

COMMENT ON COLUMN public.practitioner_patients.invitation_token IS
  'Single-use token sent to a patient who has not yet linked. Becomes NULL after acceptance.';
COMMENT ON COLUMN public.practitioner_patients.consent_share_caq IS
  'Phase 2 consent flag: patient permits practitioner to read CAQ assessment_results. Default false; patient must explicitly grant.';
COMMENT ON COLUMN public.practitioner_patients.consent_share_engagement_score IS
  'Aggregate engagement score (0-100) only. Helix internals (balance, transactions, achievements) are NEVER shared regardless of this flag.';

CREATE INDEX IF NOT EXISTS idx_pp_invitation_token
  ON public.practitioner_patients(invitation_token)
  WHERE invitation_token IS NOT NULL;

-- Trigger: bump consent_updated_at whenever any consent_share_* flag changes.
CREATE OR REPLACE FUNCTION public.tg_practitioner_patients_consent_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.consent_share_caq IS DISTINCT FROM OLD.consent_share_caq)
     OR (NEW.consent_share_engagement_score IS DISTINCT FROM OLD.consent_share_engagement_score)
     OR (NEW.consent_share_protocols IS DISTINCT FROM OLD.consent_share_protocols)
     OR (NEW.consent_share_nutrition IS DISTINCT FROM OLD.consent_share_nutrition) THEN
    NEW.consent_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS practitioner_patients_consent_touch ON public.practitioner_patients;
CREATE TRIGGER practitioner_patients_consent_touch
  BEFORE UPDATE ON public.practitioner_patients
  FOR EACH ROW EXECUTE FUNCTION public.tg_practitioner_patients_consent_touch();
