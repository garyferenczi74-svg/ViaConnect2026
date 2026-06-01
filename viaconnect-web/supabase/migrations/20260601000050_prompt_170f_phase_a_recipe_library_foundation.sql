-- Prompt 170f Phase A: Recipe Library + Suggestion Engine Source foundation.
-- Append-only. 5 new tables + 1 additive column on meals.
-- nutrition_photo_jobs.analyze_kind extension (spec §11.2) intentionally
-- omitted per pre-build issue #8: nutrition_photo_jobs is phantom in live
-- Supabase per 170m §11.1 + 170n + 170o experience; bulk template seeding
-- is a service-role offline script not a job model row.

-- 1. recipes (user-owned saved recipes)
CREATE TABLE IF NOT EXISTS public.recipes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  servings        INTEGER NOT NULL DEFAULT 1 CHECK (servings >= 1),
  photo_url       TEXT,
  source_kind     TEXT NOT NULL CHECK (source_kind IN (
                    'manual', 'from_meal', 'from_photo_ai',
                    'from_public_template', 'from_meal_plan')),
  source_ref      UUID,
  cuisine_tags    TEXT[] NOT NULL DEFAULT '{}',
  diet_tags       TEXT[] NOT NULL DEFAULT '{}',
  meal_type_tags  TEXT[] NOT NULL DEFAULT '{}',
  prep_minutes    INTEGER CHECK (prep_minutes IS NULL OR prep_minutes >= 0),
  total_calories  NUMERIC,
  total_protein_g NUMERIC,
  total_carbs_g   NUMERIC,
  total_fat_g     NUMERIC,
  total_sat_fat_g NUMERIC,
  total_fiber_g   NUMERIC,
  total_sugar_g   NUMERIC,
  total_sodium_mg NUMERIC,
  allergen_flags  TEXT[] NOT NULL DEFAULT '{}',
  last_logged_at  TIMESTAMPTZ,
  log_count       INTEGER NOT NULL DEFAULT 0,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_user
  ON public.recipes(user_id) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_recipes_user_lastlogged
  ON public.recipes(user_id, last_logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_diet_tags
  ON public.recipes USING GIN (diet_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_tags
  ON public.recipes USING GIN (cuisine_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_allergen_flags
  ON public.recipes USING GIN (allergen_flags);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipes_owner_all" ON public.recipes;
CREATE POLICY "recipes_owner_all"
  ON public.recipes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS recipes_updated_at ON public.recipes;
CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. recipe_ingredients
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id          UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  position           INTEGER NOT NULL DEFAULT 0,
  raw_name           TEXT NOT NULL,
  canonical_name     TEXT,
  quantity           NUMERIC,
  unit               TEXT,
  grams_equivalent   NUMERIC,
  match_source       TEXT CHECK (match_source IN ('cascade','curated','off_cache','unmatched')),
  match_ref          TEXT,
  calories           NUMERIC,
  protein_g          NUMERIC,
  carbs_g            NUMERIC,
  fat_g              NUMERIC,
  sat_fat_g          NUMERIC,
  fiber_g            NUMERIC,
  sugar_g            NUMERIC,
  sodium_mg          NUMERIC,
  allergen_flags     TEXT[] NOT NULL DEFAULT '{}',
  is_optional        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe
  ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_canonical
  ON public.recipe_ingredients(canonical_name);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe_ingredients_owner_all" ON public.recipe_ingredients;
CREATE POLICY "recipe_ingredients_owner_all"
  ON public.recipe_ingredients FOR ALL
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = auth.uid()));

-- 3. recipe_steps
CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe
  ON public.recipe_steps(recipe_id, position);

ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recipe_steps_owner_all" ON public.recipe_steps;
CREATE POLICY "recipe_steps_owner_all"
  ON public.recipe_steps FOR ALL
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_steps.recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_steps.recipe_id AND r.user_id = auth.uid()));

-- 4. recipe_public_templates (cold-start corpus; service-role writes only)
CREATE TABLE IF NOT EXISTS public.recipe_public_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  servings        INTEGER NOT NULL DEFAULT 1 CHECK (servings >= 1),
  photo_url       TEXT,
  cuisine_tags    TEXT[] NOT NULL DEFAULT '{}',
  diet_tags       TEXT[] NOT NULL DEFAULT '{}',
  meal_type_tags  TEXT[] NOT NULL DEFAULT '{}',
  prep_minutes    INTEGER,
  ingredients     JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps           JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_calories  NUMERIC,
  total_protein_g NUMERIC,
  total_carbs_g   NUMERIC,
  total_fat_g     NUMERIC,
  total_sat_fat_g NUMERIC,
  total_fiber_g   NUMERIC,
  total_sugar_g   NUMERIC,
  total_sodium_mg NUMERIC,
  allergen_flags  TEXT[] NOT NULL DEFAULT '{}',
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  curated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_templates_published
  ON public.recipe_public_templates(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_public_templates_diet
  ON public.recipe_public_templates USING GIN (diet_tags);
CREATE INDEX IF NOT EXISTS idx_public_templates_cuisine
  ON public.recipe_public_templates USING GIN (cuisine_tags);

ALTER TABLE public.recipe_public_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_templates_read_all_authenticated" ON public.recipe_public_templates;
CREATE POLICY "public_templates_read_all_authenticated"
  ON public.recipe_public_templates FOR SELECT
  USING (auth.role() = 'authenticated' AND is_published = TRUE);

-- 5. recipe_suggestion_events (telemetry; consumer-only RLS)
CREATE TABLE IF NOT EXISTS public.recipe_suggestion_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id     UUID,
  template_id   UUID,
  surface       TEXT NOT NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN ('viewed','tapped','logged_within_48h')),
  source_corpus TEXT NOT NULL CHECK (source_corpus IN ('saved','public_template')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestion_events_user
  ON public.recipe_suggestion_events(user_id, created_at DESC);

ALTER TABLE public.recipe_suggestion_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suggestion_events_owner_all" ON public.recipe_suggestion_events;
CREATE POLICY "suggestion_events_owner_all"
  ON public.recipe_suggestion_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. meals.recipe_id additive column (per spec §4 + §17 item 1)
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meals_recipe_id
  ON public.meals(recipe_id) WHERE recipe_id IS NOT NULL;
