-- Prompt 227a: claims observatory, freshness SLA fields, signal-lane seeds.
-- Append-only. nnhkcufyqjojdbvdrpky only. Mercola stays excluded (never signal-live).

-- 1. Freshness SLA columns on authorities_sources
ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS expected_cadence text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS staleness_threshold interval;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS last_item_yielded_at timestamptz;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS staleness_state text;

ALTER TABLE public.authorities_sources
  DROP CONSTRAINT IF EXISTS authorities_sources_staleness_state_check;

ALTER TABLE public.authorities_sources
  ADD CONSTRAINT authorities_sources_staleness_state_check
  CHECK (
    staleness_state IS NULL
    OR staleness_state IN ('fresh', 'quiet', 'breached')
  );

-- Backfill defaults for live evidence journals (6h cadence, 14d silence = breach)
UPDATE public.authorities_sources
SET expected_cadence = COALESCE(expected_cadence, cadence, '6h'),
    staleness_threshold = COALESCE(staleness_threshold, interval '14 days'),
    staleness_state = COALESCE(staleness_state, 'quiet'),
    updated_at = now()
WHERE lane = 'evidence' AND registry_status = 'live';

-- 2. observed_claims (claims observatory)
CREATE TABLE IF NOT EXISTS public.observed_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.authorities_sources(id) ON DELETE SET NULL,
  source_domain text NOT NULL,
  source_tier integer CHECK (source_tier IS NULL OR source_tier BETWEEN 1 AND 4),
  claim_text text NOT NULL,
  compound_or_topic text,
  claim_type text NOT NULL
    CHECK (claim_type IN ('efficacy', 'safety', 'dosing', 'sourcing', 'mechanism', 'other')),
  first_observed_at timestamptz NOT NULL DEFAULT now(),
  last_observed_at timestamptz NOT NULL DEFAULT now(),
  observation_count integer NOT NULL DEFAULT 1 CHECK (observation_count >= 1),
  linked_correction_id uuid,
  evidence_status text NOT NULL DEFAULT 'not_yet_assessed'
    CHECK (evidence_status IN (
      'contradicted', 'unsupported', 'partially_supported', 'supported', 'not_yet_assessed'
    )),
  assessed_by text,
  jeffery_review_id text,
  headline_hash text NOT NULL,
  platform text,
  original_url text,
  stores_dose boolean NOT NULL DEFAULT false,
  stores_body_text boolean NOT NULL DEFAULT false,
  stores_person_id boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_domain, headline_hash, claim_type)
);

CREATE INDEX IF NOT EXISTS idx_observed_claims_topic
  ON public.observed_claims (compound_or_topic, evidence_status);

CREATE INDEX IF NOT EXISTS idx_observed_claims_source
  ON public.observed_claims (source_domain, last_observed_at DESC);

ALTER TABLE public.observed_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS observed_claims_select_authenticated ON public.observed_claims;
CREATE POLICY observed_claims_select_authenticated
  ON public.observed_claims FOR SELECT TO authenticated
  USING (true);

COMMENT ON TABLE public.observed_claims IS
  '227a claims observatory. Signal lane only. Never feeds grades, citations, suggestions, or honesty.';

