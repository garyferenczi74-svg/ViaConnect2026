-- =============================================================================
-- Prompt 219H: Continuous 24/7 agent operations (APPEND-ONLY)
-- Cadence matrix, platform event bus, dead letters, freshness targets, backlog.
-- =============================================================================

-- 1) Cadence matrix: one row per agent job (tunable in ACC)
CREATE TABLE IF NOT EXISTS public.agent_cadence_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key           text NOT NULL UNIQUE,
  agent_id          text NOT NULL,
  label             text NOT NULL,
  interval_minutes  integer NOT NULL CHECK (interval_minutes > 0),
  priority          integer NOT NULL DEFAULT 50,
  budget_class      text NOT NULL DEFAULT 'B'
                    CHECK (budget_class IN ('A', 'B', 'C', 'none')),
  mechanism         text NOT NULL DEFAULT 'cron_tick'
                    CHECK (mechanism IN ('cron_tick', 'event', 'cron_daily', 'hybrid')),
  enabled           boolean NOT NULL DEFAULT true,
  timeout_minutes   integer NOT NULL DEFAULT 30,
  coalesce_window_sec integer NOT NULL DEFAULT 300,
  config            jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at       timestamptz,
  last_status       text,
  next_run_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_cadence_enabled_next
  ON public.agent_cadence_jobs (enabled, next_run_at)
  WHERE enabled = true;

ALTER TABLE public.agent_cadence_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_cadence_admin_read ON public.agent_cadence_jobs;
CREATE POLICY agent_cadence_admin_read
  ON public.agent_cadence_jobs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- 2) Platform event bus (typed, idempotent by event_id)
CREATE TABLE IF NOT EXISTS public.platform_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        text NOT NULL UNIQUE,
  event_type      text NOT NULL,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  coalesce_key    text,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'done', 'failed', 'coalesced')),
  attempts        integer NOT NULL DEFAULT 0,
  processed_at    timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_events_pending
  ON public.platform_events (status, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_platform_events_coalesce
  ON public.platform_events (coalesce_key, created_at)
  WHERE status = 'pending';

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_events_admin_read ON public.platform_events;
CREATE POLICY platform_events_admin_read
  ON public.platform_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- Users may insert their own events (client/server path)
DROP POLICY IF EXISTS platform_events_user_insert ON public.platform_events;
CREATE POLICY platform_events_user_insert
  ON public.platform_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

-- 3) Dead-letter queue for failed/missed jobs
CREATE TABLE IF NOT EXISTS public.agent_job_dead_letters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key         text NOT NULL,
  agent_id        text NOT NULL,
  failure_class   text NOT NULL DEFAULT 'retry_exhausted'
                  CHECK (failure_class IN ('retry_exhausted', 'missed_run', 'stuck', 'budget', 'error')),
  context         jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved        boolean NOT NULL DEFAULT false,
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_dead_letters_open
  ON public.agent_job_dead_letters (resolved, created_at DESC)
  WHERE resolved = false;

ALTER TABLE public.agent_job_dead_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_dead_letters_admin_read ON public.agent_job_dead_letters;
CREATE POLICY agent_dead_letters_admin_read
  ON public.agent_job_dead_letters FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- 4) Freshness targets (config + last measurement)
CREATE TABLE IF NOT EXISTS public.freshness_targets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_key          text NOT NULL UNIQUE,
  label               text NOT NULL,
  max_age_hours       numeric NOT NULL,
  domain              text NOT NULL,
  last_measured_at    timestamptz,
  last_age_hours      numeric,
  last_status         text CHECK (last_status IS NULL OR last_status IN ('ok', 'warning', 'breach', 'unknown')),
  config              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.freshness_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS freshness_targets_admin_read ON public.freshness_targets;
CREATE POLICY freshness_targets_admin_read
  ON public.freshness_targets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- 5) Budget-aware backlog (resume on reset)
CREATE TABLE IF NOT EXISTS public.agent_job_backlog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key         text NOT NULL,
  agent_id        text NOT NULL,
  budget_class    text NOT NULL DEFAULT 'B',
  reason          text NOT NULL DEFAULT 'budget_exhausted',
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'resumed', 'dropped')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resumed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agent_backlog_queued
  ON public.agent_job_backlog (status, created_at)
  WHERE status = 'queued';

ALTER TABLE public.agent_job_backlog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_backlog_admin_read ON public.agent_job_backlog;
CREATE POLICY agent_backlog_admin_read
  ON public.agent_job_backlog FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- Seed cadence defaults (Section 1)
