-- Prompt 219H: cadence rows that existed only in the runtime embedded DDL.
-- Source values copied from the former EMBEDDED_219H_SQL seed.
-- Append-only. Idempotent. DML only: no CREATE, no pg_cron, no NOTIFY.
-- Not applied in this PR. Awaiting Gary approval. No --prod.
--
-- Scheduler columns: 20260816120000 filled these only for rows that already
-- existed. These three keys are not special-cased there, so a null column
-- takes that migration's ELSE branch (pg_cron, */15 * * * *, /api/cron/ops-tick).
-- Each column is assigned with COALESCE(existing, fill). A value already
-- stored stays in place even when another of the three columns is null.

INSERT INTO public.agent_cadence_jobs (
  job_key, agent_id, label, interval_minutes, priority, budget_class,
  mechanism, timeout_minutes, config
) VALUES
  (
    'jeffery.kb_review',
    'jeffery',
    'Jeffery KB bridge and fail-closed review (221A)',
    15,
    12,
    'C',
    'hybrid',
    20,
    '{"bridge_limit": 12, "review_limit": 20}'::jsonb
  ),
  (
    'hounddog.competitive',
    'hounddog',
    'Phase 2 competitive allowlist crawl (C1)',
    720,
    14,
    'B',
    'cron_tick',
    40,
    '{"phase": 2, "collection": "competitive_supplements"}'::jsonb
  ),
  (
    'elysium.genetic_tests',
    'elysium',
    'Phase 2 genetic test provider crawl (C4)',
    720,
    16,
    'B',
    'cron_tick',
    40,
    '{"phase": 2, "collection": "genetic_tests"}'::jsonb
  )
ON CONFLICT (job_key) DO UPDATE SET
  interval_minutes = EXCLUDED.interval_minutes,
  priority = EXCLUDED.priority,
  budget_class = EXCLUDED.budget_class,
  mechanism = EXCLUDED.mechanism,
  label = EXCLUDED.label,
  updated_at = now();

UPDATE public.agent_cadence_jobs
SET
  scheduler_mechanism = COALESCE(scheduler_mechanism, CASE
    WHEN mechanism IN ('cron_tick', 'hybrid') THEN 'pg_cron'
    WHEN mechanism = 'cron_daily' THEN 'vercel_cron'
    WHEN mechanism = 'event' THEN 'event'
    ELSE 'pg_cron'
  END),
  cron_expression = COALESCE(cron_expression, '*/15 * * * *'),
  invocation_target = COALESCE(invocation_target, '/api/cron/ops-tick')
WHERE job_key IN (
  'jeffery.kb_review',
  'hounddog.competitive',
  'elysium.genetic_tests'
)
  AND (
    scheduler_mechanism IS NULL
    OR cron_expression IS NULL
    OR invocation_target IS NULL
  );
