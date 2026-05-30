-- Prompt 170l Phase 1a: 3 barcode preference toggles per Hannah's §11.9.
-- Defaults per Gate 3 (Hannah verbatim): quality ON, audio chime OFF, haptic ON.

ALTER TABLE public.user_nutrivision_settings
  ADD COLUMN IF NOT EXISTS barcode_quality_indicators boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_nutrivision_settings
  ADD COLUMN IF NOT EXISTS barcode_audio_chime boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_nutrivision_settings
  ADD COLUMN IF NOT EXISTS barcode_haptic_feedback boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_nutrivision_settings.barcode_quality_indicators IS
  '170l Hannah §11.9: Nova / NutriScore / Eco-Score chips shown on product confirmation. ON by default with sub-label "These are informational, not recommendations."';
COMMENT ON COLUMN public.user_nutrivision_settings.barcode_audio_chime IS
  '170l Hannah §11.9: audio confirmation on barcode detection. OFF by default (public-space considerate).';
COMMENT ON COLUMN public.user_nutrivision_settings.barcode_haptic_feedback IS
  '170l Hannah §11.9: haptic vibration on barcode detection. ON by default (accessibility-positive).';
