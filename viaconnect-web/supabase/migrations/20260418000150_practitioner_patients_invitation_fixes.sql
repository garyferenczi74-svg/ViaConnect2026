-- =============================================================================
-- Prompt #91 Round 2 audit fix: practitioner_patients invitation separation
-- =============================================================================
-- Append-only. Two issues from the Jeffery + Michelangelo retrospective on
-- Prompt #91 Phase 7:
--
--   1. invite-patient route was inserting patient_id = practitioner UID as a
--      placeholder until acceptance. The patient could not UPDATE the row on
--      accept because the existing RLS UPDATE policy requires
--      auth.uid() = patient_id (and patient_id was the practitioner's UID).
--   2. Patient acceptance UPDATE filtered on `id` only, with no token +
--      status='invited' precondition, allowing a leaked or stale token to
--      re-claim and overwrite consent flags.
--
-- This migration:
--   * Drops NOT NULL on patient_id so invitation rows can carry no patient
--     until acceptance.
--   * Adds invited_email + invited_first_name + invited_last_name so the
--     practitioner can resend without re-entering the form, and so admins
--     can audit which email is associated with each pending invitation.
--   * Ships two SECURITY DEFINER RPCs:
--       lookup_practitioner_invitation(token) — public read, returns
--           practitioner display info if the token resolves.
--       accept_practitioner_invitation(token, ...consent flags) — auth-only,
--           atomic claim that uses ROW_COUNT to detect double-claim losers.
--   * The RPCs are the only path for the invitation acceptance flow; the
--     existing UPDATE RLS policy stays in place so no public token-bearing
--     UPDATE is possible.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Schema relaxations
-- ---------------------------------------------------------------------------

ALTER TABLE public.practitioner_patients
  ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE public.practitioner_patients
  ADD COLUMN IF NOT EXISTS invited_email      TEXT,
  ADD COLUMN IF NOT EXISTS invited_first_name TEXT,
  ADD COLUMN IF NOT EXISTS invited_last_name  TEXT;

CREATE INDEX IF NOT EXISTS idx_pp_invited_email
  ON public.practitioner_patients(invited_email)
  WHERE invited_email IS NOT NULL;

COMMENT ON COLUMN public.practitioner_patients.invited_email IS
  'Patient email captured at invitation time. Used for resend flow + admin audit. patient_id is null until the patient accepts.';

-- ---------------------------------------------------------------------------
-- Public lookup RPC: returns the practitioner identity behind a token
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lookup_practitioner_invitation(p_token TEXT)
RETURNS TABLE (
  ok BOOLEAN,
  invitation_note TEXT,
  practitioner_user_id UUID,
  practitioner_display_name TEXT,
  practice_name TEXT,
  practice_logo_url TEXT,
  consent_share_caq BOOLEAN,
  consent_share_engagement_score BOOLEAN,
  consent_share_protocols BOOLEAN,
  consent_share_nutrition BOOLEAN,
  can_view_genetics BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  rec RECORD;
BEGIN
  SELECT
    pp.invitation_note, pp.practitioner_id,
    pp.consent_share_caq, pp.consent_share_engagement_score,
    pp.consent_share_protocols, pp.consent_share_nutrition, pp.can_view_genetics,
    p.display_name, p.practice_name, p.practice_logo_url
  INTO rec
  FROM public.practitioner_patients pp
  LEFT JOIN public.practitioners p ON p.user_id = pp.practitioner_id
  WHERE pp.invitation_token = p_token
    AND pp.status = 'invited'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, NULL::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT,
      NULL::BOOLEAN, NULL::BOOLEAN, NULL::BOOLEAN, NULL::BOOLEAN, NULL::BOOLEAN;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    rec.invitation_note,
    rec.practitioner_id,
    rec.display_name,
    rec.practice_name,
    rec.practice_logo_url,
    rec.consent_share_caq,
    rec.consent_share_engagement_score,
    rec.consent_share_protocols,
    rec.consent_share_nutrition,
    rec.can_view_genetics;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_practitioner_invitation(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_practitioner_invitation(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Authenticated acceptance RPC: atomic claim
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.accept_practitioner_invitation(
  p_token                          TEXT,
  p_consent_share_caq              BOOLEAN,
  p_consent_share_engagement_score BOOLEAN,
  p_consent_share_protocols        BOOLEAN,
  p_consent_share_nutrition        BOOLEAN,
  p_can_view_genetics              BOOLEAN
)
RETURNS TABLE (
  ok BOOLEAN,
  relationship_id UUID,
  practitioner_user_id UUID,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_id   UUID;
  v_pract UUID;
  v_rows INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'unauthenticated'::TEXT;
    RETURN;
  END IF;

  -- Atomic claim: only the row matching token AND status='invited' is
  -- updated. A racing second caller sees ROW_COUNT = 0 below and is told
  -- the invitation is no longer valid.
  UPDATE public.practitioner_patients
     SET patient_id              = v_user,
         status                  = 'active',
         consent_granted_at      = now(),
         invitation_accepted_at  = now(),
         invitation_token        = NULL,
         consent_share_caq              = p_consent_share_caq,
         consent_share_engagement_score = p_consent_share_engagement_score,
         consent_share_protocols        = p_consent_share_protocols,
         consent_share_nutrition        = p_consent_share_nutrition,
         can_view_genetics              = p_can_view_genetics,
         updated_at = now()
   WHERE invitation_token = p_token
     AND status = 'invited'
   RETURNING id, practitioner_id INTO v_id, v_pract;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, 'invalid_or_used'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_id, v_pract, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_practitioner_invitation(
  TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_practitioner_invitation(
  TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO authenticated;
