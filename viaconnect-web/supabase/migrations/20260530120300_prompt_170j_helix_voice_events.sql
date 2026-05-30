-- Prompt 170j §9.5: four Helix event types for voice editing engagement.
-- Consumer-portal only per Standing Rule #8.

INSERT INTO public.helix_earning_event_types
  (id, display_name, base_points, category, requires_consumer_tier, is_active, description)
VALUES
  (
    'voice_edit_session_started',
    'Started a Voice Edit Session',
    1,
    'engagement',
    1,
    true,
    'User started a voice edit session on the result review screen.'
  ),
  (
    'voice_edit_operation_applied',
    'Applied a Voice Edit',
    1,
    'engagement',
    1,
    true,
    'User applied a voice edit operation to a meal draft.'
  ),
  (
    'voice_meal_saved',
    'Saved a Voice-Edited Meal',
    2,
    'engagement',
    1,
    true,
    'User saved a meal that had at least one voice-applied edit. Gold-standard engagement metric for voice.'
  ),
  (
    'quick_apply_mode_enabled',
    'Enabled Quick Apply Mode',
    2,
    'engagement',
    1,
    true,
    'User opted in to Quick Apply Mode in Settings, skipping preview for high-confidence operations.'
  )
ON CONFLICT (id) DO NOTHING;
