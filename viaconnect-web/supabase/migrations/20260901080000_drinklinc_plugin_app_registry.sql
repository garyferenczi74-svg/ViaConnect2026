-- LINC / DrinkLinc app plugin (Nutrition, coming soon).
-- Append-only seed. LINC is a supplement dispenser, not a wearable.
-- Do not add drinklinc to FIRST_CLASS_TILE_IDS or PLUGIN_PAGE_EXCLUDED_SLUGS.
-- No public DrinkLinc/LINC API as of 2026-09-01 audit. Connect path stays null.

INSERT INTO public.plugin_app_registry (
  slug, display_name, category, description, icon_key, status, connection_type,
  state_source, connect_path, disconnect_path, wearables_cross_link, sort_order
) VALUES
  (
    'drinklinc',
    'LINC',
    'Nutrition',
    'Personalized supplement dosing from wearable and biology data. Coming soon. No public API yet.',
    'Droplets',
    'coming_soon',
    'oauth2',
    'data_source_connections',
    null,
    null,
    null,
    35
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
  'App integrations only. Wearable devices live under Wearables Data. drinklinc is Nutrition coming soon (no public API).';
