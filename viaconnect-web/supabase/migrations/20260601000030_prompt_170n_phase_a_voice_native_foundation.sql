-- Prompt 170n Phase A: Voice-Native meal logging entry path foundation.
-- Append-only. Voice transcript persistence is opt-in (default OFF) per spec
-- privacy posture. Audio is always ephemeral (never persisted regardless of
-- transcript retention setting).

-- 1. meal_source enum: add 'voice_native' value so voice-native saves can be
--    differentiated from quick_log/photo_ai/nutrivision/etc.
ALTER TYPE public.meal_source ADD VALUE IF NOT EXISTS 'voice_native';

-- 2. meals augmentation (5 cols): voice_transcript + locale + retained flag +
--    parser_version + stt_provider_used + CHECK constraint on provider.
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
  ADD COLUMN IF NOT EXISTS voice_transcript_locale TEXT,
  ADD COLUMN IF NOT EXISTS voice_transcript_retained BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS voice_native_parser_version TEXT,
  ADD COLUMN IF NOT EXISTS voice_stt_provider_used TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='meals_voice_stt_provider_used_check'
  ) THEN
    ALTER TABLE public.meals
      ADD CONSTRAINT meals_voice_stt_provider_used_check
      CHECK (voice_stt_provider_used IS NULL OR voice_stt_provider_used IN ('web_speech_api','capacitor_native','gemini_audio','claude_audio'));
  END IF;
END $$;

-- 3. meal_items augmentation (3 cols): source_transcript_span + stt_confidence
--    + combined_voice_confidence. Distinct from 170m's source_text_span which
--    captures typed text spans.
ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS source_transcript_span TEXT,
  ADD COLUMN IF NOT EXISTS stt_confidence_for_span NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS combined_voice_confidence NUMERIC(5,4);

-- 4. voice_native_sessions telemetry (20pct sampled in production; metadata
--    only; NEVER raw transcript or audio).
CREATE TABLE IF NOT EXISTS public.voice_native_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL,
  meal_id UUID REFERENCES public.meals(meal_id) ON DELETE SET NULL,
  stt_provider TEXT NOT NULL
    CHECK (stt_provider IN ('web_speech_api','capacitor_native','gemini_audio','claude_audio')),
  stt_latency_ms INT,
  stt_confidence_avg NUMERIC(5,4),
  audio_duration_ms INT,
  audio_duration_bucket TEXT
    CHECK (audio_duration_bucket IS NULL OR audio_duration_bucket IN ('under_3s','3_to_10s','10_to_30s','30_to_60s','over_60s')),
  nlu_latency_ms INT,
  nlu_provider TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  parsed_items_count INT NOT NULL,
  parser_confidence_avg NUMERIC(5,4),
  combined_confidence_avg NUMERIC(5,4),
  needed_clarification BOOLEAN NOT NULL DEFAULT FALSE,
  clarification_rounds INT NOT NULL DEFAULT 0,
  triggered_restaurant_context BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_recipe_match BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_branded_product_lookup BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_multi_meal_split BOOLEAN NOT NULL DEFAULT FALSE,
  triggered_dietary_restriction_flag BOOLEAN NOT NULL DEFAULT FALSE,
  fillers_removed_count INT NOT NULL DEFAULT 0,
  restarts_resolved_count INT NOT NULL DEFAULT 0,
  user_edited_after_parse BOOLEAN NOT NULL DEFAULT FALSE,
  used_quick_apply_mode BOOLEAN NOT NULL DEFAULT FALSE,
  transcript_retention_was_on BOOLEAN NOT NULL DEFAULT FALSE,
  session_outcome TEXT NOT NULL
    CHECK (session_outcome IN ('saved','cancelled','description_re_recorded','clarification_abandoned','parse_failed','timeout','rate_limited')),
  device_kind TEXT
    CHECK (device_kind IS NULL OR device_kind IN ('ios','android','web_desktop','web_mobile')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_native_sessions_created_at
  ON public.voice_native_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_native_sessions_parser_version
  ON public.voice_native_sessions(parser_version, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_native_sessions_audio_bucket
  ON public.voice_native_sessions(audio_duration_bucket, created_at DESC);

ALTER TABLE public.voice_native_sessions ENABLE ROW LEVEL SECURITY;
-- Service-role inserts only. No client-visible policies.

-- 5. Helix earning events (consumer-only per Standing Rule #8). Voice points
--    parity with 170m quick_log_meal_saved (4 pts) and 170l barcode_meal_logged
--    (4 pts); photo capture gets 5 pts for the additional act of pointing the
--    camera and capturing.
INSERT INTO public.helix_earning_event_types
  (id, display_name, description, base_points, category, requires_consumer_tier, is_active)
VALUES
  ('voice_native_entry_started', 'Voice Log opened',
    'User opened the voice-native entry capture overlay.',
    1, 'tracking', 1, true),
  ('voice_native_meal_saved', 'Voice meal saved',
    'User saved a meal via voice-native entry.',
    4, 'tracking', 1, true),
  ('voice_native_quick_apply_used', 'Voice Quick Apply used',
    'User saved a high-confidence voice-native meal via Quick Apply Mode.',
    2, 'tracking', 1, true),
  ('voice_native_transcript_retention_enabled', 'Voice transcript retention opted in',
    'User opted in to voice transcript retention in Settings.',
    1, 'tracking', 1, true),
  ('voice_native_clarification_resolved', 'Voice clarification resolved',
    'User resolved a voice-native parser clarification question.',
    1, 'tracking', 1, true),
  ('voice_native_re_recorded', 'Voice re-recorded',
    'User re-recorded the voice description after first attempt.',
    1, 'tracking', 1, true)
ON CONFLICT (id) DO NOTHING;
