-- =============================================================================
-- Ultrathink SuperDatabase — Layer 1 (Prompt #60)
-- =============================================================================
-- 12 tables that turn Ultrathink from a per-user request-time generator
-- (Prompt #40) into a 24/7 platform-wide intelligence engine.
--
-- All tables are agent-owned. RLS is enabled with read-by-authenticated-only
-- policies; writes happen via the service-role key from Edge Functions.
--
-- Privacy: ultrathink_outcome_tracker contains ZERO PII. Recommendations are
-- referenced by hash; demographics are bracketed; k-anonymity is enforced at
-- read time by the cache-builder, not in the schema.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ultrathink_knowledge_base — structured clinical facts with provenance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_knowledge_base (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_hash       text NOT NULL UNIQUE,                  -- sha256(subject||predicate||object)
  subject         text NOT NULL,                         -- e.g. "Magnesium glycinate"
  predicate       text NOT NULL,                         -- e.g. "improves", "contraindicated_with"
  object          text NOT NULL,                         -- e.g. "sleep latency", "PPIs"
  domain          text NOT NULL CHECK (domain IN (
                    'supplement','peptide','interaction','condition',
                    'genetic','biomarker','rda','adverse_event','other')),
  evidence_level  text NOT NULL DEFAULT 'emerging' CHECK (evidence_level IN ('strong','moderate','emerging','speculative')),
  evidence_score  numeric NOT NULL DEFAULT 0.5 CHECK (evidence_score BETWEEN 0 AND 1),
  effect_size     numeric,                               -- standardized mean diff or risk ratio when available
  citations       jsonb NOT NULL DEFAULT '[]'::jsonb,    -- array of {source, url, pmid, title, year}
  source_count    integer NOT NULL DEFAULT 1,
  last_validated  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utkb_subject  ON public.ultrathink_knowledge_base (lower(subject));
CREATE INDEX IF NOT EXISTS idx_utkb_object   ON public.ultrathink_knowledge_base (lower(object));
CREATE INDEX IF NOT EXISTS idx_utkb_domain   ON public.ultrathink_knowledge_base (domain);
CREATE INDEX IF NOT EXISTS idx_utkb_evidence ON public.ultrathink_knowledge_base (evidence_score DESC);
COMMENT ON TABLE public.ultrathink_knowledge_base IS 'Structured clinical facts with provenance. Built by knowledge-processor from research_feed.';

-- ---------------------------------------------------------------------------
-- 2. ultrathink_research_feed — raw articles awaiting processing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_research_feed (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL CHECK (source IN (
                    'pubmed','clinicaltrials_gov','openfda','dsld',
                    'openfoodfacts','bright_data','examine','consumerlab',
                    'nih_ods','cochrane','drugbank','viaconnect_internal')),
  external_id     text NOT NULL,                         -- pmid, NCT id, FDA report id, etc.
  title           text NOT NULL,
  abstract        text,
  authors         text[],
  published_at    date,
  url             text,
  raw_payload     jsonb,                                 -- full source response for re-processing
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','processed','skipped','error')),
  processed_at    timestamptz,
  knowledge_ids   uuid[] DEFAULT '{}',                   -- knowledge_base entries derived from this article
  process_error   text,
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)
);
CREATE INDEX IF NOT EXISTS idx_utrf_status     ON public.ultrathink_research_feed (status, fetched_at);
CREATE INDEX IF NOT EXISTS idx_utrf_source     ON public.ultrathink_research_feed (source, published_at DESC);
COMMENT ON TABLE public.ultrathink_research_feed IS 'Raw research articles fetched from external sources. Processed into knowledge_base by knowledge-processor.';

-- ---------------------------------------------------------------------------
-- 3. ultrathink_clinical_rules — dynamic rules with dual scoring
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_clinical_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id             text NOT NULL UNIQUE,
  rule_name           text NOT NULL,
  trigger_type        text NOT NULL,
  trigger_field       text,
  trigger_operator    text,
  trigger_value       text,
  product_name        text,
  product_category    text,
  delivery_form       text,
  dosage              text,
  frequency           text,
  timing              text[],
  rationale_template  text,
  health_signals      text[],
  bioavailability_note text,
  evidence_level      text NOT NULL DEFAULT 'moderate',
  evidence_score      numeric NOT NULL DEFAULT 0.5 CHECK (evidence_score BETWEEN 0 AND 1),
  outcome_score       numeric CHECK (outcome_score BETWEEN 0 AND 1),  -- null until enough outcome data
  outcome_n           integer NOT NULL DEFAULT 0,         -- sample size for outcome_score
  combined_score      numeric GENERATED ALWAYS AS (
                        evidence_score * 0.4 +
                        COALESCE(outcome_score, evidence_score) * 0.6
                      ) STORED,
  source_rule_table   text DEFAULT 'protocol_rules',     -- where the rule originated
  is_active           boolean NOT NULL DEFAULT true,
  deprecated_at       timestamptz,
  deprecation_reason  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utcr_active   ON public.ultrathink_clinical_rules (is_active, combined_score DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_utcr_trigger  ON public.ultrathink_clinical_rules (trigger_type, trigger_field);
COMMENT ON TABLE public.ultrathink_clinical_rules IS 'Dynamic clinical rules. Evolves from initial 25 protocol_rules via rule-evolver based on evidence + outcome scores.';

-- ---------------------------------------------------------------------------
-- 4. ultrathink_outcome_tracker — ANONYMIZED outcome aggregations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_outcome_tracker (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_hash   text NOT NULL,                   -- hash(product||condition||tier)
  product_name          text NOT NULL,
  condition_pattern     text NOT NULL,                   -- e.g. "fatigue+low_iron+female_30s"
  age_bracket           text NOT NULL CHECK (age_bracket IN ('18-29','30-39','40-49','50-59','60-69','70+')),
  sex_bracket           text CHECK (sex_bracket IN ('m','f','x','unknown')),
  bio_score_before      numeric NOT NULL,
  bio_score_after_30d   numeric,
  bio_score_after_60d   numeric,
  delta_30d             numeric GENERATED ALWAYS AS (bio_score_after_30d - bio_score_before) STORED,
  delta_60d             numeric GENERATED ALWAYS AS (bio_score_after_60d - bio_score_before) STORED,
  improved              boolean GENERATED ALWAYS AS (
                          (bio_score_after_60d IS NOT NULL AND bio_score_after_60d > bio_score_before)
                          OR (bio_score_after_30d IS NOT NULL AND bio_score_after_30d > bio_score_before)
                        ) STORED,
  recommendation_at     timestamptz NOT NULL,
  recorded_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utot_rec_hash ON public.ultrathink_outcome_tracker (recommendation_hash);
CREATE INDEX IF NOT EXISTS idx_utot_product  ON public.ultrathink_outcome_tracker (product_name);
COMMENT ON TABLE public.ultrathink_outcome_tracker IS 'ANONYMIZED outcome aggregations. ZERO PII — no user_id. k-anonymity n>=10 enforced at read time by cache-builder.';

-- ---------------------------------------------------------------------------
-- 5. ultrathink_pattern_cache — pre-computed protocols for instant response
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_pattern_cache (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_hash        text NOT NULL UNIQUE,
  signal_summary      text NOT NULL,                     -- human-readable description of the matched pattern
  protocol_payload    jsonb NOT NULL,                    -- serialized GeneratedProtocol
  data_confidence     numeric NOT NULL CHECK (data_confidence BETWEEN 0 AND 1),
  outcome_confidence  numeric CHECK (outcome_confidence BETWEEN 0 AND 1),
  combined_confidence numeric GENERATED ALWAYS AS (
                        data_confidence * 0.4 + COALESCE(outcome_confidence, data_confidence) * 0.6
                      ) STORED,
  sample_n            integer NOT NULL DEFAULT 0,        -- how many users contributed to this pattern
  hit_count           integer NOT NULL DEFAULT 0,        -- how many times this cache entry has been served
  built_at            timestamptz NOT NULL DEFAULT now(),
  last_hit_at         timestamptz,
  source_rule_ids     uuid[] DEFAULT '{}',
  expires_at          timestamptz                        -- null = never expires
);
CREATE INDEX IF NOT EXISTS idx_utpc_confidence ON public.ultrathink_pattern_cache (combined_confidence DESC);
COMMENT ON TABLE public.ultrathink_pattern_cache IS 'Pre-computed Ultrathink protocols. Cache hit returns in <100ms. Built by cache-builder from rules+outcomes.';

-- ---------------------------------------------------------------------------
-- 6. ultrathink_data_feeds — registry of external sources with cost tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_data_feeds (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source                   text NOT NULL UNIQUE,        -- matches research_feed.source
  display_name             text NOT NULL,
  base_url                 text,
  schedule_cron            text NOT NULL,               -- cron expression
  cost_tier                text NOT NULL CHECK (cost_tier IN ('free','credits','claude_api','paid_api')),
  cost_per_run_usd         numeric NOT NULL DEFAULT 0,
  daily_budget_usd         numeric NOT NULL DEFAULT 0,
  total_spent_today_usd    numeric NOT NULL DEFAULT 0,
  total_spent_lifetime_usd numeric NOT NULL DEFAULT 0,
  spent_reset_at           timestamptz NOT NULL DEFAULT date_trunc('day', now()),
  is_active                boolean NOT NULL DEFAULT true,
  last_run_at              timestamptz,
  next_run_at              timestamptz,
  last_status              text CHECK (last_status IN ('ok','partial','error','circuit_open')),
  consecutive_failures     integer NOT NULL DEFAULT 0,
  circuit_open_until       timestamptz,                 -- circuit breaker
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ultrathink_data_feeds IS 'Registry of all 12 external data sources. Orchestrator reads this to schedule sync runs and enforce $50/day cap.';

-- ---------------------------------------------------------------------------
-- 7. ultrathink_agent_tasks — work queue for orchestrator
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_agent_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type       text NOT NULL CHECK (task_type IN (
                    'sync_feed','process_knowledge','build_cache',
                    'collect_outcomes','evolve_rules','custom')),
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority        integer NOT NULL DEFAULT 5,
  status          text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error','cancelled')),
  scheduled_for   timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  result          jsonb,
  error_message   text,
  retry_count     integer NOT NULL DEFAULT 0,
  max_retries     integer NOT NULL DEFAULT 3,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utat_queue ON public.ultrathink_agent_tasks (status, priority, scheduled_for) WHERE status = 'queued';
COMMENT ON TABLE public.ultrathink_agent_tasks IS 'Work queue. Orchestrator polls this every 10 min and dispatches due tasks to sub-agent edge functions.';

-- ---------------------------------------------------------------------------
-- 8. ultrathink_interaction_rules — drug-supplement interactions (dual-source)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_interaction_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_a         text NOT NULL,                    -- supplement or drug
  agent_a_kind    text NOT NULL CHECK (agent_a_kind IN ('supplement','peptide','drug','food','genetic_variant')),
  agent_b         text NOT NULL,
  agent_b_kind    text NOT NULL CHECK (agent_b_kind IN ('supplement','peptide','drug','food','genetic_variant')),
  severity        text NOT NULL CHECK (severity IN ('contraindicated','severe','moderate','minor','beneficial')),
  mechanism       text,
  recommendation  text NOT NULL,
  source          text NOT NULL,                    -- 'openfda','drugbank','manual','knowledge_base'
  source_ids      text[],
  evidence_score  numeric NOT NULL DEFAULT 0.5,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utir_a ON public.ultrathink_interaction_rules (lower(agent_a));
CREATE INDEX IF NOT EXISTS idx_utir_b ON public.ultrathink_interaction_rules (lower(agent_b));
CREATE UNIQUE INDEX IF NOT EXISTS idx_utir_pair ON public.ultrathink_interaction_rules (lower(agent_a), lower(agent_b), source);

-- ---------------------------------------------------------------------------
-- 9. ultrathink_nutrient_rda — RDA/UL values from NIH ODS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_nutrient_rda (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nutrient        text NOT NULL,
  age_group       text NOT NULL,                    -- e.g. '19-30 male', '51+ female'
  rda_value       numeric,
  rda_unit        text,
  upper_limit     numeric,
  upper_limit_unit text,
  source          text NOT NULL DEFAULT 'nih_ods',
  source_url      text,
  retrieved_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nutrient, age_group)
);

-- ---------------------------------------------------------------------------
-- 10. ultrathink_product_efficacy — per-product outcome rollups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_product_efficacy (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name        text NOT NULL,
  condition_pattern   text,
  sample_n            integer NOT NULL DEFAULT 0,
  improved_n          integer NOT NULL DEFAULT 0,
  improvement_rate    numeric GENERATED ALWAYS AS (
                        CASE WHEN sample_n > 0 THEN improved_n::numeric / sample_n ELSE NULL END
                      ) STORED,
  avg_delta_60d       numeric,
  median_delta_60d    numeric,
  computed_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_name, condition_pattern)
);

-- ---------------------------------------------------------------------------
-- 11. ultrathink_knowledge_graph_edges — relationships between facts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_knowledge_graph_edges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  src_fact_id     uuid NOT NULL REFERENCES public.ultrathink_knowledge_base(id) ON DELETE CASCADE,
  dst_fact_id     uuid NOT NULL REFERENCES public.ultrathink_knowledge_base(id) ON DELETE CASCADE,
  relation        text NOT NULL,                    -- 'supports','contradicts','depends_on','interacts_with'
  weight          numeric NOT NULL DEFAULT 1.0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(src_fact_id, dst_fact_id, relation)
);
CREATE INDEX IF NOT EXISTS idx_utkge_src ON public.ultrathink_knowledge_graph_edges (src_fact_id);
CREATE INDEX IF NOT EXISTS idx_utkge_dst ON public.ultrathink_knowledge_graph_edges (dst_fact_id);

-- ---------------------------------------------------------------------------
-- 12. ultrathink_sync_log — per-run audit trail
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ultrathink_sync_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid NOT NULL,
  source          text NOT NULL,                    -- feed name OR 'orchestrator' OR 'knowledge_processor'
  action          text NOT NULL,
  records_in      integer NOT NULL DEFAULT 0,
  records_added   integer NOT NULL DEFAULT 0,
  records_skipped integer NOT NULL DEFAULT 0,
  records_error   integer NOT NULL DEFAULT 0,
  cost_usd        numeric NOT NULL DEFAULT 0,
  duration_ms     integer,
  status          text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','partial','error')),
  error_message   text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_utsl_source_time ON public.ultrathink_sync_log (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utsl_cost_today  ON public.ultrathink_sync_log (created_at DESC) WHERE cost_usd > 0;
COMMENT ON TABLE public.ultrathink_sync_log IS 'Audit trail of every sync run. Used by orchestrator to enforce $50/day cap and circuit breakers.';

-- ---------------------------------------------------------------------------
-- RLS — all tables: enable, allow read by authenticated users, writes via service role
-- ---------------------------------------------------------------------------
DO $rls$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ultrathink_knowledge_base','ultrathink_research_feed','ultrathink_clinical_rules',
    'ultrathink_outcome_tracker','ultrathink_pattern_cache','ultrathink_data_feeds',
    'ultrathink_agent_tasks','ultrathink_interaction_rules','ultrathink_nutrient_rda',
    'ultrathink_product_efficacy','ultrathink_knowledge_graph_edges','ultrathink_sync_log'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- read for any authenticated user (knowledge tables are not user-specific)
    EXECUTE format($p$
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=%L AND policyname='ut_read_authenticated') THEN
          CREATE POLICY ut_read_authenticated ON public.%I FOR SELECT TO authenticated USING (true);
        END IF;
      END $$;
    $p$, t, t);
  END LOOP;
END $rls$;

-- ---------------------------------------------------------------------------
-- Helper RPC: ultrathink_record_sync — for ingest functions to log uniformly
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ultrathink_record_sync(
  p_run_id    uuid,
  p_source    text,
  p_action    text,
  p_in        integer,
  p_added     integer,
  p_skipped   integer,
  p_error     integer,
  p_cost      numeric,
  p_duration  integer,
  p_status    text,
  p_err_msg   text,
  p_metadata  jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.ultrathink_sync_log
    (run_id, source, action, records_in, records_added, records_skipped, records_error,
     cost_usd, duration_ms, status, error_message, metadata)
  VALUES
    (p_run_id, p_source, p_action, p_in, p_added, p_skipped, p_error,
     p_cost, p_duration, p_status, p_err_msg, p_metadata);

  -- Roll cost forward into the data_feeds row if this source is registered
  UPDATE public.ultrathink_data_feeds
     SET total_spent_today_usd    = CASE
                                      WHEN spent_reset_at < date_trunc('day', now())
                                      THEN p_cost
                                      ELSE total_spent_today_usd + p_cost
                                    END,
         total_spent_lifetime_usd = total_spent_lifetime_usd + p_cost,
         spent_reset_at           = CASE
                                      WHEN spent_reset_at < date_trunc('day', now())
                                      THEN date_trunc('day', now())
                                      ELSE spent_reset_at
                                    END,
         last_run_at              = now(),
         last_status              = p_status,
         consecutive_failures     = CASE WHEN p_status = 'error' THEN consecutive_failures + 1 ELSE 0 END,
         circuit_open_until       = CASE
                                      WHEN p_status = 'error' AND consecutive_failures + 1 >= 5
                                      THEN now() + interval '1 hour'
                                      ELSE NULL
                                    END,
         updated_at               = now()
   WHERE source = p_source;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helper RPC: ultrathink_today_spend — total cost across feeds for today
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ultrathink_today_spend()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(SUM(cost_usd), 0)
  FROM public.ultrathink_sync_log
  WHERE created_at >= date_trunc('day', now());
$$;
