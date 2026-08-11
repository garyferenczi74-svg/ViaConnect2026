-- Prompt 212: Connected Sources wearable integration (WHOOP + HealthKit/Health Connect)
-- Append-only. RLS on all exposed tables. Token table: service-role only (no client grants).

-- ---------------------------------------------------------------------------
-- connected_sources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.connected_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('whoop', 'health_kit', 'health_connect')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('connected', 'revoked', 'error', 'pending')),
  scopes text[] NOT NULL DEFAULT '{}',
  external_user_id text,
  connected_at timestamptz,
  last_sync_at timestamptz,
  error_detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS connected_sources_user_idx
  ON public.connected_sources (user_id);

ALTER TABLE public.connected_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connected_sources_select_own ON public.connected_sources;
CREATE POLICY connected_sources_select_own
  ON public.connected_sources
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS connected_sources_insert_own ON public.connected_sources;
CREATE POLICY connected_sources_insert_own
  ON public.connected_sources
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS connected_sources_update_own ON public.connected_sources;
CREATE POLICY connected_sources_update_own
  ON public.connected_sources
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Service role bypasses RLS; no client DELETE of tokens table needed here.
GRANT SELECT, INSERT, UPDATE ON public.connected_sources TO authenticated;
GRANT ALL ON public.connected_sources TO service_role;

-- ---------------------------------------------------------------------------
-- wearable_oauth_tokens (WHOOP only; service-role exclusively)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wearable_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('whoop')),
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  expires_at timestamptz NOT NULL,
  token_scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.wearable_oauth_tokens ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon: client has no read path.
REVOKE ALL ON public.wearable_oauth_tokens FROM authenticated, anon, PUBLIC;
GRANT ALL ON public.wearable_oauth_tokens TO service_role;

-- ---------------------------------------------------------------------------
-- wearable_events (raw append-only landing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wearable_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('whoop', 'health_kit', 'health_connect')),
  event_type text NOT NULL,
  external_id text NOT NULL,
  payload jsonb NOT NULL,
  recorded_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  processing_status text NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processed', 'failed', 'duplicate')),
  UNIQUE (provider, external_id, event_type)
);

CREATE INDEX IF NOT EXISTS wearable_events_pending_idx
  ON public.wearable_events (processing_status, received_at)
  WHERE processing_status = 'pending';

CREATE INDEX IF NOT EXISTS wearable_events_user_idx
  ON public.wearable_events (user_id, received_at DESC);

ALTER TABLE public.wearable_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wearable_events_select_own ON public.wearable_events;
CREATE POLICY wearable_events_select_own
  ON public.wearable_events
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Clients may insert health-sync batches; WHOOP webhooks use service role.
DROP POLICY IF EXISTS wearable_events_insert_own ON public.wearable_events;
CREATE POLICY wearable_events_insert_own
  ON public.wearable_events
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT, INSERT ON public.wearable_events TO authenticated;
GRANT ALL ON public.wearable_events TO service_role;

-- ---------------------------------------------------------------------------
-- Normalized tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wearable_sleep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source_provider text NOT NULL CHECK (source_provider IN ('whoop', 'health_kit', 'health_connect')),
  external_id text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  time_in_bed_min numeric,
  total_sleep_min numeric,
  rem_min numeric,
  deep_min numeric,
  light_min numeric,
  awake_min numeric,
  sleep_efficiency_pct numeric,
  respiratory_rate numeric,
  source_app text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_provider, external_id)
);

CREATE TABLE IF NOT EXISTS public.wearable_recovery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source_provider text NOT NULL CHECK (source_provider IN ('whoop', 'health_kit', 'health_connect')),
  external_id text NOT NULL,
  cycle_date date NOT NULL,
  recovery_score numeric,
  hrv_ms numeric,
  resting_hr_bpm numeric,
  spo2_pct numeric,
  skin_temp_c numeric,
  source_app text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_provider, external_id)
);

CREATE TABLE IF NOT EXISTS public.wearable_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source_provider text NOT NULL CHECK (source_provider IN ('whoop', 'health_kit', 'health_connect')),
  external_id text NOT NULL,
  sport text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  strain numeric,
  avg_hr_bpm numeric,
  max_hr_bpm numeric,
  kilojoules numeric,
  distance_m numeric,
  source_app text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_provider, external_id)
);

CREATE TABLE IF NOT EXISTS public.wearable_daily_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source_provider text NOT NULL CHECK (source_provider IN ('whoop', 'health_kit', 'health_connect')),
  metric_date date NOT NULL,
  steps numeric,
  active_calories numeric,
  hrv_ms numeric,
  resting_hr_bpm numeric,
  respiratory_rate numeric,
  spo2_pct numeric,
  source_app text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_provider, metric_date)
);

CREATE TABLE IF NOT EXISTS public.wearable_body_composition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source_provider text NOT NULL CHECK (source_provider IN ('whoop', 'health_kit', 'health_connect')),
  measured_at timestamptz NOT NULL,
  weight_kg numeric,
  body_fat_pct numeric,
  muscle_mass_kg numeric,
  water_pct numeric,
  visceral_fat_index numeric,
  source_app text,
  external_id text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wearable_body_composition_ext_uidx
  ON public.wearable_body_composition (source_provider, external_id)
  WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.wearable_metric_precedence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  preferred_provider text NOT NULL
    CHECK (preferred_provider IN ('whoop', 'health_kit', 'health_connect')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_key)
);

CREATE TABLE IF NOT EXISTS public.wearable_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.wearable_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  action text NOT NULL,
  provider text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS helpers for normalized tables
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wearable_sleep_sessions',
    'wearable_recovery',
    'wearable_workouts',
    'wearable_daily_vitals',
    'wearable_body_composition',
    'wearable_metric_precedence',
    'wearable_audit_log'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) = user_id)',
      t || '_select_own', t
    );
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- Precedence: users may upsert their own preferences
DROP POLICY IF EXISTS wearable_metric_precedence_upsert_own ON public.wearable_metric_precedence;
CREATE POLICY wearable_metric_precedence_upsert_own
  ON public.wearable_metric_precedence
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

GRANT INSERT, UPDATE ON public.wearable_metric_precedence TO authenticated;

-- OAuth states: service role only
ALTER TABLE public.wearable_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wearable_oauth_states FROM authenticated, anon, PUBLIC;
GRANT ALL ON public.wearable_oauth_states TO service_role;

COMMENT ON TABLE public.connected_sources IS 'Prompt 212: WHOOP / HealthKit / Health Connect connection status';
COMMENT ON TABLE public.wearable_oauth_tokens IS 'Prompt 212: encrypted WHOOP tokens; service-role only';
COMMENT ON TABLE public.wearable_events IS 'Prompt 212: append-only raw wearable event landing';
