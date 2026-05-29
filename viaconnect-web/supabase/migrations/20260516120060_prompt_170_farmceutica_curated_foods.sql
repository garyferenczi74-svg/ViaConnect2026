-- Prompt 170 NutriVision: Farmceutica curated foods table.
-- First in the nutrient resolution cascade per 170 section 2.2 step 6:
-- Farmceutica curated -> USDA FoodData Central -> Open Food Facts ->
-- vision provider built in nutrition as last resort.
--
-- Seed data ships in Prompt 170b Workstream A (Gordon owned). This
-- migration creates only the empty table and its indexes.

CREATE TABLE IF NOT EXISTS public.farmceutica_curated_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cuisine_tag TEXT,
  density_g_per_ml NUMERIC(8,4),
  per_100g_kcal NUMERIC(10,2),
  per_100g_protein_g NUMERIC(10,2),
  per_100g_carbs_g NUMERIC(10,2),
  per_100g_fat_g NUMERIC(10,2),
  per_100g_fiber_g NUMERIC(10,2),
  per_100g_sugar_g NUMERIC(10,2),
  per_100g_sodium_mg NUMERIC(10,2),
  per_100g_cholesterol_mg NUMERIC(10,2),
  micronutrients_per_100g_json JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farmceutica_curated_foods_name
  ON public.farmceutica_curated_foods USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_farmceutica_curated_foods_cuisine
  ON public.farmceutica_curated_foods(cuisine_tag);

-- Read access for any authenticated user (lookup endpoint queries this table);
-- writes are service role only.
ALTER TABLE public.farmceutica_curated_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY farmceutica_curated_foods_select_authenticated
  ON public.farmceutica_curated_foods
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
