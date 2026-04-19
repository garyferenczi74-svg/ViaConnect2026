-- =============================================================================
-- Prompt #92 audit Round 2 (Jeffery): three escalations bundled
-- =============================================================================
-- 1. Schedule the compute-engagement-scores Edge Function via pg_cron, daily
--    at 03:33 UTC. Off-zero hour avoids collision with the practitioner
--    mailer (:03,:08,...), Arnold tick (:17,:47), Sherlock (:07), and the
--    cert reminder (09:23 UTC).
-- 2. Register compute-engagement-scores in ultrathink_agent_registry so
--    Jeffery monitors heartbeats. Mirrors arnold + sherlock + mailer.
-- 3. Add an INSERT policy on helix_referral_codes for the row's owner. The
--    Phase 4 migration only granted SELECT; without INSERT, the referrals
--    library's authed-client insert at src/lib/helix/referrals.ts silently
--    failed under RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Register compute-engagement-scores
-- ---------------------------------------------------------------------------

INSERT INTO public.ultrathink_agent_registry
  (agent_name, display_name, origin_prompt, agent_type, tier, description,
   reports, runtime_kind, runtime_handle, expected_period_minutes,
   health_check_query, is_critical, is_active)
VALUES
  ('compute-engagement-scores',
   'Engagement Score Computer',
   'Prompt #92',
   'analytics',
   2,
   'Daily sweep over active memberships. Computes the four-component engagement composite (adherence 35, assessment 20, tracking 25, outcome 20) and upserts engagement_score_snapshots. Practitioner-facing surface; Helix internals never cross the firewall.',
   'jeffery',
   'edge_function',
   'compute-engagement-scores',
   1440,
   'SELECT 1 FROM public.ultrathink_agent_events WHERE agent_name = ''compute-engagement-scores'' AND event_type IN (''heartbeat'',''complete'') AND created_at > now() - interval ''2 days''',
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

-- ---------------------------------------------------------------------------
-- 2. pg_cron schedule
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM cron.unschedule('compute_engagement_scores_cron');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'compute_engagement_scores_cron',
  '33 3 * * *',
  $sql$
  SELECT extensions.http_post(
    url := 'https://nnhkcufyqjojdbvdrpky.supabase.co/functions/v1/compute-engagement-scores',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'scheduled_at', now()
    )::text
  );
  $sql$
);

-- ---------------------------------------------------------------------------
-- 3. INSERT policy on helix_referral_codes for the row's owner
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'helix_referral_codes'
      AND policyname = 'referral_codes_self_insert'
  ) THEN
    CREATE POLICY "referral_codes_self_insert"
      ON public.helix_referral_codes FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Allow the owner to UPDATE in case the code is ever rotated. SECURITY
-- DEFINER RPCs can bypass this; this gives the canonical authed-client path
-- a clean route too.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'helix_referral_codes'
      AND policyname = 'referral_codes_self_update'
  ) THEN
    CREATE POLICY "referral_codes_self_update"
      ON public.helix_referral_codes FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
