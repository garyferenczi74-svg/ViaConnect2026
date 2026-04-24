-- =============================================================================
-- Prompt #124 P1: Marshall Vision — counterfeit-detection schema
-- =============================================================================
-- Nine new tables backing the detection pipeline:
--   1. counterfeit_reference_corpus    authentic FarmCeutica packaging artifacts
--   2. counterfeit_exemplars           curated known-counterfeit reference library
--   3. counterfeit_evaluations         every image evaluation run
--   4. counterfeit_determinations      deterministic verdict from rule table
--   5. counterfeit_dispositions        Steve Rica's disposition on each determination
--   6. consumer_counterfeit_reports    consumer-submitted suspect reports
--   7. counterfeit_test_buys           test-buy program tracking
--   8. takedown_templates              per-platform takedown template library
--   9. marshall_vision_config          kill-switch + per-source + per-platform toggles
--
-- Plus ALTER TABLE on existing takedown_requests to link vision/test-buy/template.
--
-- Append-only, idempotent. RLS on every table. Reuses is_compliance_reader()
-- helper from #119. CedarGrowth / Via Cura intentionally absent per the
-- Amendment to #119/#120.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. counterfeit_reference_corpus
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.counterfeit_reference_corpus (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             text NOT NULL,
  artifact_kind   text NOT NULL CHECK (artifact_kind IN (
                    'studio_front','studio_back','studio_left','studio_right',
                    'studio_top','studio_bottom',
                    'label_front','label_back','batch_template','hologram',
                    'box_face','blister_pack','insert','reseller_mark','qr_code_sample'
                  )),
  version         text NOT NULL,
  storage_key     text NOT NULL,
  sha256          text NOT NULL,
  perceptual_hash text NOT NULL,
  approved        boolean NOT NULL DEFAULT false,
  approved_by     uuid REFERENCES auth.users(id),
  approved_at     timestamptz,
  retired         boolean NOT NULL DEFAULT false,
  retired_at      timestamptz,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sku, artifact_kind, version)
);

CREATE INDEX IF NOT EXISTS idx_corpus_sku
  ON public.counterfeit_reference_corpus (sku);
