-- =============================================================================
-- Prompt #171: TELEMETRY AUDIT (high-sensitivity compliance audit log)
-- Migration: 20260516000200_prompt_171_telemetry_audit.sql
-- Entity: Farmceutica Wellness Ltd
--
-- WHY THIS EXISTS (spec section 12 "audit table for high-sensitivity events"):
--   Ordinary product telemetry flows to public.analytics_events (metadata only).
--   A SMALL set of events is compliance-relevant and needs a separate, append
--   only, immutable record: a biometric-consent change, a data-deletion request,
--   an age-gate rejection, a practitioner clinical-override, a restricted-region
--   access attempt. This table is that record. It is NOT a second analytics
--   pipeline; it captures only the stable category + the affected/acting user +
--   primitive metadata, so a compliance reviewer can reconstruct who did what,
--   when, WITHOUT any biometric/health value ever landing here.
--
-- IMMUTABILITY / APPEND-ONLY (the discipline the review checks):
--   This is an audit log. There is NO client read path and NO UPDATE or DELETE
--   policy for anyone. Writes happen only via service_role / SECURITY DEFINER
--   server paths, which bypass RLS. Because no UPDATE/DELETE policy exists, an
--   authenticated client (even an admin) can never mutate or erase a row through
--   the API; only the service_role connection (server-only secret) can write, and
--   it only ever INSERTs. This mirrors the append-only discipline of
--   public.feature_flag_audit (Prompt #93).
--
-- NO BIOMETRIC DATA RULE:
--   metadata is jsonb but callers MUST pass primitives-only metadata and NEVER a
--   measurement, photo, silhouette, avatar, body-fat value, the disordered-eating
--   response, a cycle phase, or any health value. The high-sensitivity events
--   logged here are CATEGORY signals ("consent changed", "age gate rejected"),
--   not the sensitive value itself. This is the same privacy posture as the
--   telemetry-event-relay edge function and src/lib/body-tracker/scan-analytics.ts.
--
-- MIGRATION NUMBERING:
--   This is 20260516000200. The #169f set on this branch sorts 050..170; #170's
--   live work occupies the 20260516120010+ lane; a parallel branch
--   (feat/prompt-169f-membership-delta) uses 180/190. 200 sorts AFTER 170, is
--   clear of the 120010 lane, and avoids the 180/190 collision. Append-only: this
--   is a NEW file; no existing migration is edited.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.telemetry_audit (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stable category string for the high-sensitivity event. Constrained to the
  -- known set so a typo cannot create an unauditable category; extend the CHECK
  -- in a future append-only migration when a new compliance event is added.
  event_type      TEXT NOT NULL CHECK (event_type IN (
    'biometric_consent_changed',
    'data_deletion_requested',
    'age_gate_rejected',
    'practitioner_override_used',
    'restricted_region_attempt'
  )),
  -- The affected user. Nullable, and ON DELETE SET NULL so the audit row SURVIVES
  -- a user deletion (the compliance record must outlive the account; we keep the
  -- event, we just forget which user it was once they are erased).
  subject_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Who acted (e.g. the practitioner who used a clinical override). Nullable; also
  -- SET NULL on deletion so the row survives.
  actor_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Primitives-only context. CALLERS MUST PASS ONLY metadata (a coarse reason
  -- code, a region code, a consent version, a boolean), NEVER measurements,
  -- photos, silhouettes, avatars, body-fat values, the disordered-eating
  -- response, a cycle phase, or any health value.
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.telemetry_audit IS
  'Append-only, immutable audit log for high-sensitivity compliance telemetry (consent changes, data-deletion requests, age-gate rejections, practitioner clinical-overrides, restricted-region attempts). No client read/write; written only via service_role / SECURITY DEFINER. metadata is primitives-only and must never contain biometric/health values. Prompt #171 section 12.';

COMMENT ON COLUMN public.telemetry_audit.metadata IS
  'Primitives-only context (coarse reason codes, region/consent identifiers, booleans). NEVER measurements, photos, body-fat, disordered-eating response, cycle phase, or any health value.';

-- Index for the common audit-review queries: by category over time.
CREATE INDEX IF NOT EXISTS idx_telemetry_audit_type_created
  ON public.telemetry_audit (event_type, created_at DESC);

-- Index for per-subject lookups (e.g. fulfilling a data-subject request), partial
-- so it stays small and skips rows whose subject was erased / never set.
CREATE INDEX IF NOT EXISTS idx_telemetry_audit_subject
  ON public.telemetry_audit (subject_user_id)
  WHERE subject_user_id IS NOT NULL;

-- =============================================================================
-- RLS: this is an audit log. NO client read, NO client write, NO update/delete.
-- =============================================================================
ALTER TABLE public.telemetry_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Admins may READ the audit log (compliance review). This is the ONLY client
  -- facing grant, and it is SELECT-only, matching the public.feature_flag_audit
  -- admin-read precedent. A non-admin authenticated user matches no policy and so
  -- can read nothing; with RLS enabled and no permissive policy for them, every
  -- SELECT returns zero rows.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'telemetry_audit'
      AND policyname = 'telemetry_audit_admin_read'
  ) THEN
    CREATE POLICY "telemetry_audit_admin_read"
      ON public.telemetry_audit FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      ));
  END IF;

  -- service_role full access (the only WRITE path). Server-side relays / SECURITY
  -- DEFINER functions run as service_role and only ever INSERT. There is
  -- deliberately NO INSERT/UPDATE/DELETE policy for clients (authenticated or
  -- anon), so:
  --   * a client (even an admin) can NEVER insert, update, or delete a row, and
  --   * the table is append-only in spirit: the sole writer (service_role) inserts
  --     and is trusted not to mutate history.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'telemetry_audit'
      AND policyname = 'telemetry_audit_service_all'
  ) THEN
    CREATE POLICY "telemetry_audit_service_all"
      ON public.telemetry_audit FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
