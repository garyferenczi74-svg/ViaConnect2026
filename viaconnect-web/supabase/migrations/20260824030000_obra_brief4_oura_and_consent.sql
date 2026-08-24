-- OBRA Brief 4: Oura as a first-class wearable provider + wearable PHI consent.
-- Append-only. Does not edit prior migrations.

-- ---------------------------------------------------------------------------
-- Expand provider CHECKs to include oura
-- ---------------------------------------------------------------------------
ALTER TABLE public.connected_sources
  DROP CONSTRAINT IF EXISTS connected_sources_provider_check;
ALTER TABLE public.connected_sources
  ADD CONSTRAINT connected_sources_provider_check
  CHECK (provider IN ('whoop', 'health_kit', 'health_connect', 'oura'));

ALTER TABLE public.wearable_oauth_tokens
  DROP CONSTRAINT IF EXISTS wearable_oauth_tokens_provider_check;
ALTER TABLE public.wearable_oauth_tokens
  ADD CONSTRAINT wearable_oauth_tokens_provider_check
  CHECK (provider IN ('whoop', 'oura'));

ALTER TABLE public.wearable_events
  DROP CONSTRAINT IF EXISTS wearable_events_provider_check;
ALTER TABLE public.wearable_events
  ADD CONSTRAINT wearable_events_provider_check
  CHECK (provider IN ('whoop', 'health_kit', 'health_connect', 'oura'));

ALTER TABLE public.wearable_sleep_sessions
  DROP CONSTRAINT IF EXISTS wearable_sleep_sessions_source_provider_check;
ALTER TABLE public.wearable_sleep_sessions
  ADD CONSTRAINT wearable_sleep_sessions_source_provider_check
  CHECK (source_provider IN ('whoop', 'health_kit', 'health_connect', 'oura'));

ALTER TABLE public.wearable_recovery
  DROP CONSTRAINT IF EXISTS wearable_recovery_source_provider_check;
ALTER TABLE public.wearable_recovery
  ADD CONSTRAINT wearable_recovery_source_provider_check
  CHECK (source_provider IN ('whoop', 'health_kit', 'health_connect', 'oura'));

ALTER TABLE public.wearable_workouts
  DROP CONSTRAINT IF EXISTS wearable_workouts_source_provider_check;
ALTER TABLE public.wearable_workouts
  ADD CONSTRAINT wearable_workouts_source_provider_check
  CHECK (source_provider IN ('whoop', 'health_kit', 'health_connect', 'oura'));

ALTER TABLE public.wearable_daily_vitals
  DROP CONSTRAINT IF EXISTS wearable_daily_vitals_source_provider_check;
ALTER TABLE public.wearable_daily_vitals
  ADD CONSTRAINT wearable_daily_vitals_source_provider_check
  CHECK (source_provider IN ('whoop', 'health_kit', 'health_connect', 'oura'));

ALTER TABLE public.wearable_body_composition
  DROP CONSTRAINT IF EXISTS wearable_body_composition_source_provider_check;
ALTER TABLE public.wearable_body_composition
  ADD CONSTRAINT wearable_body_composition_source_provider_check
  CHECK (source_provider IN ('whoop', 'health_kit', 'health_connect', 'oura'));

ALTER TABLE public.wearable_metric_precedence
  DROP CONSTRAINT IF EXISTS wearable_metric_precedence_preferred_provider_check;
ALTER TABLE public.wearable_metric_precedence
  ADD CONSTRAINT wearable_metric_precedence_preferred_provider_check
  CHECK (preferred_provider IN ('whoop', 'health_kit', 'health_connect', 'oura'));

-- ---------------------------------------------------------------------------
-- Wearable PHI consent (sleep / HRV / activity / workouts)
-- Composition and weight stay ungated as body metrics.
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_consents
  ADD COLUMN IF NOT EXISTS wearable_phi_accepted_at timestamptz;

DROP POLICY IF EXISTS user_consents_update_own ON public.user_consents;
CREATE POLICY user_consents_update_own
  ON public.user_consents
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS user_consents_insert_own ON public.user_consents;
CREATE POLICY user_consents_insert_own
  ON public.user_consents
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

GRANT INSERT, UPDATE ON public.user_consents TO authenticated;

COMMENT ON COLUMN public.user_consents.wearable_phi_accepted_at IS
  'OBRA Brief 4: consumer consent for wearable sleep/HRV/activity/workout ingest. Body composition and weight do not require this stamp.';
