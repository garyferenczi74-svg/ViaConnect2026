-- =============================================================================
-- Prompt #50: Hounddog command-center schema (APPEND-ONLY, IDEMPOTENT)
-- =============================================================================
-- Live project nnhkcufyqjojdbvdrpky (us-east-2) already records
-- 20260413000010 in schema_migrations, but the Prompt #50 objects are
-- missing. Only hounddog_collector_state, hounddog_gated_items, and
-- hounddog_staging_items exist today.
--
-- This file recreates the command-center contract from
-- 20260413000010_hounddog_tables.sql without editing that file:
--   hounddog_is_admin()
--   hounddog_scripts
--   hounddog_pipeline
--   hounddog_performance
--   hounddog_hooks
--   hounddog_analytics_rollup
--
-- Gary-only. No patient data. content_manager / social_manager policies
-- stay commented. No scrape or performance seed rows.
-- =============================================================================

-- Helper: current JWT email is Gary. Not SECURITY DEFINER; email is the
-- GoTrue claim, not user_metadata.
CREATE OR REPLACE FUNCTION public.hounddog_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'gary@farmceuticawellness.com';
$$;

REVOKE ALL ON FUNCTION public.hounddog_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hounddog_is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.hounddog_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hounddog_is_admin() TO service_role;

COMMENT ON FUNCTION public.hounddog_is_admin() IS
  'Gary-only Hounddog admin check. Do not activate content_manager policies.';

-- Scripts
CREATE TABLE IF NOT EXISTS public.hounddog_scripts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  hook        text,
  body        text,
  cta         text,
  angle       text,
  platform    text,
  niche       text,
  hook_score  integer,
  ai_score    integer,
  status      text DEFAULT 'draft',
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hounddog_scripts_status_created
  ON public.hounddog_scripts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hounddog_scripts_created_by
  ON public.hounddog_scripts (created_by);

ALTER TABLE public.hounddog_scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hounddog_scripts_admin_all ON public.hounddog_scripts;
CREATE POLICY hounddog_scripts_admin_all
  ON public.hounddog_scripts
  FOR ALL
  TO authenticated
  USING (public.hounddog_is_admin())
  WITH CHECK (public.hounddog_is_admin());

-- Future content_manager role: read + insert own, no delete
-- (Activate when content team is onboarded)
-- CREATE POLICY "hounddog_scripts_content_manager_write"
--   ON hounddog_scripts FOR INSERT
--   WITH CHECK (auth.jwt() ->> 'role' = 'content_manager');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hounddog_scripts TO authenticated;
GRANT ALL ON public.hounddog_scripts TO service_role;
REVOKE ALL ON public.hounddog_scripts FROM anon;

COMMENT ON TABLE public.hounddog_scripts IS
  'Hounddog command-center scripts. Gary-only via hounddog_is_admin().';

