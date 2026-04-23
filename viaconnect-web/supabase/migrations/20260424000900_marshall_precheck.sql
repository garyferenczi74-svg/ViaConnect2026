-- =============================================================================
-- Prompt #121: Marshall Pre-Check (APPEND-ONLY, IDEMPOTENT)
-- =============================================================================
-- Proactive, practitioner-initiated compliance scan. Draft text is NEVER
-- persisted in plaintext; the row stores only the SHA-256 hash and derived
-- rule-level findings. Clearance receipts are signed ES256 JWTs.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. precheck_sessions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.precheck_sessions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                text NOT NULL UNIQUE,
  practitioner_id           uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  source                    text NOT NULL CHECK (source IN ('portal','extension','mobile_app','scheduler_webhook')),
  draft_hash_sha256         text NOT NULL,
  normalization_version     text NOT NULL,
  rule_registry_version     text NOT NULL,
  status                    text NOT NULL DEFAULT 'initiated'
                              CHECK (status IN (
                                'initiated','normalizing','evaluating','findings_presented',
                                'remediation','final_evaluation','cleared','not_cleared','closed','errored')),
  recursion_count           int NOT NULL DEFAULT 0 CHECK (recursion_count BETWEEN 0 AND 2),
  final_findings_summary    jsonb,
  target_platform           text,
  cleared_at                timestamptz,
  closed_at                 timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_precheck_sessions_practitioner ON public.precheck_sessions(practitioner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_precheck_sessions_status_created ON public.precheck_sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_precheck_sessions_hash ON public.precheck_sessions(draft_hash_sha256);

-- ── 2. precheck_findings (rule-level; NO excerpts) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.precheck_findings (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                    uuid NOT NULL REFERENCES public.precheck_sessions(id) ON DELETE CASCADE,
  rule_id                       text NOT NULL REFERENCES public.compliance_rules(id),
  severity                      text NOT NULL CHECK (severity IN ('P0','P1','P2','P3','ADVISORY')),
  confidence                    numeric(3,2) NOT NULL,
  remediation_kind              text NOT NULL CHECK (remediation_kind IN (
                                  'auto_applied','user_accepted','user_dismissed','user_disputed','unremediable','pending')),
  remediation_suggestion_hash   text,
  round                         int NOT NULL DEFAULT 1,
  created_at                    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_precheck_findings_session ON public.precheck_findings(session_id);
CREATE INDEX IF NOT EXISTS idx_precheck_findings_rule ON public.precheck_findings(rule_id);

-- ── 3. precheck_clearance_receipts ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.precheck_clearance_receipts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id         text NOT NULL UNIQUE,
  session_id         uuid NOT NULL REFERENCES public.precheck_sessions(id) ON DELETE RESTRICT,
  practitioner_id    uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  draft_hash_sha256  text NOT NULL,
  jwt_compact        text NOT NULL,
  signing_key_id     text NOT NULL,
  issued_at          timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL,
  revoked            boolean NOT NULL DEFAULT false,
  revoked_at         timestamptz,
  revoked_by         uuid REFERENCES auth.users(id),
  revoked_reason     text
);
CREATE INDEX IF NOT EXISTS idx_clearance_practitioner_hash ON public.precheck_clearance_receipts(practitioner_id, draft_hash_sha256);
CREATE INDEX IF NOT EXISTS idx_clearance_expires ON public.precheck_clearance_receipts(expires_at);
CREATE INDEX IF NOT EXISTS idx_clearance_session ON public.precheck_clearance_receipts(session_id);

-- ── 4. precheck_good_faith_events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.precheck_good_faith_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id          uuid NOT NULL REFERENCES public.compliance_findings(id) ON DELETE CASCADE,
  receipt_id          uuid REFERENCES public.precheck_clearance_receipts(id) ON DELETE SET NULL,
  practitioner_id     uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  match_kind          text NOT NULL CHECK (match_kind IN ('exact_hash','high_similarity','no_receipt')),
  jaccard_similarity  numeric(3,2),
  outcome             text NOT NULL CHECK (outcome IN ('good_faith_credit','bad_faith_penalty','no_adjustment')),
  severity_before     text,
  severity_after      text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_good_faith_practitioner ON public.precheck_good_faith_events(practitioner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_good_faith_finding ON public.precheck_good_faith_events(finding_id);

-- ── 5. precheck_signing_keys ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.precheck_signing_keys (
  id                text PRIMARY KEY,
  alg               text NOT NULL DEFAULT 'ES256',
  public_key_pem    text NOT NULL,
  public_key_jwk    jsonb NOT NULL,
  private_key_ref   text NOT NULL,
  active            boolean NOT NULL DEFAULT true,
  rotation_of       text REFERENCES public.precheck_signing_keys(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  retired_at        timestamptz
);
CREATE INDEX IF NOT EXISTS idx_signing_keys_active ON public.precheck_signing_keys(active) WHERE active = true;

-- ── 6. precheck_extension_grants ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.precheck_extension_grants (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id   uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  client_id         text NOT NULL,
  user_agent        text,
  installed_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at      timestamptz,
  revoked           boolean NOT NULL DEFAULT false,
  revoked_at        timestamptz
);
CREATE INDEX IF NOT EXISTS idx_extension_grants_practitioner ON public.precheck_extension_grants(practitioner_id, revoked);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.precheck_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precheck_findings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precheck_clearance_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precheck_good_faith_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precheck_signing_keys       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precheck_extension_grants   ENABLE ROW LEVEL SECURITY;

-- precheck_sessions: practitioner self + compliance readers
DROP POLICY IF EXISTS pcs_self_read ON public.precheck_sessions;
CREATE POLICY pcs_self_read ON public.precheck_sessions
  FOR SELECT TO authenticated
  USING (public.is_practitioner_self(practitioner_id) OR public.is_compliance_reader());

-- precheck_findings: via session's practitioner
DROP POLICY IF EXISTS pcf_self_read ON public.precheck_findings;
CREATE POLICY pcf_self_read ON public.precheck_findings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.precheck_sessions s
      WHERE s.id = precheck_findings.session_id
        AND (public.is_practitioner_self(s.practitioner_id) OR public.is_compliance_reader())
    )
  );

-- precheck_clearance_receipts: practitioner self + compliance readers
DROP POLICY IF EXISTS pcr_self_read ON public.precheck_clearance_receipts;
CREATE POLICY pcr_self_read ON public.precheck_clearance_receipts
  FOR SELECT TO authenticated
  USING (public.is_practitioner_self(practitioner_id) OR public.is_compliance_reader());

-- precheck_good_faith_events: practitioner self + compliance readers
DROP POLICY IF EXISTS pcgfe_read ON public.precheck_good_faith_events;
CREATE POLICY pcgfe_read ON public.precheck_good_faith_events
  FOR SELECT TO authenticated
  USING (public.is_practitioner_self(practitioner_id) OR public.is_compliance_reader());

-- precheck_signing_keys: compliance readers can read public metadata
DROP POLICY IF EXISTS psk_read ON public.precheck_signing_keys;
CREATE POLICY psk_read ON public.precheck_signing_keys
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

-- precheck_extension_grants: self manage
DROP POLICY IF EXISTS peg_self_all ON public.precheck_extension_grants;
CREATE POLICY peg_self_all ON public.precheck_extension_grants
  FOR ALL TO authenticated
  USING (public.is_practitioner_self(practitioner_id) OR public.is_compliance_reader())
  WITH CHECK (public.is_practitioner_self(practitioner_id));

-- ── Updated-at triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS pcs_touch ON public.precheck_sessions;
CREATE TRIGGER pcs_touch BEFORE UPDATE ON public.precheck_sessions
  FOR EACH ROW EXECUTE FUNCTION public.compliance_touch_updated_at();

-- ── Seed precheck rules into compliance_rules ───────────────────────────────
INSERT INTO public.compliance_rules (id, pillar, severity, surfaces, citation, description, last_reviewed) VALUES
  ('MARSHALL.PRECHECK.SEMANTIC_DISEASE_IMPLIED', 'CLAIMS', 'P2',
   ARRAY['precheck_draft'], 'Pre-check coaching rule (FDA 21 CFR 101.93 adjacent)',
   'LLM-scored probability that a draft implies a disease claim without naming one.',
   '2026-04-23'),
  ('MARSHALL.PRECHECK.SUPERLATIVE_OVERUSE', 'CLAIMS', 'P3',
   ARRAY['precheck_draft'], 'Pre-check coaching rule; FTC substantiation guidance',
   'Dense use of superlatives without substantiation.',
   '2026-04-23'),
  ('MARSHALL.PRECHECK.AMBIGUOUS_ENDORSEMENT', 'COMMS', 'P2',
   ARRAY['precheck_draft'], '16 CFR Part 255 (FTC Endorsement Guides)',
   'Endorsement phrasing where the material-connection relationship is implied but not clearly stated.',
   '2026-04-23'),
  ('MARSHALL.PRECHECK.AUDIENCE_MISMATCH_RISK', 'PEPTIDE', 'P2',
   ARRAY['precheck_draft'], 'Internal policy 2025-09-01 + COPPA',
   'Peptide content on accounts with under-18-leaning audience analytics.',
   '2026-04-23'),
  ('MARSHALL.PRECHECK.BIO_OPTIMIZATION_COACHING', 'BRAND', 'P3',
   ARRAY['precheck_draft'], 'ViaConnect Standing Rule Section 0.1',
   'Pre-check coaching: older Vitality Score phrasing flagged softly before publication.',
   '2026-04-23'),
  ('MARSHALL.PRECHECK.BIOAVAILABILITY_COACHING', 'BRAND', 'P3',
   ARRAY['precheck_draft'], 'ViaConnect Standing Rule Section 0.2',
   'Pre-check coaching: bioavailability range 10 to 27 times canonical.',
   '2026-04-23'),
  ('MARSHALL.PRECHECK.MISSING_DSHEA_FOOTER', 'CLAIMS', 'P2',
   ARRAY['precheck_draft'], 'DSHEA 1994, 21 USC 343(r)(6)',
   'Draft supplement content missing DSHEA structure/function disclaimer.',
   '2026-04-23'),
  ('MARSHALL.PRECHECK.SHARING_PROTOCOL_REMINDER', 'PEPTIDE', 'ADVISORY',
   ARRAY['precheck_draft'], 'Internal peptide sharing protocol',
   'Reminder: peptide references should include canonical sharing protocol language.',
   '2026-04-23'),
  ('MARSHALL.PRECHECK.CLEARANCE_DRIFT_PATTERN', 'AUDIT', 'P1',
   ARRAY['source_code'], 'Internal compliance trend rule',
   'Aggregator: 3rd bad-faith event within 60 days per practitioner surfaces to Steve Rica.',
   '2026-04-23')
ON CONFLICT (id) DO NOTHING;

-- Extend existing rules to include precheck_draft surface (idempotent).
-- Uses array union to avoid duplicates.
UPDATE public.compliance_rules
SET surfaces = (
  SELECT ARRAY(SELECT DISTINCT unnest(surfaces || ARRAY['precheck_draft']))
)
WHERE id LIKE 'MARSHALL.CLAIMS.%'
   OR id LIKE 'MARSHALL.PEPTIDE.%'
   OR id LIKE 'MARSHALL.BRAND.%'
   OR id LIKE 'MARSHALL.COMMS.%'
   OR id LIKE 'MARSHALL.SOCIAL.%';
