-- Prompt 172e Phase C: meal_items.beverage_catalog_slug append-only column.
--
-- Per spec section 6: when the user logs a beverage via the catalog driven
-- picker (Phase B), the hydration quick log route persists the catalog row
-- slug onto the inserted meal_item so the 171b caffeine engine, the 17a
-- nutrient profile, and any downstream Hannah/Kelsey audit can trace each
-- beverage back to its catalog row without re inferring from food_name +
-- hydration_source_kind. The column is nullable so the existing 170o
-- quick log buttons that pass only beverage_kind continue to insert
-- meal_items rows unchanged.
--
-- FK with ON DELETE SET NULL: if a catalog row is ever deactivated or
-- removed (rare; the catalog is append only by convention but a future
-- 172e supplement could deprecate a row), the historical meal_item
-- retains its hydration_ml + caffeine_mg + hydration_source_kind and
-- simply loses the catalog back reference. Idempotent for re runs via
-- ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.meal_items
  ADD COLUMN IF NOT EXISTS beverage_catalog_slug TEXT
  REFERENCES public.beverage_catalog(slug)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meal_items_beverage_catalog_slug
  ON public.meal_items(beverage_catalog_slug)
  WHERE beverage_catalog_slug IS NOT NULL;

COMMENT ON COLUMN public.meal_items.beverage_catalog_slug IS
  '172e Phase C: nullable back reference to beverage_catalog.slug. Populated by the hydration quick log route when the user picks via the BeveragePicker. Legacy quick log buttons leave this NULL.';
