-- Prompt 170 NutriVision: per item meal breakdown table.
-- Each meal can have many items (the items in a single photo plate, or a
-- single item for a Quick Log meal). Persisting items is what unlocks per
-- item portion edits, food swaps, modifier chips, cooking oil selection,
-- and the future fine tune corpus on edits.
--
-- Review R4 supersession: 170a section 3.2 claimed this table already exists;
-- Observe confirmed it does NOT. Reverted to original 170 section 6.1 CREATE
-- TABLE IF NOT EXISTS form.

CREATE TABLE IF NOT EXISTS public.meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(meal_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  position INTEGER NOT NULL DEFAULT 0,
  food_name TEXT NOT NULL,
  food_language TEXT,
  cuisine_tag TEXT,
  source TEXT NOT NULL CHECK (source IN ('nutrivision','quick_log','manual','voice','barcode')),
  recognition_provider TEXT,
  recognition_confidence NUMERIC(5,4),
  bounding_box_json JSONB,
  portion_grams NUMERIC(10,2),
  portion_volume_ml NUMERIC(10,2),
  portion_estimation_method TEXT
    CHECK (portion_estimation_method IN ('lidar','arcore','reference_object','vision_inference','user_override','unknown')),
  nutrient_source TEXT
    CHECK (nutrient_source IN ('farmceutica_curated','usda_fdc','open_food_facts','vision_provider','user_entered')),
  usda_fdc_id BIGINT,
  off_barcode TEXT,
  curated_food_id UUID,
  calories_kcal NUMERIC(10,2),
  protein_g NUMERIC(10,2),
  carbs_g NUMERIC(10,2),
  fat_g NUMERIC(10,2),
  fiber_g NUMERIC(10,2),
  sugar_g NUMERIC(10,2),
  sodium_mg NUMERIC(10,2),
  cholesterol_mg NUMERIC(10,2),
  micronutrients_json JSONB,
  cooking_method TEXT,
  cooking_oil_json JSONB,
  user_modified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_items_meal_id ON public.meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_user_id ON public.meal_items(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_created_at ON public.meal_items(created_at DESC);

ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY meal_items_select_own ON public.meal_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY meal_items_insert_own ON public.meal_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY meal_items_update_own ON public.meal_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY meal_items_delete_own ON public.meal_items
  FOR DELETE USING (auth.uid() = user_id);
