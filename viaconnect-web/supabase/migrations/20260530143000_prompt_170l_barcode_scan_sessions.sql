-- Prompt 170l Phase 1a: barcode scan telemetry.
-- 10% sampled in prod (BARCODE_TELEMETRY_SAMPLE_RATE = 0.10 from Gate 4).
-- barcode_value is service-role-only access via RLS.
-- FK to meals(meal_id) per 170j hotfix lesson (PK is meal_id, not id).

CREATE TABLE IF NOT EXISTS public.barcode_scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash text NOT NULL,
  meal_id uuid REFERENCES public.meals(meal_id) ON DELETE SET NULL,
  barcode_value text NOT NULL,
  lookup_outcome text NOT NULL CHECK (lookup_outcome IN (
    'cache_hit','off_hit','off_miss','error','manual_entry','fallback_to_photo'
  )),
  cache_hit boolean NOT NULL DEFAULT false,
  off_completeness_score numeric,
  off_nova_group int,
  off_nutrition_grade_fr text,
  user_overrode_macros boolean NOT NULL DEFAULT false,
  manual_entry boolean NOT NULL DEFAULT false,
  multi_product_position int,
  decoder_used text CHECK (decoder_used IN ('html5_qrcode','mlkit_native','manual')),
  decoder_latency_ms int,
  lookup_latency_ms int,
  device_kind text CHECK (device_kind IN ('ios_native','android_native','web')),
  session_outcome text NOT NULL CHECK (session_outcome IN ('saved','abandoned','error')),
  error_class text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS barcode_scan_sessions_user_hash_idx
  ON public.barcode_scan_sessions (user_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS barcode_scan_sessions_meal_id_idx
  ON public.barcode_scan_sessions (meal_id) WHERE meal_id IS NOT NULL;

ALTER TABLE public.barcode_scan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY barcode_scan_sessions_service_role_all
  ON public.barcode_scan_sessions
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.barcode_scan_sessions IS
  '170l telemetry. 10% sampled. barcode_value is service-role-only.';
