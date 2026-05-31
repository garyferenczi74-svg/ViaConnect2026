-- Prompt 170m Phase A: Quick Log text-native entry path foundation.
-- Append-only. nutrition_photo_jobs is a phantom table per spec §11.1;
-- the analyze_kind extension is moot. Differentiator is meals.source='quick_log'
-- (enum value already present). caffeine_mg + portion_display_unit/value
-- already shipped via 171b Phase 1 migration.

-- 1. meals augmentation (4 cols: text_input + locale + parser_version + repeated_from_meal_id)
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS text_input TEXT,
  ADD COLUMN IF NOT EXISTS text_input_locale TEXT,
  ADD COLUMN IF NOT EXISTS quick_log_parser_version TEXT,
  ADD COLUMN IF NOT EXISTS repeated_from_meal_id UUID REFERENCES public.meals(meal_id) ON DELETE SET NULL;

-- 2. meal_items augmentation (3 cols: source_text_span + parsed_portion_grams + entry_modality_hint)
ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS source_text_span TEXT,
  ADD COLUMN IF NOT EXISTS parsed_portion_grams NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS entry_modality_hint TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='meal_items_entry_modality_hint_check'
  ) THEN
    ALTER TABLE public.meal_items
      ADD CONSTRAINT meal_items_entry_modality_hint_check
      CHECK (entry_modality_hint IS NULL OR entry_modality_hint IN ('photo','barcode','quick_log_text','voice_native','voice_edit','recipe_match','restaurant_chain'));
  END IF;
END $$;

-- 3. quick_log_sessions telemetry table (20% sampled in production; metadata only, NEVER raw text)
CREATE TABLE IF NOT EXISTS public.quick_log_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL,
  meal_id UUID REFERENCES public.meals(meal_id) ON DELETE SET NULL,
  text_input_length INT NOT NULL,
  nlu_latency_ms INT,
  nlu_provider TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  parsed_items_count INT NOT NULL,
  parser_confidence_avg NUMERIC(5,4),
  needed_clarification BOOLEAN NOT NULL DEFAULT FALSE,
  clarification_rounds INT NOT NULL DEFAULT 0,
  triggered_restaurant_context BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_recipe_match BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_branded_product_lookup BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_multi_meal_split BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_dietary_restriction_flag BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_caffeine_inference BOOLEAN NOT NULL DEFAULT FALSE,
  user_edited_after_parse BOOLEAN NOT NULL DEFAULT FALSE,
  used_repeat_from_recent BOOLEAN NOT NULL DEFAULT FALSE,
  session_outcome TEXT NOT NULL
    CHECK (session_outcome IN ('saved','cancelled','description_re_edited','clarification_abandoned','parse_failed','timeout','rate_limited')),
  device_kind TEXT
    CHECK (device_kind IS NULL OR device_kind IN ('ios','android','web_desktop','web_mobile')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quick_log_sessions_created_at
  ON public.quick_log_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_log_sessions_parser_version
  ON public.quick_log_sessions(parser_version, created_at DESC);

ALTER TABLE public.quick_log_sessions ENABLE ROW LEVEL SECURITY;
-- Service-role inserts only. No client-visible policies.

-- 4. 5 Helix earning event types (consumer-only per Standing Rule #8).
-- category='tracking' matches the nutrivision_*/quick_log_* family precedent.
INSERT INTO public.helix_earning_event_types
  (id, display_name, description, base_points, category, requires_consumer_tier, is_active)
VALUES
  ('quick_log_text_input_started', 'Quick Log opened',
    'User opened the Quick Log text input modal.',
    1, 'tracking', 1, true),
  ('quick_log_meal_saved', 'Quick Log meal saved',
    'User saved a meal via Quick Log text-native entry.',
    4, 'tracking', 1, true),
  ('quick_log_recent_repeat_tapped', 'Quick Log repeated',
    'User one-tap repeated a Quick Log meal from the Recent row.',
    2, 'tracking', 1, true),
  ('quick_log_clarification_resolved', 'Quick Log clarification resolved',
    'User resolved a Quick Log parser clarification question.',
    1, 'tracking', 1, true),
  ('quick_log_description_re_edited', 'Quick Log re-edited',
    'User returned to re-edit a Quick Log description.',
    1, 'tracking', 1, true)
ON CONFLICT (id) DO NOTHING;