CREATE INDEX IF NOT EXISTS idx_corpus_phash
  ON public.counterfeit_reference_corpus (perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_corpus_approved
  ON public.counterfeit_reference_corpus (approved) WHERE retired = false;
CREATE INDEX IF NOT EXISTS idx_corpus_approved_by
  ON public.counterfeit_reference_corpus (approved_by);

COMMENT ON TABLE public.counterfeit_reference_corpus IS
  'Prompt #124 P1: authentic FarmCeutica packaging artifacts. Steve approves before use in live evaluations.';

-- ---------------------------------------------------------------------------
-- 2. counterfeit_exemplars
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.counterfeit_exemplars (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier                 int NOT NULL CHECK (tier IN (1,2,3)),
  source_platform      text,
  takedown_request_id  uuid REFERENCES public.takedown_requests(id),
  storage_key          text NOT NULL,
  sha256               text NOT NULL,
  perceptual_hash      text NOT NULL,
  confirmed_at         timestamptz NOT NULL,
  confirmed_by         uuid NOT NULL REFERENCES auth.users(id),
  curation_note        text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exemplars_phash
  ON public.counterfeit_exemplars (perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_exemplars_takedown
  ON public.counterfeit_exemplars (takedown_request_id)
  WHERE takedown_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exemplars_confirmed_by
  ON public.counterfeit_exemplars (confirmed_by);

COMMENT ON TABLE public.counterfeit_exemplars IS
  'Prompt #124 P1: curated known-counterfeit reference library. Never used to fine-tune any model; reviewer reference only.';

-- ---------------------------------------------------------------------------
-- 3. counterfeit_evaluations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.counterfeit_evaluations (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id              text NOT NULL UNIQUE,
  source                     text NOT NULL CHECK (source IN (
                               'hounddog_marketplace','hounddog_social','practitioner_appeal',
                               'consumer_report','admin_upload','test_buy'
                             )),
  source_reference           jsonb NOT NULL,
  image_storage_key          text NOT NULL,
  image_sha256               text NOT NULL,
  image_perceptual_hash      text NOT NULL,
  phi_redacted               boolean NOT NULL DEFAULT false,
  content_safety_skip        boolean NOT NULL DEFAULT false,
  content_safety_reason      text,
  candidate_skus             text[],
  model_version              text NOT NULL,
  reference_corpus_version   text NOT NULL,
  raw_vision_output          jsonb,
  ocr_output                 jsonb,
  evaluated_at               timestamptz NOT NULL DEFAULT now(),
  duration_ms                int
);

CREATE INDEX IF NOT EXISTS idx_evaluations_source
  ON public.counterfeit_evaluations (source);
CREATE INDEX IF NOT EXISTS idx_evaluations_phash
  ON public.counterfeit_evaluations (image_perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluated
  ON public.counterfeit_evaluations (evaluated_at DESC);

COMMENT ON TABLE public.counterfeit_evaluations IS
  'Prompt #124 P1: one row per vision evaluation. Raw model output stored for audit + reproducibility.';

-- ---------------------------------------------------------------------------
-- 4. counterfeit_determinations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.counterfeit_determinations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id           uuid NOT NULL UNIQUE
                           REFERENCES public.counterfeit_evaluations(id) ON DELETE CASCADE,
  verdict                 text NOT NULL CHECK (verdict IN (
                            'authentic','counterfeit_suspected','unauthorized_channel_suspected',
                            'inconclusive','unrelated_product','insufficient_image_quality',
                            'content_safety_skip'
                          )),
  confidence              numeric(3,2) NOT NULL
                           CHECK (confidence >= 0.00 AND confidence <= 1.00),
  matched_sku             text,
  mismatch_flags          text[] NOT NULL DEFAULT '{}',
  reasoning_trace         jsonb NOT NULL,
  cited_reference_ids     uuid[] NOT NULL,
  human_review_required   boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_determinations_verdict
  ON public.counterfeit_determinations (verdict);
CREATE INDEX IF NOT EXISTS idx_determinations_review
  ON public.counterfeit_determinations (human_review_required, created_at DESC)
  WHERE human_review_required = true;

COMMENT ON TABLE public.counterfeit_determinations IS
  'Prompt #124 P1: deterministic verdicts from rule table. Detection-only; human decides action.';

-- ---------------------------------------------------------------------------
-- 5. counterfeit_dispositions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.counterfeit_dispositions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  determination_id       uuid NOT NULL UNIQUE
                          REFERENCES public.counterfeit_determinations(id) ON DELETE CASCADE,
  disposition            text NOT NULL CHECK (disposition IN (
                           'confirmed_counterfeit','confirmed_authentic',
                           'confirmed_unauthorized_channel','inconclusive_after_review',
                           'requires_test_buy','referred_to_legal','dismissed'
                         )),
  confirmation_note      text,
  decided_by             uuid NOT NULL REFERENCES auth.users(id),
  decided_at             timestamptz NOT NULL DEFAULT now(),
  second_approver        uuid REFERENCES auth.users(id),
  second_approver_at     timestamptz,
  disagreed_with_model   boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_dispositions_decided
  ON public.counterfeit_dispositions (decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispositions_decided_by
  ON public.counterfeit_dispositions (decided_by);
CREATE INDEX IF NOT EXISTS idx_dispositions_second_approver
  ON public.counterfeit_dispositions (second_approver)
  WHERE second_approver IS NOT NULL;

COMMENT ON TABLE public.counterfeit_dispositions IS
  'Prompt #124 P1: Steve Rica disposition on each determination. Dual approval on first-time takedown filings.';

-- ---------------------------------------------------------------------------
-- 6. consumer_counterfeit_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.consumer_counterfeit_reports (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id                   text NOT NULL UNIQUE,
  submitted_by_user_id        uuid REFERENCES auth.users(id),
  submitted_by_email          text,
  purchase_location           text,
  purchase_date               date,
  order_number                text,
  concern_description         text NOT NULL,
  image_storage_keys          text[] NOT NULL,
  phi_redaction_applied       boolean NOT NULL DEFAULT false,
  status                      text NOT NULL DEFAULT 'submitted'
                                CHECK (status IN (
                                  'submitted','evaluating','in_review',
                                  'confirmed_counterfeit','confirmed_authentic','closed_other'
                                )),
  evaluation_ids              uuid[],
  determination_summary       text,
  consumer_notified_at        timestamptz,
  submitted_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consumer_reports_status
  ON public.consumer_counterfeit_reports (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_consumer_reports_submitter
  ON public.consumer_counterfeit_reports (submitted_by_user_id)
  WHERE submitted_by_user_id IS NOT NULL;

COMMENT ON TABLE public.consumer_counterfeit_reports IS
  'Prompt #124 P1: consumer-submitted suspect reports. PHI pre-filter applied before vision evaluation.';

-- ---------------------------------------------------------------------------
-- 7. counterfeit_test_buys
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.counterfeit_test_buys (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_listing_url            text NOT NULL,
  target_evaluation_id          uuid REFERENCES public.counterfeit_evaluations(id),
  budget_usd                    numeric(10,2) NOT NULL,
  ordered_at                    timestamptz,
  arrived_at                    timestamptz,
  received_photo_storage_keys   text[],
  post_receipt_evaluation_id    uuid REFERENCES public.counterfeit_evaluations(id),
  outcome                       text CHECK (outcome IN (
                                  'counterfeit_confirmed','authentic_confirmed',
                                  'inconclusive','product_not_delivered'
                                )),
  linked_takedown_id            uuid REFERENCES public.takedown_requests(id),
  initiated_by                  uuid NOT NULL REFERENCES auth.users(id),
  initiated_at                  timestamptz NOT NULL DEFAULT now(),
  closed_at                     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_test_buys_initiator
  ON public.counterfeit_test_buys (initiated_by);
CREATE INDEX IF NOT EXISTS idx_test_buys_target_eval
  ON public.counterfeit_test_buys (target_evaluation_id)
  WHERE target_evaluation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_test_buys_post_eval
  ON public.counterfeit_test_buys (post_receipt_evaluation_id)
  WHERE post_receipt_evaluation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_test_buys_takedown
  ON public.counterfeit_test_buys (linked_takedown_id)
  WHERE linked_takedown_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_test_buys_outcome
  ON public.counterfeit_test_buys (outcome, initiated_at DESC)
  WHERE outcome IS NOT NULL;

COMMENT ON TABLE public.counterfeit_test_buys IS
  'Prompt #124 P1: test-buy program tracking. Steve initiates; budget approved by CFO.';

-- ---------------------------------------------------------------------------
-- 8. takedown_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.takedown_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code   text NOT NULL,
  mechanism       text NOT NULL CHECK (mechanism IN (
                    'amazon_brand_registry','ebay_vero','walmart_seller_protection',
                    'etsy_ip_policy','dmca_takedown','platform_trust_safety','manual_legal'
                  )),
  version         int NOT NULL,
  jurisdiction    text NOT NULL DEFAULT 'generic',
  language        text NOT NULL DEFAULT 'en-US',
  body            text NOT NULL,
  required_slots  text[] NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  approved_by     uuid REFERENCES auth.users(id),
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_code, version)
);

CREATE INDEX IF NOT EXISTS idx_takedown_templates_active
  ON public.takedown_templates (mechanism, jurisdiction)
  WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_takedown_templates_approved_by
  ON public.takedown_templates (approved_by)
  WHERE approved_by IS NOT NULL;

COMMENT ON TABLE public.takedown_templates IS
  'Prompt #124 P1: per-platform takedown templates. Approved by Steve; first-time filings require dual approval.';

-- ---------------------------------------------------------------------------
-- 9. marshall_vision_config (kill-switch + per-source + per-platform toggles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marshall_vision_config (
  key            text PRIMARY KEY,
  value          jsonb NOT NULL,
  notes          text,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid REFERENCES auth.users(id)
);

-- Seed defaults: shadow mode on install; all intakes disabled until Steve flips them.
INSERT INTO public.marshall_vision_config (key, value, notes) VALUES
  ('mode',                         '"shadow"'::jsonb, 'Global: active | shadow | off. Flip to active only after Phase B shadow review is complete.'),
  ('source.hounddog_marketplace',  'false'::jsonb,    'Per-source: evaluate Hounddog marketplace signal images.'),
  ('source.hounddog_social',       'false'::jsonb,    'Per-source: evaluate Hounddog social signal media.'),
  ('source.practitioner_appeal',   'false'::jsonb,    'Per-source: evaluate evidence photos in appeals (awaits #123).'),
  ('source.consumer_report',       'false'::jsonb,    'Per-source: evaluate consumer-submitted report images.'),
  ('source.admin_upload',          'true'::jsonb,     'Per-source: evaluate admin-uploaded suspect images. Enabled by default for manual testing.'),
  ('source.test_buy',              'true'::jsonb,     'Per-source: evaluate test-buy received-product photos.'),
  ('takedown.amazon_brand_registry', 'false'::jsonb,  'Per-platform: allow takedown drafts for Amazon Brand Registry.'),
  ('takedown.ebay_vero',             'false'::jsonb,  'Per-platform: allow eBay VeRO drafts.'),
  ('takedown.walmart_seller_protection', 'false'::jsonb, 'Per-platform: allow Walmart Marketplace drafts.'),
  ('takedown.etsy_ip_policy',        'false'::jsonb,  'Per-platform: allow Etsy IP drafts.'),
  ('takedown.dmca_takedown',         'false'::jsonb,  'Per-platform: allow generic DMCA drafts.'),
  ('takedown.platform_trust_safety', 'false'::jsonb,  'Per-platform: allow Instagram / TikTok / social drafts.'),
  ('takedown.manual_legal',          'true'::jsonb,   'Per-platform: allow manual legal counsel drafts. Always enabled.'),
  ('rate_limit.daily_cap_per_source', '1000'::jsonb,  'Global daily cap per source type. Vision API is expensive; keep bounded.'),
  ('rate_limit.per_practitioner_daily', '25'::jsonb,  'Per-practitioner appeal-evidence submission cap.'),
  ('rate_limit.per_consumer_daily',   '5'::jsonb,     'Per-consumer report submission cap.')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.marshall_vision_config IS
  'Prompt #124 P1: kill-switch + per-source + per-platform toggles + rate limits. Default: shadow mode, admin-upload + test-buy enabled, all other sources off until Steve flips.';

-- ---------------------------------------------------------------------------
-- ALTER TABLE on existing takedown_requests (from #120)
-- ---------------------------------------------------------------------------
ALTER TABLE public.takedown_requests
  ADD COLUMN IF NOT EXISTS vision_determination_id       uuid REFERENCES public.counterfeit_determinations(id),
  ADD COLUMN IF NOT EXISTS test_buy_id                   uuid REFERENCES public.counterfeit_test_buys(id),
  ADD COLUMN IF NOT EXISTS template_id                   uuid REFERENCES public.takedown_templates(id),
  ADD COLUMN IF NOT EXISTS template_version              int,
  ADD COLUMN IF NOT EXISTS platform_response_document_urls text[];

CREATE INDEX IF NOT EXISTS idx_takedown_requests_vision
  ON public.takedown_requests (vision_determination_id)
  WHERE vision_determination_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_takedown_requests_test_buy
  ON public.takedown_requests (test_buy_id)
  WHERE test_buy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_takedown_requests_template
  ON public.takedown_requests (template_id)
  WHERE template_id IS NOT NULL;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.counterfeit_reference_corpus   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterfeit_exemplars          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterfeit_evaluations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterfeit_determinations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterfeit_dispositions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumer_counterfeit_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counterfeit_test_buys          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.takedown_templates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marshall_vision_config         ENABLE ROW LEVEL SECURITY;

-- Reference corpus: compliance_reader reads everything; admin writes.
DROP POLICY IF EXISTS crc_read ON public.counterfeit_reference_corpus;
CREATE POLICY crc_read ON public.counterfeit_reference_corpus
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS crc_write ON public.counterfeit_reference_corpus;
CREATE POLICY crc_write ON public.counterfeit_reference_corpus
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','superadmin','compliance_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                       AND role IN ('admin','superadmin','compliance_admin')));

-- Exemplars: compliance reads; only dispositioners write.
DROP POLICY IF EXISTS exemplars_read ON public.counterfeit_exemplars;
CREATE POLICY exemplars_read ON public.counterfeit_exemplars
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS exemplars_insert ON public.counterfeit_exemplars;
CREATE POLICY exemplars_insert ON public.counterfeit_exemplars
  FOR INSERT TO authenticated
  WITH CHECK (confirmed_by = auth.uid() AND public.is_compliance_reader());

-- Evaluations: compliance reads; service role writes (no INSERT/UPDATE policy).
DROP POLICY IF EXISTS evaluations_read ON public.counterfeit_evaluations;
CREATE POLICY evaluations_read ON public.counterfeit_evaluations
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

-- Determinations: compliance reads; service role writes.
DROP POLICY IF EXISTS determinations_read ON public.counterfeit_determinations;
CREATE POLICY determinations_read ON public.counterfeit_determinations
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

-- Dispositions: compliance reads; decider inserts for self.
DROP POLICY IF EXISTS dispositions_read ON public.counterfeit_dispositions;
CREATE POLICY dispositions_read ON public.counterfeit_dispositions
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS dispositions_insert ON public.counterfeit_dispositions;
CREATE POLICY dispositions_insert ON public.counterfeit_dispositions
  FOR INSERT TO authenticated
  WITH CHECK (decided_by = auth.uid() AND public.is_compliance_reader());

-- Consumer reports: submitter can insert + read own; compliance reads all.
DROP POLICY IF EXISTS consumer_report_insert ON public.consumer_counterfeit_reports;
CREATE POLICY consumer_report_insert ON public.consumer_counterfeit_reports
  FOR INSERT TO authenticated
  WITH CHECK (submitted_by_user_id = auth.uid() OR submitted_by_user_id IS NULL);

DROP POLICY IF EXISTS consumer_report_self_read ON public.consumer_counterfeit_reports;
CREATE POLICY consumer_report_self_read ON public.consumer_counterfeit_reports
  FOR SELECT TO authenticated
  USING (
    submitted_by_user_id = auth.uid()
    OR public.is_compliance_reader()
  );

-- Anonymous reports (no auth) are accepted via the server-side service role;
-- the API route authenticates submissions out-of-band. No anon INSERT policy.

-- Test buys: compliance reads; admin writes.
DROP POLICY IF EXISTS test_buys_read ON public.counterfeit_test_buys;
CREATE POLICY test_buys_read ON public.counterfeit_test_buys
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS test_buys_write ON public.counterfeit_test_buys;
CREATE POLICY test_buys_write ON public.counterfeit_test_buys
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','superadmin','compliance_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                       AND role IN ('admin','superadmin','compliance_admin')));

-- Takedown templates: compliance reads; admin writes.
DROP POLICY IF EXISTS templates_read ON public.takedown_templates;
CREATE POLICY templates_read ON public.takedown_templates
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS templates_write ON public.takedown_templates;
CREATE POLICY templates_write ON public.takedown_templates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','superadmin','compliance_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                       AND role IN ('admin','superadmin','compliance_admin')));

-- Config: compliance reads; admin writes.
DROP POLICY IF EXISTS mvc_read ON public.marshall_vision_config;
CREATE POLICY mvc_read ON public.marshall_vision_config
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS mvc_write ON public.marshall_vision_config;
CREATE POLICY mvc_write ON public.marshall_vision_config
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                       AND role IN ('admin','superadmin')));

-- touch trigger for marshall_vision_config
DROP TRIGGER IF EXISTS mvc_touch ON public.marshall_vision_config;
CREATE TRIGGER mvc_touch BEFORE UPDATE ON public.marshall_vision_config
  FOR EACH ROW EXECUTE FUNCTION public.compliance_touch_updated_at();
