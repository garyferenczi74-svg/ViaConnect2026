-- =============================================================================
-- Prompt #122 P1: SOC 2 Evidence Auto-Exporter — schema
-- =============================================================================
-- Nine tables that back the SOC 2 packet lifecycle:
--   1. soc2_packets                    packet header (one per generated packet)
--   2. soc2_packet_files               file index inside a packet
--   3. soc2_collector_runs             per-collector attestation rows
--   4. soc2_manual_evidence            manual evidence vault (Steve Rica uploads)
--   5. soc2_signing_keys               ES256 key ledger (separate from #121 keys)
--   6. soc2_distribution_attempts      Drata/Vanta push history
--   7. soc2_auditor_grants             time-boxed external-auditor read grants
--   8. soc2_auditor_access_log         every auditor action
--   9. soc2_pseudonym_keys             per-packet HMAC keys (Vault refs only)
--
-- Append-only. Idempotent. RLS on every table. Re-uses the
-- public.is_compliance_reader() helper from #119. Reuses auth.jwt() email
-- resolution pattern from #104 legal_privilege_grants.
--
-- CedarGrowth / Via Cura references intentionally absent per the amendment
-- to #119/#120 (2026-04-23).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. soc2_packets ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.soc2_packets (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_uuid             text NOT NULL UNIQUE,
  period_start            timestamptz NOT NULL,
  period_end              timestamptz NOT NULL,
  attestation_type        text NOT NULL DEFAULT 'Type II'
                            CHECK (attestation_type IN ('Type I','Type II')),
  tsc_in_scope            text[] NOT NULL,
  generated_at            timestamptz NOT NULL DEFAULT now(),
  generated_by            text NOT NULL,
  rule_registry_version   text NOT NULL,
  root_hash               text NOT NULL,
  category_hashes         jsonb NOT NULL,
  signing_key_id          text NOT NULL,
  signature_jwt           text NOT NULL,
  storage_key             text NOT NULL,
  storage_sha256          text NOT NULL,
  size_bytes              bigint NOT NULL,
  legal_hold              boolean NOT NULL DEFAULT false,
  retention_until         date NOT NULL,
  status                  text NOT NULL DEFAULT 'generating'
                            CHECK (status IN ('generating','generated','published','superseded','retired')),
  superseded_by           uuid REFERENCES public.soc2_packets(id),
  CONSTRAINT soc2_packets_period_ordered CHECK (period_end > period_start)
);

