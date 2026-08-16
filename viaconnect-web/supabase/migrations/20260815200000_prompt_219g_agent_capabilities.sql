-- =============================================================================
-- Prompt 219G: Agent capability permission matrix (APPEND-ONLY)
-- One registry of which agents may invoke which shared capability modules.
-- Usage logs remain in pipeline_runs (capability call rows).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agent_capabilities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        text NOT NULL,
  capability_id   text NOT NULL,
  granted         boolean NOT NULL DEFAULT true,
  granted_by      text NOT NULL DEFAULT 'jeffery',
  granted_at      timestamptz NOT NULL DEFAULT now(),
  notes           text,
  CONSTRAINT agent_capabilities_agent_chk CHECK (
    agent_id IN (
      'jeffery', 'sherlock', 'hounddog', 'hannah', 'gordon', 'thanos', 'elysium',
      'arnold', 'marshall', 'lex', 'michelangelo', 'security_advisor', 'performance_advisor'
    )
  ),
  CONSTRAINT agent_capabilities_cap_chk CHECK (
    capability_id IN (
      'firecrawl',
      'pubmed',
      'grok_research',
      'health_platform',
      'science_authorities',
      'research_hub'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_capabilities_agent_cap
  ON public.agent_capabilities (agent_id, capability_id);

CREATE INDEX IF NOT EXISTS idx_agent_capabilities_agent
  ON public.agent_capabilities (agent_id)
  WHERE granted = true;

ALTER TABLE public.agent_capabilities ENABLE ROW LEVEL SECURITY;

-- Admin/authenticated read of grants (no consumer write). Service role inserts.
DROP POLICY IF EXISTS agent_capabilities_admin_read ON public.agent_capabilities;
CREATE POLICY agent_capabilities_admin_read
  ON public.agent_capabilities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

COMMENT ON TABLE public.agent_capabilities IS
  'Prompt 219G Jeffery-owned matrix: which agents may invoke which shared capability modules.';

-- Seed the core seven with all six capabilities
INSERT INTO public.agent_capabilities (agent_id, capability_id, granted, granted_by, notes)
SELECT a.agent_id, c.capability_id, true, 'jeffery-219g', 'Core seven grant (Prompt 219G)'
FROM (
  VALUES
    ('jeffery'),
    ('sherlock'),
    ('hounddog'),
    ('hannah'),
    ('gordon'),
    ('thanos'),
    ('elysium')
) AS a(agent_id)
CROSS JOIN (
  VALUES
    ('firecrawl'),
    ('pubmed'),
    ('grok_research'),
    ('health_platform'),
    ('science_authorities'),
    ('research_hub')
) AS c(capability_id)
ON CONFLICT (agent_id, capability_id) DO UPDATE
SET granted = true,
    granted_by = EXCLUDED.granted_by,
    notes = EXCLUDED.notes;

-- Index support for capability usage rows in pipeline_runs (filter by run_id prefix)
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_capability_prefix
  ON public.pipeline_runs (run_id)
  WHERE run_id LIKE 'cap-%';
