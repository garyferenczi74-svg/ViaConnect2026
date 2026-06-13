-- 2026-06-12 (Gary directive): register Marshall and Lex in the agent fleet.
-- Marshall: compliance rule engine (Prompt #119) + CBP customs case officer
-- (Prompt #129a binding). Lex: appellate litigator, Litigation Case
-- Management System (Prompt #116, #129a binding). Both are dispatch-time
-- Claude Code review agents (runtime_kind external); they surface in the
-- /admin/jeffery/agents command center alongside the existing five.
-- Idempotent: guarded inserts so re-runs are safe.

INSERT INTO ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, health_status, last_heartbeat_at,
   is_critical, is_active)
SELECT
  'marshall',
  'Marshall',
  '#119 / #129a',
  'safety',
  2,
  'Compliance rule engine across all 14 pillars, the protocol safety gate compliance lane, and CBP customs case work under 19 C.F.R. Part 133.',
  'jeffery_master',
  'external',
  '.claude/agents/marshall.md',
  'healthy',
  now(),
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM ultrathink_agent_registry WHERE agent_name = 'marshall'
);

INSERT INTO ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, health_status, last_heartbeat_at,
   is_critical, is_active)
SELECT
  'lex',
  'Lex',
  '#116 / #129a',
  'safety',
  2,
  'Appellate litigator for the legal-ops fleet: litigation case management, PACER and e-filing review, discovery, IOLTA oversight, and the protocol safety gate legal lane.',
  'jeffery_master',
  'external',
  '.claude/agents/lex.md',
  'healthy',
  now(),
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM ultrathink_agent_registry WHERE agent_name = 'lex'
);
