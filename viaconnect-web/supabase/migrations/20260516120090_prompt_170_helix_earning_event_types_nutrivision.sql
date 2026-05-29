-- Prompt 170 NutriVision: register the 4 new Helix earning event types.
-- Schema verified in Observe: helix_earning_event_types has columns
-- (id, base_points, category, requires_consumer_tier, is_active, description,
-- frequency_limit, created_at). 170a section 3.3 supersedes 170 section 6.7
-- which was written against a fictional helix_event_types table.
--
-- Idempotent: ON CONFLICT (id) DO NOTHING so re-running is safe.
--
-- requires_consumer_tier values match the existing convention used by other
-- nutrition events. Consumer portal only per the Helix isolation rule in
-- 170 section 17.

INSERT INTO public.helix_earning_event_types
  (id, display_name, base_points, category, requires_consumer_tier, is_active, description)
VALUES
  ('nutrivision_meal_logged', 'NutriVision Meal Logged', 5, 'tracking', 1, true,
    'User logged a meal using the NutriVision pill tab on Nutrition Log.'),
  ('nutrivision_high_confidence', 'High Confidence NutriVision Meal', 2, 'tracking', 1, true,
    'NutriVision meal logged with meal confidence at or above 0.85.'),
  ('nutrivision_user_refined', 'Refined NutriVision Meal', 1, 'tracking', 1, true,
    'User edited at least one item on a NutriVision meal before saving.'),
  ('corpus_contribution', 'Contributed to Accuracy Research', 1, 'engagement', 1, true,
    'User opted in to contribute the meal photo to the ViaConnect corpus.')
ON CONFLICT (id) DO NOTHING;
