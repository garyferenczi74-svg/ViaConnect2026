-- =============================================================================
-- Prompt #119: Marshall Compliance Officer Agent (APPEND-ONLY, IDEMPOTENT)
-- =============================================================================
-- Schema for the runtime Marshall agent + its dev-side Claude Code sibling.
-- Every table uses CREATE IF NOT EXISTS / CREATE OR REPLACE so replay is safe.
-- =============================================================================

-- Extensions used by Marshall (pgcrypto for hash-chain; pg_trgm reused from prior migration)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── compliance_rules: editable mirror of the policies-as-code registry ──────
CREATE TABLE IF NOT EXISTS public.compliance_rules (
  id                 text PRIMARY KEY,
  pillar             text NOT NULL CHECK (pillar IN (
                       'CLAIMS','PEPTIDE','GENETIC','PRACTITIONER','MAP',
                       'COMMS','PRIVACY','BRAND','AUDIT')),
  severity           text NOT NULL CHECK (severity IN ('P0','P1','P2','P3','ADVISORY')),
  surfaces           text[] NOT NULL,
  citation           text NOT NULL,
  description        text NOT NULL,
  enabled            boolean NOT NULL DEFAULT true,
  threshold_config   jsonb,
  last_reviewed      date NOT NULL,
  reviewed_by        uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_pillar ON public.compliance_rules (pillar, enabled);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_last_reviewed ON public.compliance_rules (last_reviewed);

-- ── compliance_findings: every finding from both sides ──────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_findings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id        text NOT NULL UNIQUE,
  rule_id           text NOT NULL REFERENCES public.compliance_rules(id),
  severity          text NOT NULL CHECK (severity IN ('P0','P1','P2','P3','ADVISORY')),
  surface           text NOT NULL,
  source            text NOT NULL CHECK (source IN ('claude_code','runtime')),
  location          jsonb NOT NULL DEFAULT '{}'::jsonb,
  excerpt           text NOT NULL,
  message           text NOT NULL,
  citation          text NOT NULL,
  remediation       jsonb NOT NULL DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','acknowledged','remediated','waived','escalated','closed')),
  assigned_to       uuid REFERENCES auth.users(id),
  escalated_to      text[],
  resolution_note   text,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_findings_rule ON public.compliance_findings (rule_id);
CREATE INDEX IF NOT EXISTS idx_findings_status ON public.compliance_findings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_severity_created ON public.compliance_findings (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_source ON public.compliance_findings (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_findings_assigned ON public.compliance_findings (assigned_to) WHERE assigned_to IS NOT NULL;

-- ── compliance_incidents: aggregated dev/runtime escape timeline ────────────
CREATE TABLE IF NOT EXISTS public.compliance_incidents (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id            text NOT NULL UNIQUE,
  title                  text NOT NULL,
  severity               text NOT NULL CHECK (severity IN ('P0','P1','P2','P3','ADVISORY')),
  opened_by              text NOT NULL CHECK (opened_by IN ('marshall_runtime','marshall_claude_code')),
  opened_at              timestamptz NOT NULL DEFAULT now(),
  closed_at              timestamptz,
  root_cause             text,
  dev_side_escape        boolean NOT NULL DEFAULT false,
  related_finding_ids    uuid[] NOT NULL DEFAULT '{}'::uuid[],
  narrative              text,
  owner                  uuid REFERENCES auth.users(id),
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incidents_opened ON public.compliance_incidents (opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_escape ON public.compliance_incidents (dev_side_escape, opened_at DESC) WHERE dev_side_escape = true;

-- ── compliance_audit_log: hash-chained append-only ledger ────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_audit_log (
  id            bigserial PRIMARY KEY,
  event_type    text NOT NULL,
  actor_type    text NOT NULL CHECK (actor_type IN ('user','system','marshall','claude_code_marshall')),
  actor_id      text,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash     text,
  row_hash      text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON public.compliance_audit_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.compliance_audit_log (actor_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.compliance_compute_row_hash()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  last_hash text;
BEGIN
  SELECT row_hash INTO last_hash FROM public.compliance_audit_log ORDER BY id DESC LIMIT 1;
  NEW.prev_hash := COALESCE(last_hash, '');
  NEW.row_hash := encode(
    digest(
      COALESCE(NEW.prev_hash,'') ||
      NEW.event_type || NEW.actor_type || COALESCE(NEW.actor_id,'') ||
      NEW.payload::text || NEW.created_at::text,
      'sha256'
    ),
    'hex'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS compliance_audit_chain ON public.compliance_audit_log;
CREATE TRIGGER compliance_audit_chain
  BEFORE INSERT ON public.compliance_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.compliance_compute_row_hash();

-- ── compliance_waivers: time-boxed rule exemptions ──────────────────────────
-- NOTE: distinct from map_waivers (pricing concern) by design; Marshall waivers
-- apply to the rule engine itself.
CREATE TABLE IF NOT EXISTS public.compliance_waivers (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id            text NOT NULL REFERENCES public.compliance_rules(id),
  scope              jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason             text NOT NULL,
  approved_by        uuid NOT NULL REFERENCES auth.users(id),
  effective_from     timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz,
  revoked            boolean NOT NULL DEFAULT false,
  revoked_at         timestamptz,
  revoked_by         uuid REFERENCES auth.users(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_waivers_rule ON public.compliance_waivers (rule_id, revoked);
CREATE INDEX IF NOT EXISTS idx_waivers_expires ON public.compliance_waivers (expires_at) WHERE expires_at IS NOT NULL;

-- ── vendor_baas: HIPAA business associate agreement registry ────────────────
CREATE TABLE IF NOT EXISTS public.vendor_baas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name        text NOT NULL UNIQUE,
  scope              text NOT NULL,
  baa_signed_on      date NOT NULL,
  baa_expires_on     date,
  document_url       text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_baas_expires ON public.vendor_baas (baa_expires_on) WHERE baa_expires_on IS NOT NULL;

-- ── consent_ledger: version-pinned consent records (genetic, marketing, SMS) ─
CREATE TABLE IF NOT EXISTS public.consent_ledger (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type       text NOT NULL,
  version            text NOT NULL,
  granted            boolean NOT NULL,
  granted_at         timestamptz NOT NULL DEFAULT now(),
  revoked_at         timestamptz,
  ip_address         inet,
  user_agent         text,
  evidence           jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_user_type ON public.consent_ledger (user_id, consent_type, granted_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_type_version ON public.consent_ledger (consent_type, version);

-- ── dsar_requests: CCPA / GDPR / state-law data subject access requests ─────
CREATE TABLE IF NOT EXISTS public.dsar_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES auth.users(id),
  email              text NOT NULL,
  request_type       text NOT NULL CHECK (request_type IN ('access','delete','port','correct','opt_out')),
  jurisdiction       text NOT NULL,
  opened_at          timestamptz NOT NULL DEFAULT now(),
  sla_due_at         timestamptz NOT NULL,
  completed_at       timestamptz,
  status             text NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','in_progress','completed','rejected','expired')),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dsar_status_sla ON public.dsar_requests (status, sla_due_at);
CREATE INDEX IF NOT EXISTS idx_dsar_user ON public.dsar_requests (user_id) WHERE user_id IS NOT NULL;

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.compliance_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_findings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_incidents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_waivers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_baas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_ledger         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsar_requests          ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a compliance-cleared role?
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

-- compliance_rules: compliance readers can read; only compliance_officer/admin can update
DROP POLICY IF EXISTS cr_read ON public.compliance_rules;
DROP POLICY IF EXISTS cr_update ON public.compliance_rules;
CREATE POLICY cr_read ON public.compliance_rules
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());
CREATE POLICY cr_update ON public.compliance_rules
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- compliance_findings: compliance readers + assignees can read; writes via service role only
DROP POLICY IF EXISTS cf_read ON public.compliance_findings;
DROP POLICY IF EXISTS cf_update ON public.compliance_findings;
CREATE POLICY cf_read ON public.compliance_findings
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader() OR assigned_to = auth.uid());
CREATE POLICY cf_update ON public.compliance_findings
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- compliance_incidents: same pattern
DROP POLICY IF EXISTS ci_read ON public.compliance_incidents;
DROP POLICY IF EXISTS ci_update ON public.compliance_incidents;
CREATE POLICY ci_read ON public.compliance_incidents
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());
CREATE POLICY ci_update ON public.compliance_incidents
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- compliance_audit_log: compliance readers can SELECT; no one can UPDATE/DELETE (immutable)
DROP POLICY IF EXISTS cal_read ON public.compliance_audit_log;
CREATE POLICY cal_read ON public.compliance_audit_log
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());
-- No UPDATE / DELETE policies. With RLS enabled and no policy, those operations fail for
-- non-service-role callers. Service role bypasses RLS (only the AuditLogger should use it).

-- compliance_waivers: compliance readers can read; inserts/updates by approver with check
DROP POLICY IF EXISTS cw_read ON public.compliance_waivers;
DROP POLICY IF EXISTS cw_insert ON public.compliance_waivers;
DROP POLICY IF EXISTS cw_update ON public.compliance_waivers;
CREATE POLICY cw_read ON public.compliance_waivers
  FOR SELECT TO authenticated USING (public.is_compliance_reader());
CREATE POLICY cw_insert ON public.compliance_waivers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_compliance_reader() AND approved_by = auth.uid());
CREATE POLICY cw_update ON public.compliance_waivers
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- vendor_baas: compliance readers
DROP POLICY IF EXISTS vb_read ON public.vendor_baas;
CREATE POLICY vb_read ON public.vendor_baas
  FOR SELECT TO authenticated USING (public.is_compliance_reader());

-- consent_ledger: user reads/writes own; compliance reads all
DROP POLICY IF EXISTS cl_self_read ON public.consent_ledger;
DROP POLICY IF EXISTS cl_self_insert ON public.consent_ledger;
DROP POLICY IF EXISTS cl_self_update ON public.consent_ledger;
CREATE POLICY cl_self_read ON public.consent_ledger
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_compliance_reader());
CREATE POLICY cl_self_insert ON public.consent_ledger
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY cl_self_update ON public.consent_ledger
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- dsar_requests: user reads own; compliance reads all; unauthenticated submission via edge function
DROP POLICY IF EXISTS dsar_self_read ON public.dsar_requests;
DROP POLICY IF EXISTS dsar_update ON public.dsar_requests;
CREATE POLICY dsar_self_read ON public.dsar_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_compliance_reader());
CREATE POLICY dsar_update ON public.dsar_requests
  FOR UPDATE TO authenticated
  USING (public.is_compliance_reader())
  WITH CHECK (public.is_compliance_reader());

-- ── Chain-verification RPC (read-only; safe for any compliance reader) ──────
CREATE OR REPLACE FUNCTION public.compliance_verify_audit_chain(p_limit integer DEFAULT 10000)
RETURNS TABLE(ok boolean, first_bad_row bigint, checked_rows bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r RECORD;
  prev_row_hash text := '';
  expected_hash text;
  first_bad bigint := NULL;
  checked bigint := 0;
BEGIN
  IF NOT public.is_compliance_reader() THEN
    RAISE EXCEPTION 'insufficient role for audit chain verification';
  END IF;

  FOR r IN
    SELECT id, event_type, actor_type, actor_id, payload, prev_hash, row_hash, created_at
    FROM public.compliance_audit_log
    ORDER BY id ASC
    LIMIT p_limit
  LOOP
    expected_hash := encode(
      digest(
        COALESCE(prev_row_hash,'') ||
        r.event_type || r.actor_type || COALESCE(r.actor_id,'') ||
        r.payload::text || r.created_at::text,
        'sha256'
      ),
      'hex'
    );
    IF r.row_hash <> expected_hash OR COALESCE(r.prev_hash,'') <> COALESCE(prev_row_hash,'') THEN
      first_bad := r.id;
      EXIT;
    END IF;
    prev_row_hash := r.row_hash;
    checked := checked + 1;
  END LOOP;

  ok := first_bad IS NULL;
  first_bad_row := first_bad;
  checked_rows := checked;
  RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.compliance_verify_audit_chain(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compliance_verify_audit_chain(integer) TO authenticated, service_role;

-- ── Seed minimal rule registry so RLS policies don't orphan at first run ────
INSERT INTO public.compliance_rules (id, pillar, severity, surfaces, citation, description, last_reviewed) VALUES
  ('MARSHALL.PEPTIDE.NO_SEMAGLUTIDE', 'PEPTIDE', 'P0',
   ARRAY['source_code','product_db','content_cms','user_content','ai_output','email','sms','marketing_page'],
   'ViaConnect Standing Rule §0.3',
   'The compound Semaglutide is prohibited platform-wide.',
   '2026-04-23'),
  ('MARSHALL.PEPTIDE.RETATRUTIDE_INJECTABLE_ONLY', 'PEPTIDE', 'P0',
   ARRAY['source_code','product_db','content_cms','checkout'],
   'ViaConnect Standing Rule §0.3; internal compliance memo 2026-02-11',
   'Retatrutide is injectable only; no liposomal, micellar, or nasal forms permitted.',
   '2026-04-23'),
  ('MARSHALL.PEPTIDE.NO_RETATRUTIDE_STACKING', 'PEPTIDE', 'P0',
   ARRAY['checkout','ai_output'],
   'ViaConnect Standing Rule §0.3; clinical protocol memo',
   'Retatrutide must be prescribed as monotherapy; cannot ship with other peptides.',
   '2026-04-23'),
  ('MARSHALL.PEPTIDE.PEPTIDE_AGE_GATE', 'PEPTIDE', 'P0',
   ARRAY['checkout'],
   'Internal policy 2025-09-01',
   'Peptide purchases require age verification; minimum 18 (21+ for cognitive stimulants).',
   '2026-04-23'),
  ('MARSHALL.BRAND.BIO_OPTIMIZATION_NAMING', 'BRAND', 'P0',
   ARRAY['source_code','content_cms','ai_output','marketing_page'],
   'ViaConnect Standing Rule §0.1',
   'Score name is exactly Bio Optimization; Vitality Score / Vitality Index / Wellness Score are forbidden.',
   '2026-04-23'),
  ('MARSHALL.BRAND.BIOAVAILABILITY_RANGE', 'BRAND', 'P0',
   ARRAY['source_code','content_cms','ai_output','marketing_page','email','sms'],
   'ViaConnect Standing Rule §0.2',
   'Bioavailability range is exactly 10-27 times; no other range permitted.',
   '2026-04-23'),
  ('MARSHALL.BRAND.HELIX_CONSUMER_ONLY', 'BRAND', 'P1',
   ARRAY['source_code','ai_output'],
   'ViaConnect Standing Rule §0.6',
   'Helix Rewards point balances and tier names are consumer-only; practitioners see aggregate engagement only.',
   '2026-04-23'),
  ('MARSHALL.BRAND.LUCIDE_ONLY_ICONS', 'BRAND', 'P2',
   ARRAY['source_code'],
   'ViaConnect Standing Rule §0.4',
   'Only Lucide React icons; no emojis in client-facing UI.',
   '2026-04-23'),
  ('MARSHALL.BRAND.ICON_STROKE_WIDTH', 'BRAND', 'P3',
   ARRAY['source_code'],
   'ViaConnect Standing Rule §0.4',
   'Lucide icons must have strokeWidth={1.5}.',
   '2026-04-23'),
  ('MARSHALL.BRAND.GETDISPLAYNAME_REQUIRED', 'BRAND', 'P2',
   ARRAY['source_code'],
   'ViaConnect Standing Rule §0.5',
   'Client-facing names must pass through getDisplayName().',
   '2026-04-23'),
  ('MARSHALL.CLAIMS.DISEASE_CLAIM', 'CLAIMS', 'P1',
   ARRAY['content_cms','user_content','ai_output','marketing_page','email'],
   '21 CFR 101.93; FTC Endorsement Guides 16 CFR 255',
   'Structure/function only; no disease claims (cures, treats, prevents, heals, reverses).',
   '2026-04-23'),
  ('MARSHALL.CLAIMS.DSHEA_DISCLAIMER_MISSING', 'CLAIMS', 'P2',
   ARRAY['content_cms','marketing_page'],
   'DSHEA 1994, 21 USC 343(r)(6)',
   'Every supplement product page must include the DSHEA structure/function disclaimer.',
   '2026-04-23'),
  ('MARSHALL.CLAIMS.UNSUBSTANTIATED_EFFICACY', 'CLAIMS', 'P1',
   ARRAY['content_cms','ai_output','marketing_page'],
   'FTC Act §5; Guides Concerning Endorsements',
   'Numeric efficacy claims must link to a research citation.',
   '2026-04-23'),
  ('MARSHALL.CLAIMS.TESTIMONIAL_DISCLOSURE', 'CLAIMS', 'P2',
   ARRAY['content_cms','marketing_page'],
   'FTC Endorsement Guides 2023 rev.',
   'Testimonials with material connection require disclosure.',
   '2026-04-23'),
  ('MARSHALL.GENETIC.GENEX360_CONSENT', 'GENETIC', 'P0',
   ARRAY['content_cms','ai_output'],
   'HIPAA 45 CFR 164.506; GINA',
   'Genetic reports require version-pinned consent record.',
   '2026-04-23'),
  ('MARSHALL.GENETIC.BAA_REQUIRED_VENDORS', 'GENETIC', 'P0',
   ARRAY['source_code'],
   'HIPAA 45 CFR 164.308(b)',
   'Every vendor receiving PHI must have a current BAA on file.',
   '2026-04-23'),
  ('MARSHALL.GENETIC.MINOR_GENETIC_LOCK', 'GENETIC', 'P0',
   ARRAY['checkout','content_cms'],
   'GINA; COPPA 16 CFR 312',
   'Genetic sampling blocked for users under 18.',
   '2026-04-23'),
  ('MARSHALL.PRACTITIONER.NPI_VERIFIED', 'PRACTITIONER', 'P1',
   ARRAY['source_code','product_db'],
   'CMS NPPES; state boards',
   'Every practitioner must resolve to a valid NPI.',
   '2026-04-23'),
  ('MARSHALL.PRACTITIONER.LICENSE_STATE_MATCH', 'PRACTITIONER', 'P0',
   ARRAY['source_code','product_db'],
   'State licensure boards',
   'Practitioner may only treat patients in licensed states.',
   '2026-04-23'),
  ('MARSHALL.PRACTITIONER.SCOPE_OF_PRACTICE', 'PRACTITIONER', 'P0',
   ARRAY['source_code','ai_output'],
   'State scope of practice statutes',
   'Practitioner actions gated by role + state.',
   '2026-04-23'),
  ('MARSHALL.MAP.VIOLATION_DETECTED', 'MAP', 'P1',
   ARRAY['product_db','user_content'],
   'FarmCeutica MAP policy v3',
   'MAP pricing violation detected; escalate per policy.',
   '2026-04-23'),
  ('MARSHALL.COMMS.CAN_SPAM_UNSUB', 'COMMS', 'P0',
   ARRAY['email'],
   'CAN-SPAM Act 15 USC 7701',
   'Every marketing email must include one-click unsubscribe and physical address.',
   '2026-04-23'),
  ('MARSHALL.COMMS.TCPA_SMS_CONSENT', 'COMMS', 'P0',
   ARRAY['sms'],
   'TCPA 47 USC 227',
   'No SMS without explicit opt-in record.',
   '2026-04-23'),
  ('MARSHALL.PRIVACY.DSAR_SLA', 'PRIVACY', 'P1',
   ARRAY['source_code'],
   'CCPA 1798.130; GDPR Art. 12',
   'DSAR response within 45 days (CCPA) or 30 days (GDPR).',
   '2026-04-23'),
  ('MARSHALL.PRIVACY.COOKIE_CONSENT_JURISDICTIONAL', 'PRIVACY', 'P2',
   ARRAY['marketing_page'],
   'GDPR; CCPA; Quebec Law 25',
   'Cookie banner must match user jurisdiction.',
   '2026-04-23'),
  ('MARSHALL.AUDIT.AUDIT_LOG_IMMUTABILITY', 'AUDIT', 'P0',
   ARRAY['source_code'],
   'SOC 2 CC7.2; HIPAA 45 CFR 164.312(b)',
   'compliance_audit_log is append-only and hash-chained.',
   '2026-04-23'),
  ('MARSHALL.AUDIT.RETENTION_SCHEDULE', 'AUDIT', 'P2',
   ARRAY['source_code'],
   'HIPAA retention; state laws',
   'Health records 7 years; marketing 3 years; security logs 1 year.',
   '2026-04-23')
ON CONFLICT (id) DO NOTHING;

-- ── Seed baseline BAAs so Pillar 3 rule has a truthy dataset on first boot ──
INSERT INTO public.vendor_baas (vendor_name, scope, baa_signed_on, baa_expires_on) VALUES
  ('Supabase',  'Database, auth, storage, edge functions',        '2025-11-01', '2026-11-01'),
  ('Vercel',    'Application hosting, edge middleware',           '2025-11-01', '2026-11-01'),
  ('Resend',    'Transactional email',                            '2025-12-15', '2026-12-15'),
  ('Twilio',    'SMS',                                             '2025-12-15', '2026-12-15'),
  ('Tavus',     'AI video generation',                            '2026-01-15', '2027-01-15'),
  ('HeyGen',    'AI avatar generation',                           '2026-01-15', '2027-01-15'),
  ('Anthropic', 'Claude API for advisor and agent outputs',       '2026-02-01', '2027-02-01')
ON CONFLICT (vendor_name) DO NOTHING;

-- ── Touch trigger for updated_at on rules + baas ────────────────────────────
CREATE OR REPLACE FUNCTION public.compliance_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS cr_touch ON public.compliance_rules;
CREATE TRIGGER cr_touch BEFORE UPDATE ON public.compliance_rules
  FOR EACH ROW EXECUTE FUNCTION public.compliance_touch_updated_at();

DROP TRIGGER IF EXISTS vb_touch ON public.vendor_baas;
CREATE TRIGGER vb_touch BEFORE UPDATE ON public.vendor_baas
  FOR EACH ROW EXECUTE FUNCTION public.compliance_touch_updated_at();
