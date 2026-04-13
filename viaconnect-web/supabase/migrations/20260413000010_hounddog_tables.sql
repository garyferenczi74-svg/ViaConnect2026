-- Hounddog Tables
-- All tables prefixed hounddog_ for clean portability
-- Admin-only access via RLS; future content_manager role ready

-- Helper: resolve admin uid
CREATE OR REPLACE FUNCTION hounddog_is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'gary@farmceuticawellness.com'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Scripts
CREATE TABLE IF NOT EXISTS hounddog_scripts (
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

ALTER TABLE hounddog_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hounddog_scripts_admin_all"
  ON hounddog_scripts FOR ALL
  USING (hounddog_is_admin())
  WITH CHECK (hounddog_is_admin());

-- Future content_manager role: read + insert own, no delete
-- (Activate when content team is onboarded)
-- CREATE POLICY "hounddog_scripts_content_manager_write"
--   ON hounddog_scripts FOR INSERT
--   WITH CHECK (auth.jwt() ->> 'role' = 'content_manager');

-- Pipeline Queue
CREATE TABLE IF NOT EXISTS hounddog_pipeline (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id     uuid REFERENCES hounddog_scripts(id) ON DELETE CASCADE,
  platform      text NOT NULL,
  scheduled_at  timestamptz,
  published_at  timestamptz,
  status        text DEFAULT 'queued',
  post_url      text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE hounddog_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hounddog_pipeline_admin_all"
  ON hounddog_pipeline FOR ALL
  USING (hounddog_is_admin())
  WITH CHECK (hounddog_is_admin());

-- Performance Snapshots
CREATE TABLE IF NOT EXISTS hounddog_performance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      text NOT NULL,
  post_url      text,
  pipeline_id   uuid REFERENCES hounddog_pipeline(id),
  views         bigint DEFAULT 0,
  likes         bigint DEFAULT 0,
  comments      bigint DEFAULT 0,
  shares        bigint DEFAULT 0,
  saves         bigint DEFAULT 0,
  reach         bigint DEFAULT 0,
  eng_rate      numeric(5,2),
  recorded_at   timestamptz DEFAULT now()
);

ALTER TABLE hounddog_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hounddog_performance_admin_all"
  ON hounddog_performance FOR ALL
  USING (hounddog_is_admin())
  WITH CHECK (hounddog_is_admin());

-- Hooks & Research
CREATE TABLE IF NOT EXISTS hounddog_hooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hook_text   text NOT NULL,
  angle       text,
  platform    text,
  score       integer,
  source      text,
  niche       text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE hounddog_hooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hounddog_hooks_admin_all"
  ON hounddog_hooks FOR ALL
  USING (hounddog_is_admin())
  WITH CHECK (hounddog_is_admin());

-- Analytics Rollup (feeds Admin Portal)
CREATE TABLE IF NOT EXISTS hounddog_analytics_rollup (
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

ALTER TABLE hounddog_analytics_rollup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hounddog_rollup_admin_all"
  ON hounddog_analytics_rollup FOR ALL
  USING (hounddog_is_admin())
  WITH CHECK (hounddog_is_admin());

-- Updated_at triggers
CREATE OR REPLACE FUNCTION hounddog_set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hounddog_scripts_updated_at
  BEFORE UPDATE ON hounddog_scripts
  FOR EACH ROW EXECUTE FUNCTION hounddog_set_updated_at();

CREATE TRIGGER hounddog_pipeline_updated_at
  BEFORE UPDATE ON hounddog_pipeline
  FOR EACH ROW EXECUTE FUNCTION hounddog_set_updated_at();