CREATE INDEX IF NOT EXISTS idx_soc2_packets_period   ON public.soc2_packets (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_soc2_packets_status   ON public.soc2_packets (status, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_soc2_packets_legal_hold ON public.soc2_packets (legal_hold) WHERE legal_hold = true;

-- ── 2. soc2_packet_files ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.soc2_packet_files (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id                 uuid NOT NULL REFERENCES public.soc2_packets(id) ON DELETE RESTRICT,
  relative_path             text NOT NULL,
  content_type              text NOT NULL,
  sha256                    text NOT NULL,
  size_bytes                bigint NOT NULL,
  collector_id              text,
  deterministic_query_hash  text,
  controls                  text[] NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (packet_id, relative_path)
);

CREATE INDEX IF NOT EXISTS idx_soc2_packet_files_packet   ON public.soc2_packet_files (packet_id);
CREATE INDEX IF NOT EXISTS idx_soc2_packet_files_controls ON public.soc2_packet_files USING gin (controls);

-- ── 3. soc2_collector_runs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.soc2_collector_runs (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id                     uuid NOT NULL REFERENCES public.soc2_packets(id) ON DELETE CASCADE,
  collector_id                  text NOT NULL,
  collector_version             text NOT NULL,
  data_source                   text NOT NULL,
  query                         text NOT NULL,
  query_hash                    text NOT NULL,
  parameters                    jsonb NOT NULL,
  row_count                     integer NOT NULL,
  output_sha256                 text NOT NULL,
  deterministic_replay_proof    jsonb NOT NULL,
  executed_at                   timestamptz NOT NULL DEFAULT now(),
  duration_ms                   integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_soc2_collector_runs_packet    ON public.soc2_collector_runs (packet_id);
CREATE INDEX IF NOT EXISTS idx_soc2_collector_runs_collector ON public.soc2_collector_runs (collector_id, executed_at DESC);

-- ── 4. soc2_manual_evidence ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.soc2_manual_evidence (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  storage_key         text NOT NULL,
  sha256              text NOT NULL,
  size_bytes          bigint NOT NULL,
  content_type        text NOT NULL,
  controls            text[] NOT NULL,
  valid_from          date,
  valid_until         date,
  source_description  text NOT NULL,
  uploaded_by         uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at         timestamptz NOT NULL DEFAULT now(),
  signoff_by          uuid REFERENCES auth.users(id),
  signoff_at          timestamptz,
  superseded_by       uuid REFERENCES public.soc2_manual_evidence(id),
  archived            boolean NOT NULL DEFAULT false,
  archived_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_soc2_manual_evidence_controls ON public.soc2_manual_evidence USING gin (controls);
CREATE INDEX IF NOT EXISTS idx_soc2_manual_evidence_valid
  ON public.soc2_manual_evidence (valid_until) WHERE archived = false;

-- ── 5. soc2_signing_keys ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.soc2_signing_keys (
  id                text PRIMARY KEY,
  alg               text NOT NULL DEFAULT 'ES256',
  public_key_pem    text NOT NULL,
  private_key_ref   text NOT NULL,
  active            boolean NOT NULL DEFAULT true,
  rotation_of       text REFERENCES public.soc2_signing_keys(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  retired_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_soc2_signing_keys_active
  ON public.soc2_signing_keys (active) WHERE active = true;

-- ── 6. soc2_distribution_attempts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.soc2_distribution_attempts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id             uuid NOT NULL REFERENCES public.soc2_packets(id) ON DELETE CASCADE,
  platform              text NOT NULL CHECK (platform IN ('drata','vanta','manual_download')),
  attempted_at          timestamptz NOT NULL DEFAULT now(),
  status                text NOT NULL CHECK (status IN ('succeeded','failed','retrying')),
  http_status           integer,
  response_excerpt      text,
  error_message         text,
  uploaded_files_count  integer
);

CREATE INDEX IF NOT EXISTS idx_soc2_distribution_packet ON public.soc2_distribution_attempts (packet_id, attempted_at DESC);

-- ── 7. soc2_auditor_grants ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.soc2_auditor_grants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_email   text NOT NULL,
  auditor_firm    text NOT NULL,
  packet_ids      uuid[] NOT NULL,
  granted_by      uuid NOT NULL REFERENCES auth.users(id),
  granted_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  revoked         boolean NOT NULL DEFAULT false,
  revoked_at      timestamptz,
  revoked_by      uuid REFERENCES auth.users(id),
  access_count    integer NOT NULL DEFAULT 0,
  CONSTRAINT soc2_auditor_grants_expiry_window
    CHECK (expires_at > granted_at
           AND expires_at <= granted_at + interval '90 days')
);

CREATE INDEX IF NOT EXISTS idx_soc2_auditor_grants_email
  ON public.soc2_auditor_grants (auditor_email) WHERE revoked = false;
CREATE INDEX IF NOT EXISTS idx_soc2_auditor_grants_expires
  ON public.soc2_auditor_grants (expires_at) WHERE revoked = false;

-- ── 8. soc2_auditor_access_log (append-only) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.soc2_auditor_access_log (
  id                  bigserial PRIMARY KEY,
  grant_id            uuid NOT NULL REFERENCES public.soc2_auditor_grants(id),
  packet_id           uuid REFERENCES public.soc2_packets(id),
  action              text NOT NULL CHECK (action IN (
                        'packet_view','file_view','file_download','packet_download',
                        'pseudonym_resolve_request','pseudonym_resolve_granted',
                        'pseudonym_resolve_denied')),
  target_path         text,
  resolved_pseudonym  text,
  justification       text,
  approver_steve      uuid REFERENCES auth.users(id),
  approver_thomas     uuid REFERENCES auth.users(id),
  ip_address          inet,
  user_agent          text,
  occurred_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_soc2_auditor_access_grant
  ON public.soc2_auditor_access_log (grant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_soc2_auditor_access_packet
  ON public.soc2_auditor_access_log (packet_id, occurred_at DESC) WHERE packet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_soc2_auditor_access_action
  ON public.soc2_auditor_access_log (action, occurred_at DESC);

-- ── 9. soc2_pseudonym_keys ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.soc2_pseudonym_keys (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id      uuid NOT NULL UNIQUE REFERENCES public.soc2_packets(id) ON DELETE RESTRICT,
  key_ref        text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  destroyed_at   timestamptz
);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.soc2_packets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soc2_packet_files            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soc2_collector_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soc2_manual_evidence         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soc2_signing_keys            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soc2_distribution_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soc2_auditor_grants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soc2_auditor_access_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soc2_pseudonym_keys          ENABLE ROW LEVEL SECURITY;

-- Compliance reader helper (from #119). Re-declared CREATE OR REPLACE to avoid
-- ordering surprises if this migration runs before #119 in a replay.
CREATE OR REPLACE FUNCTION public.is_compliance_reader()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','superadmin','compliance_officer','compliance_admin')
  );
$$;

-- Auditor-scoped helper: current auth.uid() belongs to an auditor grant that
-- is active, not revoked, not expired, and the packet_id is in its grant list.
CREATE OR REPLACE FUNCTION public.soc2_has_auditor_access(p_packet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.soc2_auditor_grants g
    WHERE g.auditor_email = auth.jwt() ->> 'email'
      AND g.revoked = false
      AND g.expires_at > now()
      AND p_packet_id = ANY (g.packet_ids)
  );
$$;

-- ── soc2_packets ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS soc2_packets_compliance_read ON public.soc2_packets;
CREATE POLICY soc2_packets_compliance_read ON public.soc2_packets
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader() OR public.soc2_has_auditor_access(id));

-- No UPDATE policy: packets are append-only after generation; supersession
-- is handled by inserting a new packet with superseded_by.

-- ── soc2_packet_files ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS soc2_files_compliance_read ON public.soc2_packet_files;
CREATE POLICY soc2_files_compliance_read ON public.soc2_packet_files
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader() OR public.soc2_has_auditor_access(packet_id));

-- ── soc2_collector_runs ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS soc2_collector_runs_read ON public.soc2_collector_runs;
CREATE POLICY soc2_collector_runs_read ON public.soc2_collector_runs
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader() OR public.soc2_has_auditor_access(packet_id));

-- ── soc2_manual_evidence ────────────────────────────────────────────────────
DROP POLICY IF EXISTS soc2_manual_read ON public.soc2_manual_evidence;
DROP POLICY IF EXISTS soc2_manual_insert ON public.soc2_manual_evidence;
DROP POLICY IF EXISTS soc2_manual_update ON public.soc2_manual_evidence;
CREATE POLICY soc2_manual_read ON public.soc2_manual_evidence
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());
CREATE POLICY soc2_manual_insert ON public.soc2_manual_evidence
  FOR INSERT TO authenticated
  WITH CHECK (public.is_compliance_reader() AND uploaded_by = auth.uid());
CREATE POLICY soc2_manual_update ON public.soc2_manual_evidence
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());
-- No DELETE policy: manual evidence is archived, not deleted.

-- ── soc2_signing_keys (superadmin only via compliance_reader; private ref is
--    Vault path, not the key itself; still restrict hardest) ─────────────────
DROP POLICY IF EXISTS soc2_signing_keys_read ON public.soc2_signing_keys;
CREATE POLICY soc2_signing_keys_read ON public.soc2_signing_keys
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());
-- No write policies: keys are managed via server-side RPC with dual approval.