-- 3. Freshness ACC alerts (keyed to item yield, not run success)
CREATE TABLE IF NOT EXISTS public.source_freshness_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_domain text NOT NULL,
  alert_kind text NOT NULL
    CHECK (alert_kind IN ('quiet', 'breached', 'aggregate_breach')),
  message text NOT NULL,
  last_item_yielded_at timestamptz,
  last_successful_run timestamptz,
  escalated boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_freshness_alerts_open
  ON public.source_freshness_alerts (alert_kind, created_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.source_freshness_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS source_freshness_alerts_select_authenticated ON public.source_freshness_alerts;
CREATE POLICY source_freshness_alerts_select_authenticated
  ON public.source_freshness_alerts FOR SELECT TO authenticated
  USING (true);

-- 4. Signal-lane registry seeds (never evidence). Mercola stays excluded.
INSERT INTO public.authorities_sources AS a (
  domain, label, source_kind, domain_tags, base_url,
  is_active, approval_status, approved_by, notes,
  source_tier, transport, registry_status, lane,
  feed_url, cursor_topic_key, expected_cadence, staleness_threshold,
  staleness_state, lex_review_id, cadence
) VALUES
  ('examine.com', 'Examine.com', 'other', ARRAY['signal','secondary'],
   'https://examine.com', true, 'approved', 'gary',
   '227a signal lane. Secondary synthesis; headlines only; do not reproduce body.',
   3, 'rss', 'live', 'signal',
   'https://examine.com/feed/', 'signal-examine', '24h', interval '21 days',
   'quiet', 'lex-pending-227a-examine', '24h'),
  ('www.precisionnutrition.com', 'Precision Nutrition', 'other', ARRAY['signal','commercial'],
   'https://www.precisionnutrition.com', true, 'approved', 'gary',
   '227a signal lane. Commercial education. Headlines only.',
   4, 'rss', 'live', 'signal',
   'https://www.precisionnutrition.com/blog/feed', 'signal-precision-nutrition', '24h', interval '21 days',
   'quiet', 'lex-pending-227a-pn', '24h'),
  ('www.healthline.com', 'Healthline Nutrition', 'other', ARRAY['signal','commercial'],
   'https://www.healthline.com', true, 'approved', 'gary',
   '227a signal lane. Commercial media. Headlines only.',
   4, 'rss', 'live', 'signal',
   'https://www.healthline.com/nutrition/rss', 'signal-healthline', '24h', interval '14 days',
   'quiet', 'lex-pending-227a-healthline', '24h'),
  ('longevity.technology', 'Longevity.Technology', 'other', ARRAY['signal','trade'],
   'https://longevity.technology', true, 'approved', 'gary',
   '227a signal lane. Industry trade press. Headlines only.',
   4, 'rss', 'live', 'signal',
   'https://longevity.technology/feed/', 'signal-longevity-tech', '24h', interval '14 days',
   'quiet', 'lex-pending-227a-longevity', '24h'),
  ('www.projectcbd.org', 'Project CBD', 'other', ARRAY['signal','advocacy'],
   'https://www.projectcbd.org', true, 'approved', 'gary',
   '227a signal lane. Advocacy. Useful for circulating claims; not neutral evidence.',
   4, 'rss', 'live', 'signal',
   'https://www.projectcbd.org/feed', 'signal-project-cbd', '24h', interval '21 days',
   'quiet', 'lex-pending-227a-projectcbd', '24h'),
  ('www.foundmyfitness.com', 'FoundMyFitness', 'other', ARRAY['signal','scicomm'],
   'https://www.foundmyfitness.com', true, 'approved', 'gary',
   '227a signal lane. Science communication secondary.',
   3, 'rss', 'degraded', 'signal',
   NULL, 'signal-foundmyfitness', '24h', interval '21 days',
   'quiet', 'lex-pending-227a-fmf', '24h'),
  ('www.hubermanlab.com', 'Huberman Lab', 'other', ARRAY['signal','scicomm'],
   'https://www.hubermanlab.com', true, 'approved', 'gary',
   '227a signal lane. High influence on user questions; observatory priority.',
   3, 'rss', 'degraded', 'signal',
   NULL, 'signal-huberman', '24h', interval '21 days',
   'quiet', 'lex-pending-227a-huberman', '24h'),
  ('www.lifeextension.com', 'Life Extension Foundation', 'other', ARRAY['signal','vendor'],
   'https://www.lifeextension.com', true, 'approved', 'gary',
   'G56: evidence-excluded supplement seller. Signal lane permitted for claim visibility only.',
   4, 'rss', 'degraded', 'signal',
   NULL, 'signal-life-extension', '24h', interval '21 days',
   'quiet', 'lex-pending-227a-lef', '24h'),
  ('www.mindbodygreen.com', 'mindbodygreen', 'other', ARRAY['signal','vendor'],
   'https://www.mindbodygreen.com', true, 'approved', 'gary',
   'G56: evidence-excluded commercial media and supplement seller. Signal only.',
   4, 'rss', 'degraded', 'signal',
   NULL, 'signal-mindbodygreen', '24h', interval '21 days',
   'quiet', 'lex-pending-227a-mbg', '24h'),
  ('www.genscript.com', 'GenScript Peptide News', 'other', ARRAY['signal','vendor'],
   'https://www.genscript.com', true, 'approved', 'gary',
   'G56: Tier 4 vendor content marketing. Signal only if visibility into vendor claims is wanted.',
   4, 'rss', 'degraded', 'signal',
   NULL, 'signal-genscript', '24h', interval '30 days',
   'quiet', 'lex-pending-227a-genscript', '24h'),
  ('youtube.com', 'YouTube (Data API Wave 1)', 'other', ARRAY['signal','platform'],
   'https://www.youtube.com', true, 'approved', 'gary',
   'G58 Wave 1: official YouTube Data API only. No scraping. No usernames/handles stored.',
   4, 'rest_api', 'pending_access', 'signal',
   NULL, 'signal-youtube', '24h', interval '14 days',
   'quiet', 'lex-pending-227a-youtube', '24h'),
  ('reddit.com', 'Reddit', 'other', ARRAY['signal','platform'],
   'https://www.reddit.com', false, 'approved', 'gary',
   'G58 Lex pending: terms prohibit unauthorized scraping; third-party personal data risk.',
   4, NULL, 'pending_access', 'signal',
   NULL, 'signal-reddit', NULL, NULL, 'quiet', 'lex-blocked-pending-terms', NULL),
  ('x.com', 'X', 'other', ARRAY['signal','platform'],
   'https://x.com', false, 'approved', 'gary',
   'G58 Lex pending: terms and personal data. Not Wave 1.',
   4, NULL, 'pending_access', 'signal',
   NULL, 'signal-x', NULL, NULL, 'quiet', 'lex-blocked-pending-terms', NULL),
  ('tiktok.com', 'TikTok', 'other', ARRAY['signal','platform'],
   'https://www.tiktok.com', false, 'approved', 'gary',
   'G58 Lex pending: terms and personal data. Not Wave 1.',
   4, NULL, 'pending_access', 'signal',
   NULL, 'signal-tiktok', NULL, NULL, 'quiet', 'lex-blocked-pending-terms', NULL),
  ('instagram.com', 'Instagram', 'other', ARRAY['signal','platform'],
   'https://www.instagram.com', false, 'approved', 'gary',
   'G58 Lex pending: terms and personal data. Not Wave 1.',
   4, NULL, 'pending_access', 'signal',
   NULL, 'signal-instagram', NULL, NULL, 'quiet', 'lex-blocked-pending-terms', NULL),
  ('facebook.com', 'Facebook', 'other', ARRAY['signal','platform'],
   'https://www.facebook.com', false, 'approved', 'gary',
   'G58 Lex pending: terms and personal data. Not Wave 1.',
   4, NULL, 'pending_access', 'signal',
   NULL, 'signal-facebook', NULL, NULL, 'quiet', 'lex-blocked-pending-terms', NULL),
  ('linkedin.com', 'LinkedIn', 'other', ARRAY['signal','platform'],
   'https://www.linkedin.com', false, 'approved', 'gary',
   'G58 Lex pending: terms and personal data. Not Wave 1.',
   4, NULL, 'pending_access', 'signal',
   NULL, 'signal-linkedin', NULL, NULL, 'quiet', 'lex-blocked-pending-terms', NULL)
ON CONFLICT (domain) DO UPDATE SET
  label = EXCLUDED.label,
  notes = EXCLUDED.notes,
  source_tier = EXCLUDED.source_tier,
  transport = EXCLUDED.transport,
  registry_status = EXCLUDED.registry_status,
  lane = EXCLUDED.lane,
  feed_url = EXCLUDED.feed_url,
  cursor_topic_key = EXCLUDED.cursor_topic_key,
  expected_cadence = EXCLUDED.expected_cadence,
  staleness_threshold = EXCLUDED.staleness_threshold,
  staleness_state = COALESCE(a.staleness_state, EXCLUDED.staleness_state),
  lex_review_id = EXCLUDED.lex_review_id,
  is_active = EXCLUDED.is_active,
  approval_status = EXCLUDED.approval_status,
  updated_at = now();

-- Ensure Mercola cannot be signal-live
UPDATE public.authorities_sources
SET lane = 'excluded',
    is_active = false,
    approval_status = 'rejected',
    registry_status = 'blocked',
    blocked_reason = COALESCE(blocked_reason, 'G56 credibility exclusion; never wire'),
    updated_at = now()
WHERE domain ILIKE '%mercola%';

-- 5. Cron: signal lane + freshness SLA
DO $$
BEGIN
  PERFORM cron.unschedule('viaconnect_227a_signal_lane');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'viaconnect_227a_signal_lane',
  '50 */6 * * *',
  $sql$
  SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-227a-signal-lane');
  $sql$
);

DO $$
BEGIN
  PERFORM cron.unschedule('viaconnect_227a_freshness_sla');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'viaconnect_227a_freshness_sla',
  '5 */6 * * *',
  $sql$
  SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-227a-freshness-sla');
  $sql$
);
