-- Prompt 170 NutriVision: augment public.meals with NutriVision specific
-- columns. All append only. The existing source column (meal_source enum)
-- and the existing quality_score / quality_tier columns are unchanged.
--
-- Naming clarification:
--   quality_score (existing) is the per meal 0 to 100 Gordon quality score
--     computed by scoreMealForServerInsert.
--   bio_opt_delta (new) is the Bio Optimization daily aggregate change
--     attributable to THIS meal, returned by the Gordon bridge at save time.
--   bio_opt_copy (new) is the one or two sentence plain language explanation
--     that ships with the delta.
--
-- 170a section 3.6 supersession: the redundant nutrivision_meal BOOLEAN
-- column is intentionally NOT added. NutriVision rows are identified via
-- source = 'nutrivision' on the meal_source enum column.

ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS source_photo_blob_id UUID;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS recognition_provider_primary TEXT;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS recognition_provider_secondary TEXT;
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS meal_confidence NUMERIC(5,4);
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS bio_opt_delta NUMERIC(8,4);
ALTER TABLE public.meals ADD COLUMN IF NOT EXISTS bio_opt_copy TEXT;
