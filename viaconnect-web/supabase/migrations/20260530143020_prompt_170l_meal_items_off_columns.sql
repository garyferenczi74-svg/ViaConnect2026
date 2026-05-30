-- Prompt 170l Phase 1a: meal_items augmentation with OFF-derived columns.
-- 7 new columns surface OFF metadata at the item level for downstream
-- analytics (170h Nova/NutriScore signals) and practitioner redaction (170i).
-- All nullable except user_overrode_macros (default false); legacy items unaffected.

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS off_product_name text;

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS off_brand text;

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS off_serving_size_g numeric;

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS off_completeness_score numeric;

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS off_nova_group int;

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS off_nutrition_grade_fr text;

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS user_overrode_macros boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.meal_items.off_nova_group IS
  '170l: 1-4 Nova food processing classification from OFF';
COMMENT ON COLUMN public.meal_items.off_nutrition_grade_fr IS
  '170l: NutriScore A-E grade from OFF';
COMMENT ON COLUMN public.meal_items.user_overrode_macros IS
  '170l: true if user edited macros after OFF prefill; OFF data quality signal';
