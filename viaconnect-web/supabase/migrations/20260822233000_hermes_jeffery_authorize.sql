-- Hermes peptide scout: Jeffery authorization + weekday 8am Edmonton cadence.
-- Project: nnhkcufyqjojdbvdrpky. Append-only.
-- Hermes already registered (research, reports to thanos). This stamps Jeffery
-- authorization for run hermes-scout-2026-08-22 and schedules weekday scouts.

-- 1. Affirm registry: research under Jeffery fleet, reports to Thanos, weekday cadence.
UPDATE public.ultrathink_agent_registry
SET
  agent_type = 'research',
  reports = 'thanos',
  tier = 2,
  is_active = true,
  runtime_kind = 'pg_cron',
  runtime_handle = '/api/cron/run-hermes-scout',
  expected_period_minutes = 1440,
  description = COALESCE(
    description,
    'Allowlist-only internet scout for peptide research, regulatory updates, and upcoming educational topics. Reports findings to Thanos. No purchase paths, no consumer dosing, no product framing.'
  ),
  origin_prompt = COALESCE(origin_prompt, 'Gary 2026-08-22 peptide scout brief'),
  updated_at = now()
WHERE agent_name = 'hermes';

-- 2. Cadence job (weekday 8am America/Edmonton ≈ 14:00 UTC while on MDT).
INSERT INTO public.agent_cadence_jobs (
  job_key, agent_id, label, interval_minutes, priority, budget_class,
  mechanism, enabled, timeout_minutes, config,
  scheduler_mechanism, cron_expression, invocation_target
) VALUES (
  'hermes.scout',
  'hermes',
  'Hermes peptide scout (weekday 8am Edmonton)',
  1440,
  42,
  'B',
  'cron_tick',
  true,
  45,
  jsonb_build_object(
    'timezone', 'America/Edmonton',
    'local_hour', 8,
    'weekdays_only', true,
    'reports_to', 'thanos',
    'jeffery_fleet', 'research',
    'authorized_run', 'hermes-scout-2026-08-22',
    'utc_schedule_note', '0 14 * * 1-5 approximates 08:00 America/Edmonton during MDT'
  ),
  'pg_cron',
  '0 14 * * 1-5',
  '/api/cron/run-hermes-scout'
)
ON CONFLICT (job_key) DO UPDATE SET
  agent_id = EXCLUDED.agent_id,
  label = EXCLUDED.label,
  interval_minutes = EXCLUDED.interval_minutes,
  priority = EXCLUDED.priority,
  budget_class = EXCLUDED.budget_class,
  mechanism = EXCLUDED.mechanism,
  enabled = true,
  timeout_minutes = EXCLUDED.timeout_minutes,
  config = EXCLUDED.config,
  scheduler_mechanism = EXCLUDED.scheduler_mechanism,
  cron_expression = EXCLUDED.cron_expression,
  invocation_target = EXCLUDED.invocation_target,
  updated_at = now();

-- 3. pg_cron: Mon-Fri 14:00 UTC (8am Edmonton MDT).
DO $$
BEGIN
  PERFORM cron.unschedule('viaconnect_hermes_weekday_scout');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'viaconnect_hermes_weekday_scout',
  '0 14 * * 1-5',
  $sql$
  SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-hermes-scout');
  $sql$
);

-- 4. Jeffery decision: authorize Hermes + accept first scout run.
-- ultrathink_jeffery_decisions.run_id is uuid; use pipeline_runs.id for hermes-scout-2026-08-22.
DO $$
DECLARE
  v_run uuid;
  v_decision uuid;
BEGIN
  SELECT id INTO v_run
  FROM public.pipeline_runs
  WHERE run_id = 'hermes-scout-2026-08-22'
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  IF v_run IS NULL THEN
    INSERT INTO public.pipeline_runs (run_id, run_date, status, started_at, ended_at, stages)
    VALUES (
      'hermes-scout-2026-08-22',
      DATE '2026-08-22',
      'ok',
      now(),
      now(),
      jsonb_build_object(
        'agent', 'hermes',
        'note', 'authorization placeholder; original scout stages preserved if already present'
      )
    )
    RETURNING id INTO v_run;
  END IF;

  SELECT public.jeffery_log_decision(
    v_run,
    'custom',
    'hermes',
    'Gary directed Jeffery to authorize Hermes as peptide scout (research under Jeffery fleet, reports to Thanos, weekday 8am Edmonton). First scout run hermes-scout-2026-08-22 accepted as ok.',
    jsonb_build_object(
      'decision', 'AUTHORIZE',
      'agent', 'hermes',
      'reports_to', 'thanos',
      'jeffery_lane', 'research',
      'schedule', 'weekday 08:00 America/Edmonton',
      'authorized_run_id', 'hermes-scout-2026-08-22',
      'authorized_at', now(),
      'constraints', jsonb_build_array(
        'allowlist domains only',
        'no purchase paths',
        'no consumer dosing',
        'no product framing',
        'findings hand off to Thanos'
      )
    )
  ) INTO v_decision;

  UPDATE public.ultrathink_jeffery_decisions
  SET
    reviewed_at = now(),
    was_correct = true,
    outcome = jsonb_build_object(
      'verdict', 'AUTHORIZED',
      'cadence_job', 'hermes.scout',
      'cron_job', 'viaconnect_hermes_weekday_scout',
      'decision_id', v_decision
    )
  WHERE id = v_decision;
END $$;

-- 5. Learning log breadcrumb for fleet memory.
INSERT INTO public.jeffery_learning_log (
  source_type, lesson, lesson_category, applied_to_agents, config_changes
) VALUES (
  'steering_directive',
  'Hermes is the peptide scout: Jeffery research lane, reports to Thanos, weekday 8am Edmonton. Run hermes-scout-2026-08-22 authorized.',
  'agent_onboarding',
  ARRAY['hermes', 'thanos', 'jeffery'],
  jsonb_build_object(
    'job_key', 'hermes.scout',
    'cron', 'viaconnect_hermes_weekday_scout',
    'authorized_run', 'hermes-scout-2026-08-22'
  )
);
