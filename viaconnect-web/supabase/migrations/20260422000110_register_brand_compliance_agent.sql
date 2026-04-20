-- =============================================================================
-- Prompt #103 Phase 7 (Jeffery review fix): register brand_compliance_validator
-- =============================================================================
-- Jeffery flagged that the brand_compliance_validator Edge Function
-- calls ultrathink_agent_heartbeat but was never registered in the
-- agent registry. Without a registry row, Jeffery Master cannot
-- monitor the agent's liveness, and health sweeps skip it.
--
-- The validator is on-demand (triggered when a packaging proof is
-- uploaded / refreshed), not scheduled, so expected_period_minutes is
-- NULL. is_critical=false because the admin UI can always re-trigger.
-- =============================================================================

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('brand_compliance_validator',
   'Brand Identity Compliance Validator',
   'Prompt #103',
   'safety',
   2,
   'Claude Vision-backed packaging-proof validator. Validates uploaded proofs against the seven-category brand system (identity mark, palette, tagline, wordmark rules) and writes brand_compliance_reviews rows. Admin approves, rejects, or requests remediation. Runs on-demand; triggered by admin upload or remediation flow.',
   'jeffery',
   'edge_function',
   'brand_compliance_validator',
   NULL,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''brand_compliance_validator'' AND event_type IN (''heartbeat'',''done'',''complete'') AND created_at > now() - interval ''30 days''',
   false,
   true)
ON CONFLICT (agent_name) DO UPDATE SET
  display_name            = EXCLUDED.display_name,
  description             = EXCLUDED.description,
  reports                 = EXCLUDED.reports,
  runtime_kind            = EXCLUDED.runtime_kind,
  runtime_handle          = EXCLUDED.runtime_handle,
  expected_period_minutes = EXCLUDED.expected_period_minutes,
  health_check_query      = EXCLUDED.health_check_query,
  is_critical             = EXCLUDED.is_critical,
  is_active               = EXCLUDED.is_active,
  updated_at              = now();
