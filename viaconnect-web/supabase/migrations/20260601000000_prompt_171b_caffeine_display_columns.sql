-- Prompt 171b Phase 1: caffeine + portion display columns on meals + meal_items.
-- Consolidates the 170m filing §7.3 meal_items.caffeine_mg ALTER with 171b's
-- portion_display additions. 170m migration (when 170m builds) uses ADD COLUMN
-- IF NOT EXISTS so no conflict.

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS caffeine_mg NUMERIC(6,2);

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS portion_display_unit TEXT;

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS portion_display_value NUMERIC(10,2);

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS total_caffeine_mg NUMERIC(7,2);

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS portion_display_unit TEXT;

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS portion_display_value NUMERIC(10,2);

COMMENT ON COLUMN public.meal_items.caffeine_mg IS
  '171b Phase 1: per-item caffeine in milligrams; populated by Quick Log pill panel manual entry, 170l shipped OFF cache extraction when present, or 170m Haiku Rule 3.9 inference when 170m ships';
COMMENT ON COLUMN public.meal_items.portion_display_unit IS
  '171b Phase 1: per-item display unit (mg, g, oz, ml) for UI rendering';
COMMENT ON COLUMN public.meal_items.portion_display_value IS
  '171b Phase 1: per-item display value for UI rendering';

COMMENT ON COLUMN public.meals.total_caffeine_mg IS
  '171b Phase 1: meal-level caffeine roll-up (sum of meal_items.caffeine_mg across items)';
COMMENT ON COLUMN public.meals.portion_display_unit IS
  '171b Phase 1: meal-level display unit shortcut for single-item meals';
COMMENT ON COLUMN public.meals.portion_display_value IS
  '171b Phase 1: meal-level display value shortcut for single-item meals';
