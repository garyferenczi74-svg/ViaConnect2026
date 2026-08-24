-- Brief 27: ACC Command Center ops rows for all 17 Grok seats.
-- Insert missing seats as idle (unknown, no last_heartbeat). Never Healthy.
-- Never invent advisor or Gordon seats. Picasso is not launching.
-- Append-only. Project: nnhkcufyqjojdbvdrpky.

INSERT INTO public.ultrathink_agent_registry (
  agent_name, display_name, origin_prompt, agent_type, tier, description,
  reports, runtime_kind, runtime_handle, expected_period_minutes,
  health_status, last_heartbeat_at, is_critical, is_active
)
SELECT v.agent_name, v.display_name, v.origin_prompt, v.agent_type, v.tier, v.description,
       v.reports, v.runtime_kind, v.runtime_handle, v.expected_period_minutes,
       v.health_status, v.last_heartbeat_at, v.is_critical, v.is_active
FROM (
  VALUES
    ('jeffery', 'Jeffery', 'Brief 27 ACC ops row', 'control', 1,
     'The brain: orchestration, scheduling, dispatch, Admin Command Center, and the daily synchronism chain.',
     'jeffery', 'request_time', '/api/admin/agents/jeffery/run-now', 60,
     'unknown', NULL::timestamptz, false, true),
    ('picasso', 'Picasso', 'Brief 27 ACC ops row', 'ai', 2,
     'Grok roster seat. Ops row is present. Idle until a real turn, brief, or PR is ingested.',
     'jeffery', 'external', NULL, NULL,
     'unknown', NULL::timestamptz, false, true),
    ('michelangelo', 'Michelangelo', 'Brief 27 ACC ops row', 'ai', 2,
     'Code quality, TDD/OBRA discipline, CI regression suites, technical standards.',
     'jeffery', 'external', NULL, NULL,
     'unknown', NULL::timestamptz, false, true),
    ('conan', 'Conan', 'Brief 27 ACC ops row', 'ai', 2,
     'Grok roster seat. Ops row is present. Idle until a real turn, brief, or PR is ingested.',
     'jeffery', 'external', NULL, NULL,
     'unknown', NULL::timestamptz, false, true),
    ('hermes', 'Hermes', 'Brief 27 ACC ops row', 'research', 2,
     'Jeffery research lane scout for peptide education. Reports to Thanos. Weekday 8am Edmonton cadence.',
     'jeffery', 'request_time', '/api/admin/agents/hermes/run-now', 60,
     'unknown', NULL::timestamptz, false, true),
    ('gene', 'Gene', 'Brief 27 ACC ops row', 'ai', 2,
     'Grok roster seat. Ops row is present. Idle until a real turn, brief, or PR is ingested.',
     'jeffery', 'external', NULL, NULL,
     'unknown', NULL::timestamptz, false, true),
    ('elysium', 'Elysium', 'Brief 27 ACC ops row', 'research', 2,
     'Owns My Genetics: GENEX360 interpretations, upload mapping, 1000 Genomes population context, genetics education with Hannah.',
     'jeffery', 'request_time', '/api/admin/agents/elysium/run-now', 60,
     'unknown', NULL::timestamptz, false, true),
    ('marshall', 'Marshall', 'Brief 27 ACC ops row', 'safety', 1,
     'Content and product compliance, lexicon enforcement, Stage 1 claims detector, customs case work.',
     'jeffery', 'request_time', '/api/admin/agents/marshall/run-now', 60,
     'unknown', NULL::timestamptz, false, true),
    ('martha', 'Martha', 'Brief 27 ACC ops row', 'ai', 2,
     'Grok roster seat. Ops row is present. Idle until a real turn, brief, or PR is ingested.',
     'jeffery', 'external', NULL, NULL,
     'unknown', NULL::timestamptz, false, true),
    ('hannah', 'HannahAI', 'Brief 27 ACC ops row', 'ai', 2,
     'Assistant surfaces, daily insight compilation, and user-facing wellness copy.',
     'jeffery', 'request_time', '/api/admin/agents/hannah/run-now', 60,
     'unknown', NULL::timestamptz, false, true),
    ('thanos', 'Thanos', 'Brief 27 ACC ops row', 'research', 2,
     'Owns Peptide Education end to end: allowlist research freshness, educational catalog, practitioner protocol guidance with Hannah. Never commercial product paths.',
     'jeffery', 'request_time', '/api/admin/agents/thanos/run-now', 60,
     'unknown', NULL::timestamptz, false, true),
    ('elizabeth', 'Elizabeth', 'Brief 27 ACC ops row', 'research', 2,
     'Helps Hannah with educational research freshness and gap fill. Reports to Hannah. No consumer dosing or purchase guidance.',
     'jeffery', 'request_time', '/api/admin/agents/elizabeth/run-now', 60,
     'unknown', NULL::timestamptz, false, true),
    ('lex', 'Lex', 'Brief 27 ACC ops row', 'safety', 2,
     'Legal routes, terms, privacy, litigation case management, and former Kelsey Stage 2 legal review.',
     'jeffery', 'external', NULL, NULL,
     'unknown', NULL::timestamptz, false, true),
    ('sherlock', 'Sherlock', 'Brief 27 ACC ops row', 'research', 2,
     'Analyzes and curates gated Hound Dog staging and research feeds into finished outputs.',
     'jeffery', 'request_time', '/api/admin/agents/sherlock/run-now', 60,
     'unknown', NULL::timestamptz, false, true),
    ('watson', 'Watson', 'Brief 27 ACC ops row', 'ai', 2,
     'Grok roster seat. Ops row is present. Idle until a real turn, brief, or PR is ingested.',
     'jeffery', 'external', NULL, NULL,
     'unknown', NULL::timestamptz, false, true),
    ('arnold', 'Arnold', 'Brief 27 ACC ops row', 'scoring', 2,
     'My Biology hub: FormaVision body composition, vitals trends, wearables-derived biology metrics. Genetics context via Elysium digest only.',
     'jeffery', 'external', NULL, NULL,
     'unknown', NULL::timestamptz, false, true),
    ('hounddog', 'Hound Dog', 'Brief 27 ACC ops row', 'data', 2,
     'Scrapes and ingests clinical data and relevant social content into gated staging.',
     'jeffery', 'request_time', '/api/admin/agents/hounddog/run-now', 60,
     'unknown', NULL::timestamptz, false, true)
) AS v(
  agent_name, display_name, origin_prompt, agent_type, tier, description,
  reports, runtime_kind, runtime_handle, expected_period_minutes,
  health_status, last_heartbeat_at, is_critical, is_active
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ultrathink_agent_registry r WHERE r.agent_name = v.agent_name
);

-- Do not stamp Healthy or a heartbeat onto existing rows.
-- Existing jeffery/hermes/marshall heartbeats stay whatever real work wrote.