-- Prompt 170j §9.1: voice edit telemetry sessions (10% sampled in prod).
-- Append-only. No transcript text stored. Service-role inserts only.

CREATE TABLE IF NOT EXISTS public.voice_edit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash TEXT NOT NULL,
  meal_id UUID REFERENCES public.meals(meal_id) ON DELETE SET NULL,
  stt_provider TEXT NOT NULL
    CHECK (stt_provider IN ('web_speech_api', 'capacitor_native', 'gemini_audio', 'claude_audio')),
  stt_latency_ms INT,
  nlu_latency_ms INT,
  operations_count INT NOT NULL DEFAULT 0,
  operations_applied_count INT NOT NULL DEFAULT 0,
  operations_rejected_count INT NOT NULL DEFAULT 0,
  required_clarification BOOLEAN NOT NULL DEFAULT FALSE,
  used_quick_apply_mode BOOLEAN NOT NULL DEFAULT FALSE,
  session_outcome TEXT NOT NULL
    CHECK (session_outcome IN ('applied', 'partial_applied', 'cancelled', 'error', 'timeout')),
  error_class TEXT,
  device_kind TEXT
    CHECK (device_kind IN ('ios', 'android', 'web_desktop', 'web_mobile')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_created_at
  ON public.voice_edit_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_hash
  ON public.voice_edit_sessions(user_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_outcome
  ON public.voice_edit_sessions(session_outcome, created_at DESC);

ALTER TABLE public.voice_edit_sessions ENABLE ROW LEVEL SECURITY;
-- No client-visible policies. Service-role only.
