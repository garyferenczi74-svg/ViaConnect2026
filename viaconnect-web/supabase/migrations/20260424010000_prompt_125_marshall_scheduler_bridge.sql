-- =============================================================================
-- Prompt #125 P1: Marshall Scheduler Bridge
-- =============================================================================
-- Six new tables + RLS for the scheduler pre-publication pipeline:
--
--   scheduler_connections   OAuth connections per practitioner + platform
--   scheduler_events        webhook event ingress (idempotency-tracked)
--   scheduler_scans         one row per evaluation pass on a scheduler draft
--   scheduler_interceptions attempted holds/delays/rejects on the platform
--   scheduler_overrides     practitioner overrides of BLOCK decisions
--   scheduler_poll_state    polling cadence state for Later/Planoly
--
-- Design notes:
--   - Tokens live in Supabase Vault. token_vault_ref is a pointer, not the
--     token itself. No row on any of these tables stores an OAuth secret.
--   - Scheduler draft plaintext is never persisted. content_hash_sha256
--     on scheduler_scans is the only content residue; findings are recorded
--     by rule id + severity (no excerpts).
--   - Every FK is indexed. Every UNIQUE (platform, external_*_id) pair
--     enforces idempotency across webhook replay storms.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. scheduler_connections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduler_connections (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id        uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  platform               text NOT NULL CHECK (platform IN (
                           'buffer','hootsuite','later','sprout_social','planoly'
                         )),
  external_account_id    text NOT NULL,
  external_account_label text,
  scopes_granted         text[] NOT NULL,
  token_vault_ref        text NOT NULL,
  connected_at           timestamptz NOT NULL DEFAULT now(),
  last_verified_at       timestamptz,
  last_event_at          timestamptz,
  active                 boolean NOT NULL DEFAULT true,
  disconnected_at        timestamptz,
  disconnected_reason    text CHECK (disconnected_reason IN (
                           'user_requested','scope_reduction','token_revoked','platform_error','admin_action'
                         )),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (practitioner_id, platform, external_account_id)
);

