-- Prompt 170j Phase 1c-3: voice preferences columns on user_nutrivision_settings.
-- Mirrors the localStorage VoicePreferences shape from Phase 1c-2 so the
-- Settings section can persist to Supabase. Defaults match the client defaults.
-- Append-only column additions.

ALTER TABLE public.user_nutrivision_settings
  ADD COLUMN IF NOT EXISTS voice_editing_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.user_nutrivision_settings
  ADD COLUMN IF NOT EXISTS voice_quick_apply_mode BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.user_nutrivision_settings
  ADD COLUMN IF NOT EXISTS voice_feedback_chimes BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.user_nutrivision_settings
  ADD COLUMN IF NOT EXISTS voice_push_to_talk_default BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_nutrivision_settings.voice_editing_enabled
  IS 'Prompt 170j §11.7: when FALSE, hides the Voice FAB on the result review screen.';
COMMENT ON COLUMN public.user_nutrivision_settings.voice_quick_apply_mode
  IS 'Prompt 170j §6.8: when TRUE, high-confidence operations apply without preview. Opt-in.';
COMMENT ON COLUMN public.user_nutrivision_settings.voice_feedback_chimes
  IS 'Prompt 170j §7.3: when TRUE, plays auditory chimes at capture start and end.';
COMMENT ON COLUMN public.user_nutrivision_settings.voice_push_to_talk_default
  IS 'Prompt 170j §6.1: when TRUE, the FAB defaults to push-to-talk vs tap-to-start.';
