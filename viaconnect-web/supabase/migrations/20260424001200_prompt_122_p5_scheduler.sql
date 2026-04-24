-- =============================================================================
-- Prompt #122 P5: SOC 2 Evidence Exporter scheduler + distribution config
-- =============================================================================
-- Adds:
--   1. soc2_distribution_targets table (Drata, Vanta, manual_download gates)
--   2. soc2-packets Storage bucket (private)
--   3. Vault-read RPC stub (returns NULL until Vault is wired)
--   4. ultrathink_agent_registry row for soc2_packet_generator
--   5. pg_cron job: monthly on the 2nd at 04:00 UTC → covers prior calendar month
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Distribution targets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.soc2_distribution_targets (
  platform      text PRIMARY KEY
                 CHECK (platform IN ('drata','vanta','manual_download')),
  enabled       boolean NOT NULL DEFAULT false,
  api_url       text,
  api_key_ref   text,
  notes         text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.soc2_distribution_targets IS
  'Prompt #122 P5: per-platform push config for Drata/Vanta. Vault-referenced credentials. Distribution pushers no-op when enabled=false.';

INSERT INTO public.soc2_distribution_targets (platform, enabled, api_url, api_key_ref, notes) VALUES
  ('drata',           false, NULL, NULL, 'Drata evidence-ingest API. Awaiting api_url + Vault ref.'),
  ('vanta',           false, NULL, NULL, 'Vanta external-evidence endpoint. Awaiting api_url + Vault ref.'),
  ('manual_download', true,  NULL, NULL, 'Always-enabled; signals that admins may download via the admin UI. No external push.')
ON CONFLICT (platform) DO NOTHING;

ALTER TABLE public.soc2_distribution_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sdt_read ON public.soc2_distribution_targets;
CREATE POLICY sdt_read ON public.soc2_distribution_targets
  FOR SELECT TO authenticated
  USING (public.is_compliance_reader());

DROP POLICY IF EXISTS sdt_admin_write ON public.soc2_distribution_targets;
CREATE POLICY sdt_admin_write ON public.soc2_distribution_targets
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin')));

-- touch trigger reusing the #119 helper
DROP TRIGGER IF EXISTS sdt_touch ON public.soc2_distribution_targets;
CREATE TRIGGER sdt_touch BEFORE UPDATE ON public.soc2_distribution_targets
  FOR EACH ROW EXECUTE FUNCTION public.compliance_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Storage bucket for SOC 2 packet ZIPs (private)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'soc2-packets',
  'soc2-packets',
  false,
  524288000,  -- 500 MB per packet ceiling
  ARRAY['application/zip']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Only service-role writes; authenticated reads gated through a compliance/auditor check.
DROP POLICY IF EXISTS soc2_packets_bucket_read ON storage.objects;
CREATE POLICY soc2_packets_bucket_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'soc2-packets'
    AND (
      public.is_compliance_reader()
      OR EXISTS (
        SELECT 1 FROM public.soc2_packets p
        WHERE p.storage_key = storage.objects.name
          AND public.soc2_has_auditor_access(p.id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Vault-read RPC stub (pg_cron + Edge Function use this)
-- ---------------------------------------------------------------------------
-- The real Vault is attached via supabase_vault in production. Until the
-- Vault rows exist, vault_read(p_ref) returns NULL so distribution pushers
-- record a "skipped" attempt rather than blowing up.

CREATE OR REPLACE FUNCTION public.vault_read(p_ref text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_secret text;
BEGIN
  IF p_ref IS NULL OR p_ref = '' THEN
    RETURN NULL;
  END IF;

  -- Production: SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = p_ref;
  -- Stub: return NULL. Replace body once Vault is wired; function signature stays stable.
  BEGIN
    EXECUTE format('SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = %L LIMIT 1', p_ref)
      INTO v_secret;
  EXCEPTION WHEN undefined_table OR insufficient_privilege THEN
    v_secret := NULL;
  END;

  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.vault_read(text) FROM PUBLIC;
-- Service role + authenticated only; callers (distribution pushers) run as
-- service role in the Edge Function.
GRANT EXECUTE ON FUNCTION public.vault_read(text) TO service_role;

COMMENT ON FUNCTION public.vault_read(text) IS
  'Prompt #122 P5: read a Vault-backed secret by name. Stub body returns NULL until Vault rows exist; distribution pushers treat NULL as "target disabled".';

-- ---------------------------------------------------------------------------
-- 4. Registry + pg_cron
-- ---------------------------------------------------------------------------

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('soc2_packet_generator',
   'SOC 2 Evidence Exporter',
   'Prompt #122',
   'safety',
   1,
   'Monthly SOC 2 packet generator. Runs all 24 collectors, assembles a signed deterministic ZIP, persists to Storage, records in soc2_packets, and pushes to Drata/Vanta (when enabled). Reports heartbeat to Jeffery on every run.',
   'jeffery',
   'edge_function',
   'soc2_packet_generator',
   43200,  -- 30 days
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''soc2_packet_generator'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''40 days''',
   true,
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

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'soc2_packet_generator_cron') THEN
      PERFORM cron.unschedule('soc2_packet_generator_cron');
    END IF;

    PERFORM cron.schedule(
      'soc2_packet_generator_cron',
      '7 4 2 * *',  -- 04:07 UTC on the 2nd of every month; off-zero per fleet guidance
      $cron$
      SELECT extensions.http_post(
        url     := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/soc2_packet_generator',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body    := '{"mode":"monthly"}'::jsonb,
        timeout_milliseconds := 300000
      );
      $cron$
    );
  END IF;
END $$;

COMMENT ON TABLE public.soc2_distribution_targets IS
  'Prompt #122 P5: distribution target registry for SOC 2 packets. Row with enabled=true + valid api_url + api_key_ref triggers a push.';