CREATE INDEX IF NOT EXISTS idx_scheduler_conns_practitioner
  ON public.scheduler_connections (practitioner_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_conns_active
  ON public.scheduler_connections (platform, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_scheduler_conns_last_event
  ON public.scheduler_connections (platform, last_event_at DESC) WHERE active = true;

-- ---------------------------------------------------------------------------
-- 2. scheduler_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduler_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform           text NOT NULL,
  external_event_id  text NOT NULL,
  event_type         text NOT NULL,
  connection_id      uuid REFERENCES public.scheduler_connections(id),
  external_post_id   text,
  raw_payload        jsonb NOT NULL,
  received_at        timestamptz NOT NULL DEFAULT now(),
  processed_at       timestamptz,
  processing_status  text NOT NULL DEFAULT 'pending'
                      CHECK (processing_status IN ('pending','processing','processed','errored','deduplicated')),
  error_message      text,
  UNIQUE (platform, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_scheduler_events_status
  ON public.scheduler_events (processing_status, received_at);
CREATE INDEX IF NOT EXISTS idx_scheduler_events_connection
  ON public.scheduler_events (connection_id) WHERE connection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduler_events_post
  ON public.scheduler_events (platform, external_post_id) WHERE external_post_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. scheduler_scans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduler_scans (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id                  text NOT NULL UNIQUE,
  connection_id            uuid NOT NULL REFERENCES public.scheduler_connections(id),
  event_id                 uuid REFERENCES public.scheduler_events(id),
  practitioner_id          uuid NOT NULL REFERENCES public.practitioners(id),
  external_post_id         text NOT NULL,
  target_platforms         text[] NOT NULL,
  scheduled_at             timestamptz NOT NULL,
  content_hash_sha256      text NOT NULL,
  rule_registry_version    text NOT NULL,
  receipt_reused_id        uuid REFERENCES public.precheck_clearance_receipts(id),
  receipt_issued_id        uuid REFERENCES public.precheck_clearance_receipts(id),
  vision_determination_id  uuid REFERENCES public.counterfeit_determinations(id),
  precheck_session_id      uuid REFERENCES public.precheck_sessions(id),
  decision                 text NOT NULL CHECK (decision IN (
                             'clean','findings_surfaced','blocked','fail_closed','override_accepted'
                           )),
  findings_summary         jsonb,
  scanned_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduler_scans_practitioner
  ON public.scheduler_scans (practitioner_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduler_scans_decision
  ON public.scheduler_scans (decision);
CREATE INDEX IF NOT EXISTS idx_scheduler_scans_scheduled
  ON public.scheduler_scans (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduler_scans_hash
  ON public.scheduler_scans (content_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_scheduler_scans_connection
  ON public.scheduler_scans (connection_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduler_scans_event
  ON public.scheduler_scans (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduler_scans_receipt_reused
  ON public.scheduler_scans (receipt_reused_id) WHERE receipt_reused_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduler_scans_receipt_issued
  ON public.scheduler_scans (receipt_issued_id) WHERE receipt_issued_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scheduler_scans_vision
  ON public.scheduler_scans (vision_determination_id) WHERE vision_determination_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. scheduler_interceptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduler_interceptions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id           uuid NOT NULL REFERENCES public.scheduler_scans(id),
  platform          text NOT NULL,
  mechanism         text NOT NULL CHECK (mechanism IN (
                      'buffer_draft_status','hootsuite_approval_reject',
                      'later_reschedule','sprout_approval_reject','planoly_notify_only',
                      'manual_block_note'
                    )),
  attempted_at      timestamptz NOT NULL DEFAULT now(),
  succeeded         boolean,
  platform_response jsonb,
  error_message     text
);

CREATE INDEX IF NOT EXISTS idx_interceptions_scan
  ON public.scheduler_interceptions (scan_id);
CREATE INDEX IF NOT EXISTS idx_interceptions_platform_recent
  ON public.scheduler_interceptions (platform, attempted_at DESC);

-- ---------------------------------------------------------------------------
-- 5. scheduler_overrides
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduler_overrides (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id                uuid NOT NULL REFERENCES public.scheduler_scans(id),
  practitioner_id        uuid NOT NULL REFERENCES public.practitioners(id),
  finding_ids            text[] NOT NULL,
  justification          text NOT NULL CHECK (length(justification) <= 2000),
  ip_address             inet,
  user_agent             text,
  signed_at              timestamptz NOT NULL DEFAULT now(),
  pattern_flag_triggered boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_overrides_practitioner
  ON public.scheduler_overrides (practitioner_id, signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_overrides_scan
  ON public.scheduler_overrides (scan_id);

-- ---------------------------------------------------------------------------
-- 6. scheduler_poll_state
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduler_poll_state (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id        uuid NOT NULL UNIQUE REFERENCES public.scheduler_connections(id),
  last_poll_at         timestamptz,
  last_poll_success_at timestamptz,
  consecutive_errors   int NOT NULL DEFAULT 0 CHECK (consecutive_errors >= 0),
  last_error_message   text,
  next_poll_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poll_next
  ON public.scheduler_poll_state (next_poll_at);

-- =============================================================================
-- RLS
-- =============================================================================
ALTER TABLE public.scheduler_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_scans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_interceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_overrides     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduler_poll_state    ENABLE ROW LEVEL SECURITY;

-- Practitioners can read/write their own connections; admins can see all.
DROP POLICY IF EXISTS scheduler_conns_self_rw ON public.scheduler_connections;
CREATE POLICY scheduler_conns_self_rw ON public.scheduler_connections
  FOR ALL TO authenticated
  USING (
    auth.uid() = practitioner_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                AND role IN ('admin','superadmin','compliance_admin'))
  )
  WITH CHECK (
    auth.uid() = practitioner_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                AND role IN ('admin','superadmin','compliance_admin'))
  );

DROP POLICY IF EXISTS scheduler_scans_self_read ON public.scheduler_scans;
CREATE POLICY scheduler_scans_self_read ON public.scheduler_scans
  FOR SELECT TO authenticated
  USING (
    auth.uid() = practitioner_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                AND role IN ('admin','superadmin','compliance_admin'))
  );

DROP POLICY IF EXISTS scheduler_overrides_self_read ON public.scheduler_overrides;
CREATE POLICY scheduler_overrides_self_read ON public.scheduler_overrides
  FOR SELECT TO authenticated
  USING (
    auth.uid() = practitioner_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                AND role IN ('admin','superadmin','compliance_admin'))
  );

DROP POLICY IF EXISTS scheduler_overrides_self_insert ON public.scheduler_overrides;
CREATE POLICY scheduler_overrides_self_insert ON public.scheduler_overrides
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = practitioner_id);

-- Events, interceptions, poll state: admin-only read; writes via service role.
DROP POLICY IF EXISTS scheduler_events_admin ON public.scheduler_events;
CREATE POLICY scheduler_events_admin ON public.scheduler_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','superadmin','compliance_admin')));

DROP POLICY IF EXISTS scheduler_interceptions_admin ON public.scheduler_interceptions;
CREATE POLICY scheduler_interceptions_admin ON public.scheduler_interceptions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','superadmin','compliance_admin')));

DROP POLICY IF EXISTS scheduler_poll_state_admin ON public.scheduler_poll_state;
CREATE POLICY scheduler_poll_state_admin ON public.scheduler_poll_state
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','superadmin','compliance_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                       AND role IN ('admin','superadmin','compliance_admin')));

COMMENT ON TABLE public.scheduler_connections IS
  'Prompt #125 P1: practitioner OAuth connections to Buffer/Hootsuite/Later/Sprout/Planoly. Tokens in Vault; this table holds only a Vault reference and scope metadata.';
COMMENT ON TABLE public.scheduler_scans IS
  'Prompt #125 P1: one row per pre-publication evaluation of a scheduler draft. Plaintext never persisted; only content_hash_sha256 and findings_summary (counts by severity).';
