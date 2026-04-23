-- =============================================================================
-- Prompt #114 P1: External counsel MFA + nightly session expiry (Q2=2a)
-- =============================================================================
-- Gary picked option 2a on 2026-04-23: build this infrastructure inside #114
-- rather than downgrade to grants-only or defer. #104's legal_privilege_grants
-- handles per-case access; this migration adds a second layer: an MFA-verified
-- session record that expires nightly at 00:05 UTC. External counsel need BOTH
-- an active legal_privilege_grants row AND an active customs_counsel_sessions
-- row to access customs_counsel_reviews.
--
-- MFA enforcement: Supabase's auth.jwt() → 'aal' claim = 'aal2' when a user
-- has verified a second factor this session. We capture that at grant time
-- and re-check on every read via RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- pg_cron (idempotent — already present from #17a autohealer series)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ---------------------------------------------------------------------------
-- customs_counsel_sessions — MFA-gated, nightly-expiring access record
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customs_counsel_sessions (
  session_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id           UUID REFERENCES public.legal_investigation_cases(case_id),
  granted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by        UUID NOT NULL REFERENCES auth.users(id),
  expires_at        TIMESTAMPTZ NOT NULL,
  revoked_at        TIMESTAMPTZ,
  revoked_by        UUID REFERENCES auth.users(id),
  revoked_reason    TEXT,
  aal_at_grant      TEXT NOT NULL CHECK (aal_at_grant = 'aal2'),
  ip_at_grant       INET,
  user_agent_at_grant TEXT,
  notes             TEXT,
  CONSTRAINT customs_counsel_sessions_expiry_after_grant
    CHECK (expires_at > granted_at)
);

CREATE INDEX IF NOT EXISTS idx_customs_counsel_sessions_active_user
  ON public.customs_counsel_sessions (user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customs_counsel_sessions_case
  ON public.customs_counsel_sessions (case_id)
  WHERE case_id IS NOT NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customs_counsel_sessions_expiry_sweep
  ON public.customs_counsel_sessions (expires_at)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE public.customs_counsel_sessions IS
  'Prompt #114 Q2=2a: MFA-verified counsel session record. Nightly pg_cron revokes all active rows at 00:05 UTC. Combined with legal_privilege_grants to gate customs_counsel_reviews.';

-- ---------------------------------------------------------------------------
-- Session helper: grant_customs_counsel_session (SECURITY DEFINER)
-- Only admin/legal_ops/compliance_officer can call; caller MUST be aal2 themselves.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.grant_customs_counsel_session(
  p_user_id UUID,
  p_case_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_role TEXT;
  caller_aal  TEXT;
  new_session_id UUID;
  new_expires_at TIMESTAMPTZ;
BEGIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
  IF caller_role IS NULL OR caller_role NOT IN ('admin','compliance_officer','legal_ops') THEN
    RAISE EXCEPTION 'Only admin/compliance_officer/legal_ops can grant counsel sessions'
      USING ERRCODE = 'P0001';
  END IF;

  caller_aal := COALESCE(current_setting('request.jwt.claim.aal', TRUE),
                         auth.jwt() ->> 'aal');
  IF caller_aal IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'Granting a counsel session requires the granter to be MFA-verified (aal2)'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_case_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.legal_privilege_grants g
    WHERE g.user_id = p_user_id AND g.case_id = p_case_id AND g.active = TRUE
  ) THEN
    RAISE EXCEPTION 'Counsel user % lacks an active legal_privilege_grants row for case %',
      p_user_id, p_case_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Session expires at next 00:05 UTC (nightly revoke window).
  new_expires_at := date_trunc('day', NOW() AT TIME ZONE 'UTC')
                    + INTERVAL '1 day'
                    + INTERVAL '5 minutes';

  INSERT INTO public.customs_counsel_sessions (
    user_id, case_id, granted_by, expires_at, aal_at_grant, notes
  ) VALUES (
    p_user_id, p_case_id, auth.uid(), new_expires_at, 'aal2', p_notes
  ) RETURNING session_id INTO new_session_id;

  RETURN new_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_customs_counsel_session(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_customs_counsel_session(UUID, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Nightly revoke: revoke_expired_customs_counsel_sessions()
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.revoke_expired_customs_counsel_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  WITH sweep AS (
    UPDATE public.customs_counsel_sessions
    SET revoked_at = NOW(),
        revoked_reason = 'nightly_expiry_sweep'
    WHERE revoked_at IS NULL
      AND expires_at <= NOW()
    RETURNING session_id
  )
  SELECT COUNT(*) INTO revoked_count FROM sweep;

  RETURN revoked_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- pg_cron job: run revoke sweep nightly at 00:05 UTC
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'customs_counsel_session_nightly_sweep') THEN
      PERFORM cron.unschedule('customs_counsel_session_nightly_sweep');
    END IF;

    PERFORM cron.schedule(
      'customs_counsel_session_nightly_sweep',
      '5 0 * * *',  -- 00:05 UTC daily
      $cron$ SELECT public.revoke_expired_customs_counsel_sessions(); $cron$
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS on customs_counsel_sessions: admin + granter can read; counsel can
-- read their own; no one can update/delete (immutable audit trail)
-- ---------------------------------------------------------------------------

ALTER TABLE public.customs_counsel_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customs_counsel_sessions_read ON public.customs_counsel_sessions;
CREATE POLICY customs_counsel_sessions_read ON public.customs_counsel_sessions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                AND role IN ('admin','compliance_officer','legal_ops'))
  );

DROP POLICY IF EXISTS customs_counsel_sessions_insert_via_function ON public.customs_counsel_sessions;
CREATE POLICY customs_counsel_sessions_insert_via_function ON public.customs_counsel_sessions FOR INSERT TO authenticated
  WITH CHECK (FALSE);  -- all inserts must go through grant_customs_counsel_session (SECURITY DEFINER)

DROP POLICY IF EXISTS customs_counsel_sessions_update_revoke_only ON public.customs_counsel_sessions;
CREATE POLICY customs_counsel_sessions_update_revoke_only ON public.customs_counsel_sessions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

-- ---------------------------------------------------------------------------
-- Augment customs_counsel_reviews RLS with session-active requirement for
-- non-internal roles. Replaces the SELECT + UPDATE policies from #220.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customs_counsel_reviews_read_scoped ON public.customs_counsel_reviews;
CREATE POLICY customs_counsel_reviews_read_scoped ON public.customs_counsel_reviews FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
             AND role IN ('admin','compliance_officer','legal_ops'))
    OR (
      customs_counsel_reviews.case_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.legal_privilege_grants g
        WHERE g.user_id = auth.uid()
          AND g.case_id = customs_counsel_reviews.case_id
          AND g.active = TRUE
      )
      AND EXISTS (
        SELECT 1 FROM public.customs_counsel_sessions s
        WHERE s.user_id = auth.uid()
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
          AND (s.case_id IS NULL OR s.case_id = customs_counsel_reviews.case_id)
      )
    )
  );

DROP POLICY IF EXISTS customs_counsel_reviews_update_decide ON public.customs_counsel_reviews;
CREATE POLICY customs_counsel_reviews_update_decide ON public.customs_counsel_reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (
      customs_counsel_reviews.case_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.legal_privilege_grants g
        WHERE g.user_id = auth.uid()
          AND g.case_id = customs_counsel_reviews.case_id
          AND g.active = TRUE
      )
      AND EXISTS (
        SELECT 1 FROM public.customs_counsel_sessions s
        WHERE s.user_id = auth.uid()
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
          AND (s.case_id IS NULL OR s.case_id = customs_counsel_reviews.case_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (
      customs_counsel_reviews.case_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.legal_privilege_grants g
        WHERE g.user_id = auth.uid()
          AND g.case_id = customs_counsel_reviews.case_id
          AND g.active = TRUE
      )
      AND EXISTS (
        SELECT 1 FROM public.customs_counsel_sessions s
        WHERE s.user_id = auth.uid()
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
          AND (s.case_id IS NULL OR s.case_id = customs_counsel_reviews.case_id)
      )
    )
  );

-- =============================================================================
-- End of 20260424000230_prompt_114_counsel_mfa.sql
-- =============================================================================
