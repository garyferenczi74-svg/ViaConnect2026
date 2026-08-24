-- Prompt 227f: pg_cron cadence for Sherlock Collection 14 curation (219m pattern).
-- Schedules Bearer-auth Vercel routes via pg_net. Secret never embedded in job SQL.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Generic invoker: path is relative (e.g. /api/cron/run-227e-retraction-watch).
CREATE OR REPLACE FUNCTION public.invoke_viaconnect_bearer_cron(p_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net, pg_temp
AS $fn$
DECLARE
  secret text;
  base_url text := coalesce(
    nullif(current_setting('app.settings.ops_base_url', true), ''),
    'https://www.viaconnectapp.com'
  );
  path text := nullif(btrim(p_path), '');
BEGIN
  IF path IS NULL OR left(path, 1) <> '/' THEN
    RAISE WARNING 'invoke_viaconnect_bearer_cron: invalid path %', p_path;
    RETURN;
  END IF;

  -- Block path traversal / absolute URLs in job args.
  IF position('..' in path) > 0 OR position('://' in path) > 0 THEN
    RAISE WARNING 'invoke_viaconnect_bearer_cron: rejected path %', path;
    RETURN;
  END IF;

  secret := null;
  BEGIN
    SELECT s.value INTO secret
    FROM public.ops_internal_secrets s
    WHERE s.key = 'CRON_SECRET'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN secret := null;
  END;

  IF secret IS NULL OR btrim(secret) = '' THEN
    BEGIN
      SELECT ds.decrypted_secret INTO secret
      FROM vault.decrypted_secrets ds
      WHERE ds.name = 'OPS_CRON_SECRET'
      LIMIT 1;
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF secret IS NULL OR btrim(secret) = '' THEN
    BEGIN
      secret := nullif(current_setting('app.settings.cron_secret', true), '');
    EXCEPTION
      WHEN OTHERS THEN secret := null;
    END;
  END IF;

  IF secret IS NULL OR btrim(secret) = '' THEN
    RAISE WARNING 'invoke_viaconnect_bearer_cron: CRON_SECRET not configured; skip %', path;
    RETURN;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := base_url || path,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || secret
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 290000
    );
  EXCEPTION
    WHEN undefined_function THEN
      PERFORM extensions.http_post(
        url := base_url || path,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || secret
        ),
        body := '{}'::jsonb
      );
  END;
END;
$fn$;

REVOKE ALL ON FUNCTION public.invoke_viaconnect_bearer_cron(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_viaconnect_bearer_cron(text) TO postgres;
GRANT EXECUTE ON FUNCTION public.invoke_viaconnect_bearer_cron(text) TO service_role;

COMMENT ON FUNCTION public.invoke_viaconnect_bearer_cron(text) IS
  'Prompt 227f: invoke a ViaConnect Bearer CRON_SECRET route from pg_cron via pg_net.';

-- Unschedule prior names (idempotent)
DO $u$
DECLARE
  j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'viaconnect_227_retraction_watch_daily',
    'viaconnect_227_curation_cycle_daily',
    'viaconnect_227_thanos_apply_daily',
    'viaconnect_227_deep_sweep_weekly',
    'viaconnect_227_drift_audit_weekly',
    'viaconnect_227_reverify_quarterly'
  ]
  LOOP
    BEGIN
      PERFORM cron.unschedule(j);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END
$u$;

-- Daily: retraction watch first (05:10 UTC), off synchronism 06:15
SELECT cron.schedule(
  'viaconnect_227_retraction_watch_daily',
  '10 5 * * *',
  $cron$ SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-227e-retraction-watch'); $cron$
);

-- Daily: main curation cycle + gap census (05:25 UTC)
SELECT cron.schedule(
  'viaconnect_227_curation_cycle_daily',
  '25 5 * * *',
  $cron$ SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-227a-curation-cycle'); $cron$
);

-- Daily: Thanos Class 0/1 apply after cycle (05:40 UTC)
SELECT cron.schedule(
  'viaconnect_227_thanos_apply_daily',
  '40 5 * * *',
  $cron$ SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-227ah-thanos-apply'); $cron$
);

-- Weekly deep sweep (Sunday 06:50 UTC)
SELECT cron.schedule(
  'viaconnect_227_deep_sweep_weekly',
  '50 6 * * 0',
  $cron$ SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-227-deep-sweep'); $cron$
);

-- Weekly drift audit (Sunday 07:05 UTC)
SELECT cron.schedule(
  'viaconnect_227_drift_audit_weekly',
  '5 7 * * 0',
  $cron$ SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-227-drift-audit'); $cron$
);

-- Quarterly full re-verification (1st of Jan/Apr/Jul/Oct 08:20 UTC)
SELECT cron.schedule(
  'viaconnect_227_reverify_quarterly',
  '20 8 1 1,4,7,10 *',
  $cron$ SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-227-quarterly-reverify'); $cron$
);