-- ── soc2_distribution_attempts (read-only for compliance) ───────────────────
DROP POLICY IF EXISTS soc2_distribution_read ON public.soc2_distribution_attempts;
CREATE POLICY soc2_distribution_read ON public.soc2_distribution_attempts
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

-- ── soc2_auditor_grants (compliance read + insert; auditor reads own) ───────
DROP POLICY IF EXISTS soc2_auditor_grants_compliance_read ON public.soc2_auditor_grants;
DROP POLICY IF EXISTS soc2_auditor_grants_compliance_insert ON public.soc2_auditor_grants;
DROP POLICY IF EXISTS soc2_auditor_grants_compliance_update ON public.soc2_auditor_grants;
DROP POLICY IF EXISTS soc2_auditor_grants_auditor_self_read ON public.soc2_auditor_grants;
CREATE POLICY soc2_auditor_grants_compliance_read ON public.soc2_auditor_grants
  FOR SELECT TO authenticated USING (public.is_compliance_reader());
CREATE POLICY soc2_auditor_grants_compliance_insert ON public.soc2_auditor_grants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_compliance_reader() AND granted_by = auth.uid());
CREATE POLICY soc2_auditor_grants_compliance_update ON public.soc2_auditor_grants
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());
CREATE POLICY soc2_auditor_grants_auditor_self_read ON public.soc2_auditor_grants
  FOR SELECT TO authenticated
  USING (auditor_email = auth.jwt() ->> 'email' AND revoked = false);