-- Pipeline Queue
CREATE TABLE IF NOT EXISTS public.hounddog_pipeline (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id     uuid REFERENCES public.hounddog_scripts(id) ON DELETE CASCADE,
  platform      text NOT NULL,
  scheduled_at  timestamptz,
  published_at  timestamptz,
  status        text DEFAULT 'queued',
  post_url      text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hounddog_pipeline_status_scheduled
  ON public.hounddog_pipeline (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_hounddog_pipeline_script
  ON public.hounddog_pipeline (script_id);

ALTER TABLE public.hounddog_pipeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hounddog_pipeline_admin_all ON public.hounddog_pipeline;
CREATE POLICY hounddog_pipeline_admin_all
  ON public.hounddog_pipeline
  FOR ALL
  TO authenticated
  USING (public.hounddog_is_admin())
  WITH CHECK (public.hounddog_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hounddog_pipeline TO authenticated;
GRANT ALL ON public.hounddog_pipeline TO service_role;
REVOKE ALL ON public.hounddog_pipeline FROM anon;

COMMENT ON TABLE public.hounddog_pipeline IS
  'Hounddog publish queue. Schema only; no live social posting.';

-- Performance Snapshots
CREATE TABLE IF NOT EXISTS public.hounddog_performance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      text NOT NULL,
  post_url      text,
  pipeline_id   uuid REFERENCES public.hounddog_pipeline(id),
  views         bigint DEFAULT 0,
  likes         bigint DEFAULT 0,
  comments      bigint DEFAULT 0,
  shares        bigint DEFAULT 0,
  saves         bigint DEFAULT 0,
  reach         bigint DEFAULT 0,
  eng_rate      numeric(5,2),
  recorded_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hounddog_performance_platform_recorded
  ON public.hounddog_performance (platform, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_hounddog_performance_pipeline
  ON public.hounddog_performance (pipeline_id);

ALTER TABLE public.hounddog_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hounddog_performance_admin_all ON public.hounddog_performance;
CREATE POLICY hounddog_performance_admin_all
  ON public.hounddog_performance
  FOR ALL
  TO authenticated
  USING (public.hounddog_is_admin())
  WITH CHECK (public.hounddog_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hounddog_performance TO authenticated;
GRANT ALL ON public.hounddog_performance TO service_role;
REVOKE ALL ON public.hounddog_performance FROM anon;

COMMENT ON TABLE public.hounddog_performance IS
  'Manual Hounddog performance snapshots. No live scrape seed data.';

-- Hooks and Research
CREATE TABLE IF NOT EXISTS public.hounddog_hooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_text   text NOT NULL,
  angle       text,
  platform    text,
  score       integer,
  source      text,
  niche       text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hounddog_hooks_platform_score
  ON public.hounddog_hooks (platform, score DESC);

ALTER TABLE public.hounddog_hooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hounddog_hooks_admin_all ON public.hounddog_hooks;
CREATE POLICY hounddog_hooks_admin_all
  ON public.hounddog_hooks
  FOR ALL
  TO authenticated
  USING (public.hounddog_is_admin())
  WITH CHECK (public.hounddog_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hounddog_hooks TO authenticated;
GRANT ALL ON public.hounddog_hooks TO service_role;
REVOKE ALL ON public.hounddog_hooks FROM anon;

COMMENT ON TABLE public.hounddog_hooks IS
  'Hounddog hook research library. Gary-only.';

-- Analytics Rollup (feeds Admin Portal)
CREATE TABLE IF NOT EXISTS public.hounddog_analytics_rollup (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  total_scripts   integer DEFAULT 0,
  total_published integer DEFAULT 0,
  total_reach     bigint DEFAULT 0,
  avg_eng_rate    numeric(5,2),
  top_platform    text,
  top_hook_angle  text,
  pipeline_health integer,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_hounddog_rollup_period_end
  ON public.hounddog_analytics_rollup (period_end DESC);

ALTER TABLE public.hounddog_analytics_rollup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hounddog_rollup_admin_all ON public.hounddog_analytics_rollup;
CREATE POLICY hounddog_rollup_admin_all
  ON public.hounddog_analytics_rollup
  FOR ALL
  TO authenticated
  USING (public.hounddog_is_admin())
  WITH CHECK (public.hounddog_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hounddog_analytics_rollup TO authenticated;
GRANT ALL ON public.hounddog_analytics_rollup TO service_role;
REVOKE ALL ON public.hounddog_analytics_rollup FROM anon;

COMMENT ON TABLE public.hounddog_analytics_rollup IS
  'Hounddog period rollups for /admin/hounddog. Empty until Gary writes rows.';

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.hounddog_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hounddog_scripts_updated_at ON public.hounddog_scripts;
CREATE TRIGGER hounddog_scripts_updated_at
  BEFORE UPDATE ON public.hounddog_scripts
  FOR EACH ROW EXECUTE FUNCTION public.hounddog_set_updated_at();

DROP TRIGGER IF EXISTS hounddog_pipeline_updated_at ON public.hounddog_pipeline;
CREATE TRIGGER hounddog_pipeline_updated_at
  BEFORE UPDATE ON public.hounddog_pipeline
  FOR EACH ROW EXECUTE FUNCTION public.hounddog_set_updated_at();
