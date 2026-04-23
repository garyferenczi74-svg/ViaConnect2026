-- =============================================================================
-- Prompt #114 P2b: CEO approval RPC (SECURITY DEFINER)
-- =============================================================================
-- Locked 2026-04-23 per security-advisor recommendation #4.
--
-- approve_customs_recordation_ceo(p_recordation_id) derives ceo_approved_by
-- from auth.uid() so the PATCH handler cannot impersonate the CEO by
-- passing a foreign UUID in the body. Also re-asserts role + MFA at DB
-- level as defense in depth against an app-layer bypass.
--
-- Matches the precedent pattern from grant_customs_counsel_session in
-- 20260424000230_prompt_114_counsel_mfa.sql.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.approve_customs_recordation_ceo(
  p_recordation_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_role    TEXT;
  caller_aal     TEXT;
  rec_status     customs_recordation_status;
  rec_total_fee  BIGINT;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS DISTINCT FROM 'ceo' THEN
    RAISE EXCEPTION 'Only the CEO can approve recordations; got role=%', caller_role
      USING ERRCODE = 'P0001';
  END IF;

  caller_aal := COALESCE(
    current_setting('request.jwt.claim.aal', TRUE),
    auth.jwt() ->> 'aal'
  );
  IF caller_aal IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'CEO recordation approval requires MFA-verified session (aal2)'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT status, total_fee_cents
    INTO rec_status, rec_total_fee
    FROM public.customs_recordations
   WHERE recordation_id = p_recordation_id;

  IF rec_status IS NULL THEN
    RAISE EXCEPTION 'Recordation % not found', p_recordation_id
      USING ERRCODE = 'P0002';
  END IF;

  IF rec_status = 'withdrawn' OR rec_status = 'expired' THEN
    RAISE EXCEPTION 'Cannot approve a recordation in terminal status %', rec_status
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.customs_recordations
     SET ceo_approved_by = auth.uid(),
         ceo_approved_at = NOW(),
         ceo_approval_required = TRUE,
         updated_at = NOW()
   WHERE recordation_id = p_recordation_id;

  RETURN p_recordation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_customs_recordation_ceo(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_customs_recordation_ceo(UUID) TO authenticated;

COMMENT ON FUNCTION public.approve_customs_recordation_ceo(UUID) IS
  'Prompt #114: SECURITY DEFINER CEO sign-off RPC. Derives approver from auth.uid(); re-asserts role + aal2; rejects terminal-state recordations.';
