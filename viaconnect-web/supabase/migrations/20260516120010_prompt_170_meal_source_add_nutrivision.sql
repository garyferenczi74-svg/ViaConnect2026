-- Prompt 170 NutriVision: append 'nutrivision' value to the meal_source enum.
-- Append only safe. Existing values quick_log, full_manual, photo_ai, tracker_api,
-- wearable_cgm remain unchanged. The legacy photo_ai value stays in place; rows
-- carrying it surface as NutriVision in the UI via an application layer alias
-- and are migrated lazily on read to 'nutrivision' at next save.

ALTER TYPE public.meal_source ADD VALUE IF NOT EXISTS 'nutrivision';
