-- Prompt 170l Phase 1a: 5 Helix events for barcode scanning consumer flow.
-- Standing Rule #8: consumer-side only.
-- Live shape verified 2026-05-30: columns are (id, display_name, base_points,
-- category, requires_consumer_tier). category='tracking' matches the
-- nutrivision_* / quick_log_* family (vs voice_*='engagement').

INSERT INTO public.helix_earning_event_types (id, display_name, base_points, category, requires_consumer_tier)
VALUES
  ('barcode_scan_started', 'Barcode scan started', 1, 'tracking', 1),
  ('barcode_meal_logged', 'Barcode meal logged', 4, 'tracking', 1),
  ('barcode_off_not_found_fallback', 'Barcode product not found, photo fallback', 0, 'tracking', 1),
  ('barcode_macros_overridden', 'Barcode macros overridden', 1, 'tracking', 1),
  ('barcode_off_contribution_clicked', 'OFF contribution link clicked', 3, 'tracking', 1)
ON CONFLICT (id) DO NOTHING;
