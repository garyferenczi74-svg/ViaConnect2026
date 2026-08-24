-- Prompt 218: plugin app registry (apps only; wearables stay under Wearables Data).
-- Append-only. Seed is honest: live rows match implemented OAuth/import paths.

CREATE TABLE IF NOT EXISTS public.plugin_app_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL
    CHECK (category IN (
      'Health Platforms',
      'Nutrition',
      'Fitness',
      'Mindfulness',
      'Data Import',
      'Other'
    )),
  description text NOT NULL,
  icon_key text NOT NULL DEFAULT 'Plug',
  status text NOT NULL DEFAULT 'coming_soon'
    CHECK (status IN ('live', 'coming_soon')),
  connection_type text NOT NULL DEFAULT 'oauth2'
    CHECK (connection_type IN ('oauth2', 'file_import', 'polling', 'none')),
  -- Shared state source: where connection rows live for this app.
  state_source text NOT NULL DEFAULT 'data_source_connections'
    CHECK (state_source IN (
      'body_tracker_connections',
      'data_source_connections',
      'none'
    )),
  connect_path text,
  disconnect_path text,
  -- Dual app+wearable ecosystem: link to Wearables Data / Connected Sources.
  wearables_cross_link text,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plugin_app_registry_category
  ON public.plugin_app_registry (category, sort_order);

ALTER TABLE public.plugin_app_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read plugin app registry" ON public.plugin_app_registry;
CREATE POLICY "Authenticated read plugin app registry"
  ON public.plugin_app_registry
  FOR SELECT
  TO authenticated
  USING (is_active = true);

GRANT SELECT ON public.plugin_app_registry TO authenticated;
GRANT ALL ON public.plugin_app_registry TO service_role;

-- Seed from integrations that exist in code today (apps only).
INSERT INTO public.plugin_app_registry (
  slug, display_name, category, description, icon_key, status, connection_type,
  state_source, connect_path, disconnect_path, wearables_cross_link, sort_order
) VALUES
  (
    'google_health',
    'Google Health',
    'Health Platforms',
    'Connect Fitbit, Pixel Watch, and other devices through Google. Weight, sleep, and activity feed Bio Optimization.',
    'HeartPulse',
    'live',
    'oauth2',
    'body_tracker_connections',
    '/api/integrations/google-health/start?return_to=/plugins',
    '/api/integrations/google-health/disconnect',
    '/body-tracker/connections',
    10
  ),
  (
    'myfitnesspal',
    'MyFitnessPal',
    'Nutrition',
    'Import meals, macros, and water when OAuth credentials are configured.',
    'Apple',
    'coming_soon',
    'oauth2',
    'data_source_connections',
    null,
    null,
    null,
    20
  ),
  (
    'cronometer',
    'Cronometer',
    'Nutrition',
    'Micronutrient-dense food diary import (coming soon).',
    'Apple',
    'coming_soon',
    'oauth2',
    'data_source_connections',
    null,
    null,
    null,
    30
  ),
  (
    'strava',
    'Strava',
    'Fitness',
    'Workouts and activity history (coming soon).',
    'Activity',
    'coming_soon',
    'oauth2',
    'data_source_connections',
    null,
    null,
    null,
    40
  ),
  (
    'peloton',
    'Peloton',
    'Fitness',
    'Indoor cycling and class history (coming soon).',
    'Activity',
    'coming_soon',
    'oauth2',
    'data_source_connections',
    null,
    null,
    null,
    50
  ),
  (
    'headspace',
    'Headspace',
    'Mindfulness',
    'Meditation session minutes (coming soon).',
    'Brain',
    'coming_soon',
    'oauth2',
    'data_source_connections',
    null,
    null,
    null,
    60
  ),
  (
    'calm',
    'Calm',
    'Mindfulness',
    'Meditation and sleep stories (coming soon).',
    'Brain',
    'coming_soon',
    'oauth2',
    'data_source_connections',
    null,
    null,
    null,
    70
  ),
  (
    'genetics_file_import',
    'Genetics file import',
    'Data Import',
    'Upload raw DNA or methylation reports in Genetics.',
    'Dna',
    'live',
    'file_import',
    'none',
    '/genetics/upload',
    null,
    null,
    80
  )
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  icon_key = EXCLUDED.icon_key,
  status = EXCLUDED.status,
  connection_type = EXCLUDED.connection_type,
  state_source = EXCLUDED.state_source,
  connect_path = EXCLUDED.connect_path,
  disconnect_path = EXCLUDED.disconnect_path,
  wearables_cross_link = EXCLUDED.wearables_cross_link,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

COMMENT ON TABLE public.plugin_app_registry IS
  'Prompt 218: app integrations only. Wearable devices live under Wearables Data / Connected Sources.';
