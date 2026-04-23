-- =============================================================================
-- Prompt #114 P4a: IPRS alerts review surface + config table
-- =============================================================================
-- Prepares the human review path for IPRS scan results. The edge function +
-- pg_cron arrive in P4b; P4a delivers the UI and review routes against a
-- live schema that supports:
--   - is_synthetic flag on scan results so QA-seeded rows stay separable
--     from production alerts in dashboard counts.
--   - iprs_scan_config single-row pattern (mirrors brand_agent_config from
--     the brand-enricher precedent) so P4b's function can early-return
--     when the agent is disabled — no new env vars.
-- =============================================================================

ALTER TABLE public.customs_iprs_scan_results
  ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.customs_iprs_scan_results.is_synthetic IS
  'Prompt #114 P4a: TRUE when the row was inserted via the dev-only test-insert endpoint. Dashboard counts + production alerts filter these out.';

CREATE INDEX IF NOT EXISTS idx_customs_iprs_real_requires_review
  ON public.customs_iprs_scan_results (scanned_at DESC)
  WHERE status = 'requires_review' AND is_synthetic = FALSE;

-- ---------------------------------------------------------------------------
-- iprs_scan_config (single-row)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.iprs_scan_config (
  config_id         BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (config_id = TRUE),
  agent_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  last_scan_at      TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes             TEXT
);

INSERT INTO public.iprs_scan_config (config_id, agent_enabled, notes)
VALUES (TRUE, FALSE, 'Disabled until CBP IPRS access is configured. Toggle via admin-only UPDATE.')
ON CONFLICT (config_id) DO NOTHING;

COMMENT ON TABLE public.iprs_scan_config IS
  'Prompt #114 P4a: single-row gate for the IPRS daily scan agent. Mirrors brand_agent_config; cron runs always but function early-returns when agent_enabled=FALSE.';

ALTER TABLE public.iprs_scan_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iprs_scan_config_legal_ops_read ON public.iprs_scan_config;
CREATE POLICY iprs_scan_config_legal_ops_read
  ON public.iprs_scan_config FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops','cfo','ceo')));

DROP POLICY IF EXISTS iprs_scan_config_admin_write ON public.iprs_scan_config;
CREATE POLICY iprs_scan_config_admin_write
  ON public.iprs_scan_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
