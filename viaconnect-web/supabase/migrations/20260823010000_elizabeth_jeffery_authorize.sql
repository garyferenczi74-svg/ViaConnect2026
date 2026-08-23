-- Elizabeth: Hannah research assistant (peer pattern to Hermes → Thanos).
-- Project: nnhkcufyqjojdbvdrpky. Append-only.
-- Gary 2026-08-23: speed peptide/education coverage with assistant agents.

INSERT INTO public.ultrathink_agent_registry (
  agent_name, display_name, origin_prompt, agent_type, tier, description,
  reports, runtime_kind, runtime_handle, expected_period_minutes,
  health_status, is_critical, is_active
)
SELECT
  'elizabeth',
  'Elizabeth',
  'Gary 2026-08-23 Hannah research assistant',
  'research',
  2,
  'Research assistant to Hannah. Helps accelerate educational research passes, gap fill, and compile-adjacent freshness. No consumer dosing. No purchase paths. Reports findings to Hannah.',
  'hannah',
  'pg_cron',
  '/api/cron/run-elizabeth-research',
  180,
  'healthy',
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.ultrathink_agent_registry WHERE agent_name = 'elizabeth'
);

UPDATE public.ultrathink_agent_registry
SET
  agent_type = 'research',
  reports = 'hannah',
  tier = 2,
  is_active = true,
  runtime_kind = 'pg_cron',
  runtime_handle = '/api/cron/run-elizabeth-research',
  expected_period_minutes = 180,
  description = COALESCE(
    nullif(btrim(description), ''),
    'Research assistant to Hannah. Helps accelerate educational research passes, gap fill, and compile-adjacent freshness. No consumer dosing. No purchase paths. Reports findings to Hannah.'
  ),
  origin_prompt = COALESCE(origin_prompt, 'Gary 2026-08-23 Hannah research assistant'),
  updated_at = now()
WHERE agent_name = 'elizabeth';

-- Affirm Hermes still reports to Thanos (assistant pair).
UPDATE public.ultrathink_agent_registry
SET
  reports = 'thanos',
  agent_type = 'research',
  is_active = true,
  updated_at = now()
WHERE agent_name = 'hermes';

INSERT INTO public.agent_cadence_jobs (
  job_key, agent_id, label, interval_minutes, priority, budget_class,
  mechanism, enabled, timeout_minutes, config,
  scheduler_mechanism, cron_expression, invocation_target
) VALUES (
  'elizabeth.research',
  'elizabeth',
  'Elizabeth research assist (Hannah)',
  180,
  28,
  'C',
  'cron_tick',
  true,
  45,
  jsonb_build_object(
    'reports_to', 'hannah',
    'jeffery_lane', 'research',
    'pair', 'hermes→thanos / elizabeth→hannah',
    'role', 'accelerate_hannah_research'
  ),
  'pg_cron',
  '0 */3 * * *',
  '/api/cron/run-elizabeth-research'
)
ON CONFLICT (job_key) DO UPDATE SET
  agent_id = EXCLUDED.agent_id,
  label = EXCLUDED.label,
  interval_minutes = EXCLUDED.interval_minutes,
  enabled = true,
  config = EXCLUDED.config,
  cron_expression = EXCLUDED.cron_expression,
  invocation_target = EXCLUDED.invocation_target,
  updated_at = now();

DO $$
BEGIN
  PERFORM cron.unschedule('viaconnect_elizabeth_research');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'viaconnect_elizabeth_research',
  '0 */3 * * *',
  $sql$
  SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-elizabeth-research');
  $sql$
);

DO $$
DECLARE
  v_run uuid;
  v_decision uuid;
BEGIN
  INSERT INTO public.pipeline_runs (run_id, run_date, status, started_at, ended_at, stages)
  VALUES (
    'elizabeth-authorize-2026-08-23',
    CURRENT_DATE,
    'ok',
    now(),
    now(),
    jsonb_build_object(
      'agent', 'elizabeth',
      'reports_to', 'hannah',
      'pair', jsonb_build_object('hermes', 'thanos', 'elizabeth', 'hannah')
    )
  )
  RETURNING id INTO v_run;

  SELECT public.jeffery_log_decision(
    v_run,
    'custom',
    'elizabeth',
    'Gary directed Jeffery to authorize Elizabeth as Hannah research assistant (pair with Hermes→Thanos) to accelerate education coverage.',
    jsonb_build_object(
      'decision', 'AUTHORIZE',
      'agent', 'elizabeth',
      'reports_to', 'hannah',
      'jeffery_lane', 'research',
      'constraints', jsonb_build_array(
        'no consumer dosing',
        'no purchase paths',
        'reports to Hannah only',
        'Marshall gate before consumer promotion'
      )
    )
  ) INTO v_decision;

  UPDATE public.ultrathink_jeffery_decisions
  SET
    reviewed_at = now(),
    was_correct = true,
    outcome = jsonb_build_object(
      'verdict', 'AUTHORIZED',
      'cadence_job', 'elizabeth.research',
      'cron_job', 'viaconnect_elizabeth_research',
      'decision_id', v_decision
    )
  WHERE id = v_decision;
END $$;

INSERT INTO public.jeffery_learning_log (
  source_type, lesson, lesson_category, applied_to_agents, config_changes
) VALUES (
  'steering_directive',
  'Assistant pair: Hermes reports to Thanos; Elizabeth reports to Hannah. Both research lane under Jeffery. Speeds peptide/education coverage while Marshall gates consumer visibility.',
  'agent_onboarding',
  ARRAY['elizabeth', 'hannah', 'hermes', 'thanos', 'jeffery'],
  jsonb_build_object(
    'elizabeth', 'elizabeth.research',
    'hermes', 'hermes.scout'
  )
);
