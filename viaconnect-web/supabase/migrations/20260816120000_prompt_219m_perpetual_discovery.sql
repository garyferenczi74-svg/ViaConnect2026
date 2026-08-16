-- =============================================================================
-- Prompt 219M: perpetual incremental discovery
-- discovery_cursors, cadence mechanism metadata, pg_cron ops-tick recurrence
-- APPEND-ONLY, IDEMPOTENT
-- =============================================================================

-- 1) Cursor store: one row per source x topic
CREATE TABLE IF NOT EXISTS public.discovery_cursors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL,
  topic_key text NOT NULL DEFAULT 'global',
  -- Position markers (use as applicable to source)
  cursor_date text,
  cursor_timestamp timestamptz,
  cursor_version text,
  last_content_hash text,
  -- Last run bookkeeping
  last_run_at timestamptz,
  last_run_status text
    CHECK (last_run_status IS NULL OR last_run_status IN ('ok', 'empty', 'partial', 'failed')),
  last_new_items integer NOT NULL DEFAULT 0,
  last_error text,
  -- Trail of new-item counts for sparkline (newest last, cap ~48 windows)
  new_items_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_key, topic_key)
);
CREATE INDEX IF NOT EXISTS idx_discovery_cursors_source
  ON public.discovery_cursors (source_key, last_run_at DESC);
ALTER TABLE public.discovery_cursors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS discovery_cursors_admin_read ON public.discovery_cursors;
CREATE POLICY discovery_cursors_admin_read ON public.discovery_cursors
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));

COMMENT ON TABLE public.discovery_cursors IS
  '219M: forward-only discovery cursors. Advance only on full success (including honest empty).';

-- 2) Cadence matrix: explicit scheduler mechanism + expression + target
ALTER TABLE public.agent_cadence_jobs
  ADD COLUMN IF NOT EXISTS scheduler_mechanism text
    CHECK (scheduler_mechanism IS NULL OR scheduler_mechanism IN ('pg_cron', 'vercel_cron', 'event', 'hybrid'));
ALTER TABLE public.agent_cadence_jobs
  ADD COLUMN IF NOT EXISTS cron_expression text;
ALTER TABLE public.agent_cadence_jobs
  ADD COLUMN IF NOT EXISTS invocation_target text;

UPDATE public.agent_cadence_jobs
SET
  scheduler_mechanism = CASE
    WHEN mechanism IN ('cron_tick', 'hybrid') THEN 'pg_cron'
    WHEN mechanism = 'cron_daily' THEN 'vercel_cron'
    WHEN mechanism = 'event' THEN 'event'
    ELSE COALESCE(scheduler_mechanism, 'pg_cron')
  END,
  cron_expression = CASE
    WHEN job_key = 'watchdog.tick' THEN '*/15 * * * *'
    WHEN job_key = 'marshall.gate' THEN '*/15 * * * *'
    WHEN job_key = 'digest.rollup' THEN '5 * * * *'
    WHEN job_key = 'hounddog.discovery' THEN '20 */6 * * *'
    WHEN job_key = 'hounddog.pubmed' THEN '25 */12 * * *'
    WHEN job_key = 'hounddog.social' THEN '30 */6 * * *'
    WHEN job_key = 'sherlock.curate' THEN '40 */12 * * *'
    WHEN job_key = 'hannah.light_freshness' THEN '10 */4 * * *'
    WHEN job_key = 'elysium.allowlist' THEN '45 */12 * * *'
    WHEN job_key = 'thanos.allowlist' THEN '50 */12 * * *'
    WHEN job_key = 'product.freshness' THEN '55 */12 * * *'
    WHEN job_key = 'security.daily' THEN '0 7 * * *'
    WHEN job_key = 'performance.daily' THEN '15 7 * * *'
    WHEN job_key = 'hannah.full_compile' THEN '15 6 * * *'
    ELSE COALESCE(cron_expression, '*/15 * * * *')
  END,
  invocation_target = COALESCE(
    invocation_target,
    CASE
      WHEN mechanism = 'cron_daily' AND job_key = 'hannah.full_compile'
        THEN '/api/cron/synchronism-daily'
      ELSE '/api/cron/ops-tick'
    END
  )
WHERE scheduler_mechanism IS NULL OR cron_expression IS NULL OR invocation_target IS NULL;

-- 3) Extensions for HTTP cron invocation
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 4) SECURITY DEFINER invoker: never embeds the secret in SQL source.
-- Secret resolution order: vault.decrypted_secrets name OPS_CRON_SECRET,
-- then app.settings.cron_secret (set by dashboard / ALTER DATABASE).
CREATE OR REPLACE FUNCTION public.invoke_ops_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  secret text;
  base_url text := coalesce(
    nullif(current_setting('app.settings.ops_base_url', true), ''),
    'https://www.viaconnectapp.com'
  );
BEGIN
  secret := null;
  BEGIN
    SELECT ds.decrypted_secret INTO secret
    FROM vault.decrypted_secrets ds
    WHERE ds.name = 'OPS_CRON_SECRET'
    LIMIT 1;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN OTHERS THEN NULL;
  END;

  IF secret IS NULL OR btrim(secret) = '' THEN
    BEGIN
      secret := nullif(current_setting('app.settings.cron_secret', true), '');
    EXCEPTION
      WHEN OTHERS THEN secret := null;
    END;
  END IF;

  IF secret IS NULL OR btrim(secret) = '' THEN
    RAISE WARNING 'invoke_ops_tick: OPS_CRON_SECRET / app.settings.cron_secret not configured; skip';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := base_url || '/api/cron/ops-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 290000
  );
EXCEPTION
  WHEN undefined_function THEN
    -- Fallback older http extension shape
    PERFORM extensions.http_post(
      url := base_url || '/api/cron/ops-tick',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || secret
      ),
      body := '{}'::jsonb
    );
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_ops_tick() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_ops_tick() TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_ops_tick() TO service_role;

-- 5) pg_cron: sub-daily ops recurrence (15 min) + dedicated discovery windows
DO $$
BEGIN
  PERFORM cron.unschedule('viaconnect_ops_tick_15m');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'viaconnect_ops_tick_15m',
  '*/15 * * * *',
  $cron$ SELECT public.invoke_ops_tick(); $cron$
);

DO $$
BEGIN
  PERFORM cron.unschedule('viaconnect_ops_discovery_6h');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Off-zero minutes so fleet does not stampede
SELECT cron.schedule(
  'viaconnect_ops_discovery_6h',
  '22 */6 * * *',
  $cron$ SELECT public.invoke_ops_tick(); $cron$
);

-- 6) Seed cursor rows for common sources (backfill boundary = 219l activation day)
INSERT INTO public.discovery_cursors (source_key, topic_key, cursor_date, last_run_status, config)
VALUES
  ('pubmed', 'global', '2026-08-15', 'empty', '{"note":"seeded at 219m; advances only after successful forward runs"}'::jsonb),
  ('firecrawl_social', 'global', '2026-08-15', 'empty', '{"note":"seeded at 219m"}'::jsonb),
  ('elysium_allowlist', 'global', '2026-08-15', 'empty', '{}'::jsonb),
  ('thanos_allowlist', 'global', '2026-08-15', 'empty', '{}'::jsonb),
  ('genomes_igsr', 'global', NULL, 'empty', '{"cursor_version":null}'::jsonb)
ON CONFLICT (source_key, topic_key) DO NOTHING;
