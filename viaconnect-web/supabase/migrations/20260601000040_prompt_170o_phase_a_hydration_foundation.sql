-- Prompt 170o Phase 1 Phase A: Hydration tracking foundation (standalone).
-- Append-only. Phase 2 (170h insights composition) is filed for late Q3 2026
-- and attaches without further migration churn per the Phase 1/Phase 2 split
-- spec at docs/prompts/prompt-170o-phase-1-phase-2-split-2026-05-31.md.

-- 1. meal_items hydration columns. portion_volume_ml already exists from
--    170 base; ADD COLUMN IF NOT EXISTS makes it idempotent.
ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS hydration_source_kind TEXT,
  ADD COLUMN IF NOT EXISTS hydration_ml NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS portion_volume_ml NUMERIC(10,2);

-- Gordon canonical 9-value enum per Phase 1 LP1 §1.0 (spelling/casing/
-- underscore conventions normative; no drift permitted).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='meal_items_hydration_source_kind_check'
  ) THEN
    ALTER TABLE public.meal_items
      ADD CONSTRAINT meal_items_hydration_source_kind_check
      CHECK (hydration_source_kind IS NULL OR hydration_source_kind IN (
        'pure_water','coffee_tea','juice_smoothie','dairy','soda',
        'alcohol_low','alcohol_high','sports_drink','high_water_food'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_items_hydration_source
  ON public.meal_items(hydration_source_kind)
  WHERE hydration_source_kind IS NOT NULL;

-- 2. meals.meal_kind. Reduced to 2 values per pre-build issue #2
--    (snack stays on meal_type to avoid ontology overlap).
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS meal_kind TEXT NOT NULL DEFAULT 'full_meal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='meals_meal_kind_check'
  ) THEN
    ALTER TABLE public.meals
      ADD CONSTRAINT meals_meal_kind_check
      CHECK (meal_kind IN ('full_meal','hydration_only'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meals_meal_kind
  ON public.meals(user_id, meal_kind, logged_at DESC);

-- 3. profiles hydration preferences (canonical table is 'profiles' per 171b
--    sleep window verification; users.* in spec was misleading).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hydration_target_ml_per_day_custom NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS hydration_counting_mode TEXT NOT NULL DEFAULT 'conservative',
  ADD COLUMN IF NOT EXISTS hydration_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hydration_notification_cadence TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='profiles_hydration_counting_mode_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_hydration_counting_mode_check
      CHECK (hydration_counting_mode IN ('conservative','adjusted'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='profiles_hydration_notification_cadence_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_hydration_notification_cadence_check
      CHECK (hydration_notification_cadence IS NULL OR hydration_notification_cadence IN ('every_2h','every_3h','every_4h','milestone_only'));
  END IF;
END $$;

-- 4. hydration_log_sessions telemetry table (20pct sampled in production;
--    metadata only; mirrors quick_log_sessions + voice_native_sessions
--    patterns from 170m + 170n).
CREATE TABLE IF NOT EXISTS public.hydration_log_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL,
  meal_id UUID REFERENCES public.meals(meal_id) ON DELETE SET NULL,
  log_surface TEXT NOT NULL
    CHECK (log_surface IN ('dashboard_widget','nutrivision_card','floating_fab','hydration_detail_view','meal_save_with_beverage')),
  volume_ml NUMERIC(10,2) NOT NULL,
  beverage_kind TEXT,
  was_quick_log BOOLEAN NOT NULL DEFAULT FALSE,
  was_voice_input BOOLEAN NOT NULL DEFAULT FALSE,
  was_deduplicated BOOLEAN NOT NULL DEFAULT FALSE,
  device_kind TEXT
    CHECK (device_kind IS NULL OR device_kind IN ('ios','android','web_desktop','web_mobile')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hydration_log_sessions_surface
  ON public.hydration_log_sessions(log_surface, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hydration_log_sessions_created_at
  ON public.hydration_log_sessions(created_at DESC);

ALTER TABLE public.hydration_log_sessions ENABLE ROW LEVEL SECURITY;
-- Service-role inserts only. No client-visible policies.

-- 5. hydration_aggregations_daily materialized view for historical
--    aggregations. Today's data uses meal_items direct queries (real-time);
--    this view supports the weekly + monthly views on
--    /wellness-analytics/hydration.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.hydration_aggregations_daily AS
SELECT
  m.user_id,
  DATE(m.logged_at AT TIME ZONE 'UTC') AS day_utc,
  COALESCE(SUM(mi.hydration_ml) FILTER (WHERE mi.hydration_source_kind = 'pure_water'), 0) AS pure_water_ml,
  COALESCE(SUM(mi.hydration_ml) FILTER (WHERE mi.hydration_source_kind = 'coffee_tea'), 0) AS coffee_tea_ml,
  COALESCE(SUM(mi.hydration_ml) FILTER (WHERE mi.hydration_source_kind IS NOT NULL AND mi.hydration_source_kind != 'pure_water'), 0) AS other_beverages_ml,
  COALESCE(SUM(mi.hydration_ml), 0) AS total_hydration_ml_adjusted,
  COUNT(DISTINCT mi.id) FILTER (WHERE mi.hydration_source_kind IS NOT NULL) AS beverage_count,
  COUNT(DISTINCT m.meal_id) FILTER (WHERE m.meal_kind = 'hydration_only') AS quick_log_count
FROM public.meals m
JOIN public.meal_items mi ON mi.meal_id = m.meal_id
WHERE mi.hydration_source_kind IS NOT NULL
GROUP BY m.user_id, DATE(m.logged_at AT TIME ZONE 'UTC');

CREATE UNIQUE INDEX IF NOT EXISTS idx_hydration_agg_user_day
  ON public.hydration_aggregations_daily(user_id, day_utc);

-- 6. 7 Helix earning event types (consumer-only per Standing Rule #8).
--    hydration_logged carries app-layer daily cap (10/day) per spec §9.6
--    + telemetry-derived enforcement.
INSERT INTO public.helix_earning_event_types
  (id, display_name, description, base_points, category, requires_consumer_tier, is_active)
VALUES
  ('hydration_logged', 'Hydration logged',
    'User logged a hydration intake event. Capped at 10 awards per day at app layer.',
    1, 'tracking', 1, true),
  ('hydration_target_reached', 'Hydration target reached',
    'User reached their daily hydration target.',
    5, 'tracking', 1, true),
  ('hydration_streak_3_days', 'Hydration 3-day streak',
    'User hit hydration target 3 days in a row.',
    3, 'tracking', 1, true),
  ('hydration_streak_7_days', 'Hydration 7-day streak',
    'User hit hydration target 7 days in a row.',
    5, 'tracking', 1, true),
  ('hydration_streak_30_days', 'Hydration 30-day streak',
    'User hit hydration target 30 days in a row.',
    10, 'tracking', 1, true),
  ('hydration_target_personalized', 'Hydration target personalized',
    'User set a custom hydration target.',
    2, 'tracking', 1, true),
  ('hydration_adjusted_counting_enabled', 'Hydration adjusted counting',
    'User opted in to adjusted (all-beverages) hydration counting.',
    1, 'tracking', 1, true)
ON CONFLICT (id) DO NOTHING;
