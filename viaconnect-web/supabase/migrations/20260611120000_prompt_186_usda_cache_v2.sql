-- Prompt 186: usda_food_cache v2 for the nutrition engine accuracy repair.
--
-- 1. extraction_version: rows written by the pre-186 extractor carried
--    first-hit references (avocado matched "Oil, avocado", apple matched
--    "Croissants, apple") and zero-coerced nutrients (Foundation foods cached
--    at 0 kcal). The client only trusts version 2 rows.
-- 2. data_type: the FDC dataType of the matched food (Foundation, SR Legacy,
--    Survey (FNDDS), Branded), recorded for the per-item structured log.
-- 3. food_portions: slimmed FDC foodPortions for the portionToGrams resolver
--    (household measures with measured gram weights).
-- 4. sodium_per_100g + cholesterol_per_100g: canonical map ids 1093 and 1253.
--
-- The DELETE purges every poisoned v1 row. This table is a pure 30-day cache
-- of a public reference API; clearing it costs one re-fetch per food.

ALTER TABLE public.usda_food_cache
  ADD COLUMN IF NOT EXISTS extraction_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS data_type TEXT,
  ADD COLUMN IF NOT EXISTS food_portions JSONB,
  ADD COLUMN IF NOT EXISTS sodium_per_100g NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS cholesterol_per_100g NUMERIC(8,2);

DELETE FROM public.usda_food_cache;
