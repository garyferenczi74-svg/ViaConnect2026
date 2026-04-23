-- =============================================================================
-- Prompt #120: Hounddog -> Marshall Bridge (APPEND-ONLY, IDEMPOTENT)
-- =============================================================================
-- Runtime Marshall gets an external-web sensor. Schema only; collectors + OCR +
-- ASR + Playwright remain feature-flagged pending SDK approvals (see CLAUDE.md
-- "no package.json changes" standing rule).
--
-- Tables (12 new):
--   practitioner_social_handles         verified handle registry
--   social_signals                      normalized ingested signals
--   social_signals_below_threshold      low-confidence signals (no finding)
--   social_signals_unmatched            parked for periodic re-match
--   compliance_evidence                 legal-grade evidence bundles (header)
--   compliance_evidence_artifacts       per-artifact chain-of-custody rows
--   practitioner_notices                user-facing view of a finding
--   practitioner_notice_appeals         rebuttal submissions
--   practitioner_strikes                three-strike ledger w/ 180-day rolloff
--   social_review_queue                 mid-confidence human disposition queue
--   takedown_requests                   DMCA / Brand Registry pipeline
--   hounddog_collector_state            per-collector operational state
--
-- Plus: compliance_findings gains evidence_bundle_id column (from #119 core).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. practitioner_social_handles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.practitioner_social_handles (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id       uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  platform              text NOT NULL CHECK (platform IN (
                          'instagram','tiktok','youtube','x','linkedin','facebook',
                          'substack','podcast','reddit','website','other')),
  handle                text NOT NULL,
  handle_external_id    text,
  verification_method   text NOT NULL CHECK (verification_method IN (
                          'self_registered','npi_public','steve_manual','meta_business_verification')),
  verified_at           timestamptz,
  verified_by           uuid REFERENCES auth.users(id),
  active                boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, handle)
);
CREATE INDEX IF NOT EXISTS idx_social_handles_practitioner ON public.practitioner_social_handles(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_social_handles_platform_handle ON public.practitioner_social_handles(platform, handle);

-- ── 2. social_signals ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_signals (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_signal_id                   uuid,
  collector_id                    text NOT NULL,
  url                             text NOT NULL,
  published_at                    timestamptz,
  captured_at                     timestamptz NOT NULL DEFAULT now(),
  author_handle                   text NOT NULL,
  author_external_id              text,
  author_display_name             text,
  matched_practitioner_id         uuid REFERENCES public.practitioners(id) ON DELETE SET NULL,
  practitioner_match_confidence   numeric(3,2),
  practitioner_match_method       text,
  language                        text,
  text_derived                    text,
  fingerprint_simhash             text,
  jurisdiction_country            text,
  jurisdiction_region             text,
  product_matches                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing                         jsonb,
  content_quality_score           numeric(3,2) NOT NULL DEFAULT 1.0,
  overall_confidence              numeric(3,2) NOT NULL DEFAULT 0.0,
  status                          text NOT NULL DEFAULT 'normalized'
                                    CHECK (status IN ('normalized','evaluated','finding_opened','dismissed','below_threshold')),
  created_at                      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_social_signals_fingerprint ON public.social_signals(fingerprint_simhash);
CREATE INDEX IF NOT EXISTS idx_social_signals_practitioner ON public.social_signals(matched_practitioner_id) WHERE matched_practitioner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_signals_status ON public.social_signals(status, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_signals_collector ON public.social_signals(collector_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_signals_url ON public.social_signals(url);

-- ── 3. social_signals_below_threshold ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_signals_below_threshold (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id   uuid NOT NULL,
  reason      text NOT NULL,
  confidence  numeric(3,2) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_below_threshold_created ON public.social_signals_below_threshold(created_at DESC);

-- ── 4. social_signals_unmatched ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_signals_unmatched (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id       uuid NOT NULL,
  reason          text NOT NULL CHECK (reason IN ('no_practitioner_match','no_product_match','both')),
  retry_count     int NOT NULL DEFAULT 0,
  next_retry_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_unmatched_retry ON public.social_signals_unmatched(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- ── 5. compliance_evidence ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_evidence (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id           uuid REFERENCES public.social_signals(id) ON DELETE SET NULL,
  collected_at        timestamptz NOT NULL DEFAULT now(),
  collected_by        text NOT NULL DEFAULT 'hounddog_collector_v1',
  wayback_url         text,
  manifest_sha256     text NOT NULL,
  retention_until     date NOT NULL,
  legal_hold          boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_signal ON public.compliance_evidence(signal_id) WHERE signal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_evidence_retention ON public.compliance_evidence(retention_until);

-- ── 6. compliance_evidence_artifacts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_evidence_artifacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id   uuid NOT NULL REFERENCES public.compliance_evidence(id) ON DELETE RESTRICT,
  kind        text NOT NULL CHECK (kind IN ('pdf','png','html','wayback','transcript','ocr','headers','trace','stub')),
  storage_key text NOT NULL,
  sha256      text NOT NULL,
  size_bytes  bigint NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_artifacts_bundle ON public.compliance_evidence_artifacts(bundle_id);

-- ── Link findings -> evidence bundles (idempotent ALTER) ────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compliance_findings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='compliance_findings' AND column_name='evidence_bundle_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.compliance_findings ADD COLUMN evidence_bundle_id uuid REFERENCES public.compliance_evidence(id)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_findings_evidence ON public.compliance_findings(evidence_bundle_id) WHERE evidence_bundle_id IS NOT NULL';
    END IF;
  END IF;
END $$;

-- ── 7. practitioner_notices ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.practitioner_notices (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id              text NOT NULL UNIQUE,
  practitioner_id        uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  finding_id             uuid REFERENCES public.compliance_findings(id) ON DELETE SET NULL,
  severity               text NOT NULL CHECK (severity IN ('P0','P1','P2','P3','ADVISORY')),
  status                 text NOT NULL DEFAULT 'issued'
                           CHECK (status IN ('issued','acknowledged','in_remediation','remediated','appealed','escalated','closed')),
  remediation_due_at     timestamptz NOT NULL,
  acknowledged_at        timestamptz,
  remediated_at          timestamptz,
  resolution_note        text,
  strike_applied         boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notices_practitioner_status ON public.practitioner_notices(practitioner_id, status);
CREATE INDEX IF NOT EXISTS idx_notices_due ON public.practitioner_notices(remediation_due_at) WHERE status IN ('issued','acknowledged','in_remediation');
CREATE INDEX IF NOT EXISTS idx_notices_finding ON public.practitioner_notices(finding_id) WHERE finding_id IS NOT NULL;

-- ── 8. practitioner_notice_appeals ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.practitioner_notice_appeals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id         uuid NOT NULL REFERENCES public.practitioner_notices(id) ON DELETE RESTRICT,
  rebuttal          text NOT NULL CHECK (length(rebuttal) <= 2000),
  supporting_links  text[],
  claim_type        text NOT NULL CHECK (claim_type IN ('dispute_attribution','dispute_interpretation','already_remediated','other')),
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  submitted_by      uuid NOT NULL REFERENCES auth.users(id),
  resolved_at       timestamptz,
  resolved_by       uuid REFERENCES auth.users(id),
  resolution        text CHECK (resolution IN ('upheld','reversed','partially_reversed','withdrawn')),
  resolution_note   text
);
CREATE INDEX IF NOT EXISTS idx_appeals_notice ON public.practitioner_notice_appeals(notice_id);
CREATE INDEX IF NOT EXISTS idx_appeals_open ON public.practitioner_notice_appeals(submitted_at DESC) WHERE resolved_at IS NULL;

-- ── 9. practitioner_strikes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.practitioner_strikes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  notice_id       uuid NOT NULL REFERENCES public.practitioner_notices(id),
  strike_number   int NOT NULL CHECK (strike_number BETWEEN 1 AND 3),
  applied_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  reversed        boolean NOT NULL DEFAULT false,
  reversed_at     timestamptz,
  reversed_by     uuid REFERENCES auth.users(id),
  notes           text
);
CREATE INDEX IF NOT EXISTS idx_strikes_practitioner_active
  ON public.practitioner_strikes(practitioner_id, expires_at)
  WHERE reversed = false;

-- ── 10. social_review_queue ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.social_review_queue (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id          uuid NOT NULL REFERENCES public.social_signals(id) ON DELETE CASCADE,
  suggested_rule_ids text[] NOT NULL DEFAULT '{}'::text[],
  confidence         numeric(3,2) NOT NULL,
  reason             text NOT NULL CHECK (reason IN (
                       'confidence_mid_band','severity_high_requires_human',
                       'practitioner_match_ambiguous','appeal_reopened',
                       'coordinated_behavior_review')),
  assigned_to        uuid REFERENCES auth.users(id),
  status             text NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','in_review','confirmed','dismissed','escalated')),
  disposition        text,
  disposition_note   text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON public.social_review_queue(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_queue_assigned ON public.social_review_queue(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- ── 11. takedown_requests ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.takedown_requests (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id             uuid REFERENCES public.compliance_findings(id) ON DELETE SET NULL,
  platform               text NOT NULL,
  listing_url            text NOT NULL,
  mechanism              text NOT NULL CHECK (mechanism IN (
                           'amazon_brand_registry','ebay_vero','walmart_seller_protection',
                           'etsy_ip_policy','dmca_takedown','platform_trust_safety','manual_legal')),
  status                 text NOT NULL DEFAULT 'drafted'
                           CHECK (status IN ('drafted','submitted','acknowledged','takedown_complete','denied','withdrawn')),
  draft_body             text,
  submitted_at           timestamptz,
  submitted_by           uuid REFERENCES auth.users(id),
  response_received_at   timestamptz,
  response_note          text,
  takedown_effective_at  timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_takedowns_status ON public.takedown_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_takedowns_finding ON public.takedown_requests(finding_id) WHERE finding_id IS NOT NULL;

-- ── 12. hounddog_collector_state ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hounddog_collector_state (
  id                      text PRIMARY KEY,
  enabled                 boolean NOT NULL DEFAULT false,
  last_tick_at            timestamptz,
  last_cursor             text,
  rate_limit_requests     int NOT NULL DEFAULT 60,
  rate_limit_per_seconds  int NOT NULL DEFAULT 60,
  tos_version_pinned      text,
  provider_kind           text NOT NULL DEFAULT 'official_api'
                            CHECK (provider_kind IN ('official_api','licensed_listening_provider')),
  notes                   text,
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.practitioner_social_handles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_signals                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_signals_below_threshold    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_signals_unmatched          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidence               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidence_artifacts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_notices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_notice_appeals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_strikes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_review_queue               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takedown_requests                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hounddog_collector_state          ENABLE ROW LEVEL SECURITY;

-- Helper: is the current auth.uid() a practitioner that owns this row?
-- Uses the practitioners(id, user_id) table from prior migrations.
CREATE OR REPLACE FUNCTION public.is_practitioner_self(p_practitioner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.practitioners p
    WHERE p.id = p_practitioner_id AND p.user_id = auth.uid()
  );
$$;

-- practitioner_social_handles: self-read + self-insert; compliance reads all.
DROP POLICY IF EXISTS psh_self_read       ON public.practitioner_social_handles;
DROP POLICY IF EXISTS psh_self_insert     ON public.practitioner_social_handles;
DROP POLICY IF EXISTS psh_self_update     ON public.practitioner_social_handles;
DROP POLICY IF EXISTS psh_compliance_all  ON public.practitioner_social_handles;
CREATE POLICY psh_self_read ON public.practitioner_social_handles
  FOR SELECT TO authenticated
  USING (public.is_practitioner_self(practitioner_id) OR public.is_compliance_reader());
CREATE POLICY psh_self_insert ON public.practitioner_social_handles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_practitioner_self(practitioner_id));
CREATE POLICY psh_self_update ON public.practitioner_social_handles
  FOR UPDATE TO authenticated
  USING (public.is_practitioner_self(practitioner_id) OR public.is_compliance_reader())
  WITH CHECK (public.is_practitioner_self(practitioner_id) OR public.is_compliance_reader());

-- social_signals + below_threshold + unmatched: compliance-only.
DROP POLICY IF EXISTS ss_compliance_read ON public.social_signals;
CREATE POLICY ss_compliance_read ON public.social_signals
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS ssbt_compliance_read ON public.social_signals_below_threshold;
CREATE POLICY ssbt_compliance_read ON public.social_signals_below_threshold
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

DROP POLICY IF EXISTS ssu_compliance_read ON public.social_signals_unmatched;
CREATE POLICY ssu_compliance_read ON public.social_signals_unmatched
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

-- Evidence + artifacts: immutable read-only for compliance readers.
DROP POLICY IF EXISTS ce_compliance_read  ON public.compliance_evidence;
DROP POLICY IF EXISTS cea_compliance_read ON public.compliance_evidence_artifacts;
CREATE POLICY ce_compliance_read ON public.compliance_evidence
  FOR SELECT TO authenticated USING (public.is_compliance_reader());
CREATE POLICY cea_compliance_read ON public.compliance_evidence_artifacts
  FOR SELECT TO authenticated USING (public.is_compliance_reader());
-- No UPDATE / DELETE policies: service role writes only.

-- practitioner_notices: self-read + compliance; status transitions via RPC/server.
DROP POLICY IF EXISTS pn_self_read       ON public.practitioner_notices;
DROP POLICY IF EXISTS pn_compliance_all  ON public.practitioner_notices;
CREATE POLICY pn_self_read ON public.practitioner_notices
  FOR SELECT TO authenticated
  USING (public.is_practitioner_self(practitioner_id) OR public.is_compliance_reader());
CREATE POLICY pn_compliance_all ON public.practitioner_notices
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- practitioner_notice_appeals: practitioner inserts their own; compliance reads.
DROP POLICY IF EXISTS pna_self_insert ON public.practitioner_notice_appeals;
DROP POLICY IF EXISTS pna_self_read   ON public.practitioner_notice_appeals;
DROP POLICY IF EXISTS pna_compliance_update ON public.practitioner_notice_appeals;
CREATE POLICY pna_self_insert ON public.practitioner_notice_appeals
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.practitioner_notices pn
      WHERE pn.id = notice_id AND public.is_practitioner_self(pn.practitioner_id)
    )
  );
CREATE POLICY pna_self_read ON public.practitioner_notice_appeals
  FOR SELECT TO authenticated
  USING (
    submitted_by = auth.uid()
    OR public.is_compliance_reader()
    OR EXISTS (
      SELECT 1 FROM public.practitioner_notices pn
      WHERE pn.id = notice_id AND public.is_practitioner_self(pn.practitioner_id)
    )
  );
CREATE POLICY pna_compliance_update ON public.practitioner_notice_appeals
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- practitioner_strikes: self-read + compliance all.
DROP POLICY IF EXISTS ps_self_read ON public.practitioner_strikes;
DROP POLICY IF EXISTS ps_compliance_update ON public.practitioner_strikes;
CREATE POLICY ps_self_read ON public.practitioner_strikes
  FOR SELECT TO authenticated
  USING (public.is_practitioner_self(practitioner_id) OR public.is_compliance_reader());
CREATE POLICY ps_compliance_update ON public.practitioner_strikes
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- social_review_queue: compliance only.
DROP POLICY IF EXISTS srq_all ON public.social_review_queue;
CREATE POLICY srq_all ON public.social_review_queue
  FOR ALL TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- takedown_requests: compliance only.
DROP POLICY IF EXISTS tr_all ON public.takedown_requests;
CREATE POLICY tr_all ON public.takedown_requests
  FOR ALL TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- hounddog_collector_state: compliance read, service role writes.
DROP POLICY IF EXISTS hcs_read ON public.hounddog_collector_state;
DROP POLICY IF EXISTS hcs_update ON public.hounddog_collector_state;
CREATE POLICY hcs_read ON public.hounddog_collector_state
  FOR SELECT TO authenticated USING (public.is_compliance_reader());
CREATE POLICY hcs_update ON public.hounddog_collector_state
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- ── Touch trigger for updated_at on notices + review_queue + collector_state ─
DROP TRIGGER IF EXISTS pn_touch ON public.practitioner_notices;
CREATE TRIGGER pn_touch BEFORE UPDATE ON public.practitioner_notices
  FOR EACH ROW EXECUTE FUNCTION public.compliance_touch_updated_at();

DROP TRIGGER IF EXISTS srq_touch ON public.social_review_queue;
CREATE TRIGGER srq_touch BEFORE UPDATE ON public.social_review_queue
  FOR EACH ROW EXECUTE FUNCTION public.compliance_touch_updated_at();

DROP TRIGGER IF EXISTS hcs_touch ON public.hounddog_collector_state;
CREATE TRIGGER hcs_touch BEFORE UPDATE ON public.hounddog_collector_state
  FOR EACH ROW EXECUTE FUNCTION public.compliance_touch_updated_at();

-- ── Seed collector_state rows (all disabled until deps + API keys land) ─────
INSERT INTO public.hounddog_collector_state (id, enabled, provider_kind, tos_version_pinned, notes) VALUES
  ('instagram',  false, 'official_api',                  NULL, 'Meta Graph API; awaiting SDK approval'),
  ('tiktok',     false, 'official_api',                  NULL, 'TikTok Research API; awaiting eligibility + SDK'),
  ('youtube',    false, 'official_api',                  NULL, 'YouTube Data API v3; awaiting googleapis dep'),
  ('x',          false, 'official_api',                  NULL, 'X API v2 enterprise; awaiting twitter-api-v2 dep'),
  ('linkedin',   false, 'official_api',                  NULL, 'LinkedIn Marketing Dev; awaiting SDK'),
  ('facebook',   false, 'official_api',                  NULL, 'Meta Graph API (shared w/ instagram)'),
  ('podcast',    false, 'licensed_listening_provider',   NULL, 'Listen Notes + Deepgram ASR; awaiting SDKs'),
  ('substack',   false, 'official_api',                  NULL, 'RSS + inbound webhook; no dep needed, awaiting wire-up'),
  ('web',        false, 'licensed_listening_provider',   NULL, 'SerpAPI or Bright Data compliant tier; awaiting SDK'),
  ('amazon',     false, 'official_api',                  NULL, 'Selling Partner API (Brand Registry); awaiting SDK'),
  ('ebay',       false, 'official_api',                  NULL, 'eBay Finding API; awaiting SDK'),
  ('walmart',    false, 'official_api',                  NULL, 'Walmart Marketplace API; awaiting SDK'),
  ('etsy',       false, 'official_api',                  NULL, 'Etsy Open API v3; awaiting SDK'),
  ('reddit',     false, 'official_api',                  NULL, 'Reddit API (OAuth); awaiting dep')
ON CONFLICT (id) DO NOTHING;
