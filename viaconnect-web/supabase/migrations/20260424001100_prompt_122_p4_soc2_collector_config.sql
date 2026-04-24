-- =============================================================================
-- Prompt #122 P4: soc2_collector_config — per-collector enable/credentials gate
-- =============================================================================
-- Each external-API collector checks this table to decide whether to run.
-- Rows pre-seeded with enabled=false. Admin flips enabled to true once the
-- api_key_ref has been populated (Vault path) and the scraper stub has been
-- replaced with the real implementation.
--
-- Pattern mirrors iprs_scan_config from #114 (single-row config gate).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.soc2_collector_config (
  collector_id        text PRIMARY KEY,
  enabled             boolean NOT NULL DEFAULT false,
  api_key_ref         text,
  last_run_at         timestamptz,
  last_heartbeat_at   timestamptz,
  notes               text,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.soc2_collector_config IS
  'Prompt #122 P4: per-collector enable gate + Vault API key reference. Collectors return empty CSV when enabled=false.';

-- Seed all 10 P4 collectors as disabled.
INSERT INTO public.soc2_collector_config (collector_id, enabled, notes) VALUES
  ('github-prs-collector',         false, 'GitHub API: needs fine-grained PAT with read:packages, repo:read scoped to viaconnect-web. Not yet configured.'),
  ('vercel-deployments-collector', false, 'Vercel API: needs read-only team token. Not yet configured.'),
  ('anthropic-usage-collector',    false, 'Anthropic API: needs usage-read key. Not yet configured.'),
  ('supabase-advisor-collector',   false, 'Reads Supabase advisor via management API. Awaiting SUPABASE_MGMT_TOKEN in Vault.'),
  ('dependabot-collector',         false, 'GitHub Dependabot alerts via security_events API. Awaiting token.'),
  ('uptime-collector',             false, 'Vercel analytics + Supabase health. Awaiting wiring.'),
  ('cert-expiry-collector',        false, 'TLS endpoint probing for certificate inventory.'),
  ('mfa-enforcement-collector',    false, 'Per-user MFA status from Supabase auth.mfa_factors. Enable after policy sign-off.'),
  ('key-rotation-collector',       true,  'DB-only; reads soc2_signing_keys + precheck_signing_keys. Enabled by default.'),
  ('npi-reverify-collector',       true,  'DB-only; reads compliance_audit_log filtered to npi_reverify events. Enabled by default.')
ON CONFLICT (collector_id) DO NOTHING;

ALTER TABLE public.soc2_collector_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS soc2_collector_config_read ON public.soc2_collector_config;
CREATE POLICY soc2_collector_config_read ON public.soc2_collector_config
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS soc2_collector_config_admin_write ON public.soc2_collector_config;
CREATE POLICY soc2_collector_config_admin_write ON public.soc2_collector_config
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin')));

-- touch trigger reusing the #119 helper
DROP TRIGGER IF EXISTS scc_touch ON public.soc2_collector_config;
CREATE TRIGGER scc_touch BEFORE UPDATE ON public.soc2_collector_config
  FOR EACH ROW EXECUTE FUNCTION public.compliance_touch_updated_at();