INSERT INTO public.agent_cadence_jobs (
  job_key, agent_id, label, interval_minutes, priority, budget_class, mechanism, timeout_minutes, config
) VALUES
  ('hounddog.discovery', 'hounddog', 'Hound Dog broad discovery', 360, 40, 'A', 'cron_tick', 45,
   '{"pages": 8}'::jsonb),
  ('hounddog.pubmed', 'hounddog', 'PubMed date-bounded discovery', 720, 45, 'B', 'cron_tick', 30,
   '{"retmax": 8}'::jsonb),
  ('hounddog.social', 'hounddog', 'Social relevance sweep', 360, 50, 'B', 'cron_tick', 30,
   '{}'::jsonb),
  ('marshall.gate', 'marshall', 'Marshall gate pending staging', 15, 10, 'none', 'hybrid', 15,
   '{"sla_minutes": 30}'::jsonb),
  ('sherlock.curate', 'sherlock', 'Sherlock curation sweep', 720, 35, 'B', 'hybrid', 40,
   '{"includes_grok": true}'::jsonb),
  ('digest.rollup', 'jeffery', 'Domain digest hourly rollup', 60, 30, 'none', 'cron_tick', 20,
   '{"domains": ["gordon","arnold","elysium","thanos"]}'::jsonb),
  ('hannah.light_freshness', 'hannah', 'Hannah light freshness pass', 240, 25, 'C', 'cron_tick', 15,
   '{"mode": "light"}'::jsonb),
  ('hannah.full_compile', 'hannah', 'Hannah full daily compile (via sync chain)', 1440, 20, 'A', 'cron_daily', 120,
   '{"via": "synchronism-daily"}'::jsonb),
  ('elysium.allowlist', 'elysium', 'Elysium genetics allowlist crawl', 720, 45, 'B', 'cron_tick', 40,
   '{}'::jsonb),
  ('thanos.allowlist', 'thanos', 'Thanos peptide allowlist crawl', 720, 45, 'B', 'cron_tick', 40,
   '{}'::jsonb),
  ('security.daily', 'security_advisor', 'Security Advisor daily', 1440, 60, 'none', 'cron_daily', 30,
   '{}'::jsonb),
  ('performance.daily', 'performance_advisor', 'Performance Advisor daily', 1440, 60, 'none', 'cron_daily', 30,
   '{}'::jsonb),
  ('product.freshness', 'jeffery', 'Product layer evidence freshness', 720, 55, 'C', 'hybrid', 30,
   '{"touches": ["ingredient_snp_relevance","product_content"]}'::jsonb),
  ('watchdog.tick', 'jeffery', 'Jeffery watchdog', 15, 5, 'none', 'cron_tick', 10,
   '{}'::jsonb)
ON CONFLICT (job_key) DO UPDATE SET
  interval_minutes = EXCLUDED.interval_minutes,
  priority = EXCLUDED.priority,
  budget_class = EXCLUDED.budget_class,
  mechanism = EXCLUDED.mechanism,
  label = EXCLUDED.label,
  updated_at = now();

-- Seed freshness targets (Section 4)
INSERT INTO public.freshness_targets (target_key, label, max_age_hours, domain) VALUES
  ('user_insights', 'User insight surfaces (accelerators, Personalized read, Hannah note)', 4, 'hannah'),
  ('domain_digests', 'Domain digests (Gordon/Arnold/Elysium/Thanos)', 1, 'digests'),
  ('gated_research', 'Newly gated research curated for agents', 24, 'research'),
  ('genetics_peptide_evidence', 'Genetics/peptide evidence refresh', 24, 'elysium_thanos'),
  ('product_layer', 'Product Genetic Compatibility / last-verified', 24, 'product')
ON CONFLICT (target_key) DO UPDATE SET
  max_age_hours = EXCLUDED.max_age_hours,
  label = EXCLUDED.label,
  updated_at = now();

COMMENT ON TABLE public.agent_cadence_jobs IS
  'Prompt 219H Jeffery cadence matrix. Tunable intervals; ops-tick schedules from this table.';
COMMENT ON TABLE public.platform_events IS
  'Prompt 219H typed platform event bus. Idempotent on event_id; coalesce_key for bursts.';
COMMENT ON TABLE public.agent_job_dead_letters IS
  'Prompt 219H dead-letter queue after watchdog second failure.';
COMMENT ON TABLE public.freshness_targets IS
  'Prompt 219H freshness SLO config + last measurement.';
COMMENT ON TABLE public.agent_job_backlog IS
  'Prompt 219H budget-aware backlog; resume when ceiling resets.';