-- ── soc2_auditor_access_log (append-only; compliance reads all;
--    auditor reads their own grant's log) ──────────────────────────────────
DROP POLICY IF EXISTS soc2_access_log_compliance_read ON public.soc2_auditor_access_log;
DROP POLICY IF EXISTS soc2_access_log_auditor_self_read ON public.soc2_auditor_access_log;
CREATE POLICY soc2_access_log_compliance_read ON public.soc2_auditor_access_log
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());
CREATE POLICY soc2_access_log_auditor_self_read ON public.soc2_auditor_access_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.soc2_auditor_grants g
      WHERE g.id = soc2_auditor_access_log.grant_id
        AND g.auditor_email = auth.jwt() ->> 'email'
    )
  );

-- ── soc2_pseudonym_keys: NEVER readable via SQL; access only via server
--    service role. RLS with zero policies on SELECT means authenticated
--    returns zero rows. Service role bypasses RLS. ──────────────────────────
-- (no CREATE POLICY statements)

-- =============================================================================
-- Append-only guard on access log
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prevent_soc2_access_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'soc2_auditor_access_log is append-only; UPDATE/DELETE forbidden';
END $$;

DROP TRIGGER IF EXISTS soc2_access_log_no_update ON public.soc2_auditor_access_log;
CREATE TRIGGER soc2_access_log_no_update
  BEFORE UPDATE ON public.soc2_auditor_access_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_soc2_access_log_mutation();

DROP TRIGGER IF EXISTS soc2_access_log_no_delete ON public.soc2_auditor_access_log;
CREATE TRIGGER soc2_access_log_no_delete
  BEFORE DELETE ON public.soc2_auditor_access_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_soc2_access_log_mutation();

-- =============================================================================
-- Access-count tick (incremented via RPC; not eagerly surfaced as a trigger
-- so reads are cheap. RPC lives in #122 P5.)
-- =============================================================================

COMMENT ON TABLE public.soc2_packets IS
  'Prompt #122 P1: SOC 2 evidence packets. One row per generated packet. Immutable after status leaves generating.';
COMMENT ON TABLE public.soc2_pseudonym_keys IS
  'Prompt #122 P1: per-packet HMAC keys. key_ref points into Supabase Vault. SELECT explicitly denied at the RLS layer for all authenticated roles; only the service-role server path can read the Vault reference.';
