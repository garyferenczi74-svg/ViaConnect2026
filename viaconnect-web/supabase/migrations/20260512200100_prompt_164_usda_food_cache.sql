-- Prompt #164: cache USDA FoodData Central lookups. The most important
-- optimization in the new stack: after 2 weeks of real use, ~80% of common
-- foods will be cached and Gemini-free-tier-call-per-meal drops toward 1.
--
-- TTL is 30 days. USDA data rarely changes; a refresh window protects against
-- the rare correction without making us re-fetch eggs every week.

CREATE TABLE IF NOT EXISTS public.usda_food_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_normalized TEXT NOT NULL,
  food_name TEXT NOT NULL,
  fdc_id INTEGER,
  serving_size_g NUMERIC(8,2),
  calories_per_100g NUMERIC(8,2),
  protein_per_100g NUMERIC(8,2),
  carbs_per_100g NUMERIC(8,2),
  total_fat_per_100g NUMERIC(8,2),
  saturated_fat_per_100g NUMERIC(8,2),
  trans_fat_per_100g NUMERIC(8,2),
  omega3_per_100g NUMERIC(8,2),
  sugar_per_100g NUMERIC(8,2),
  fiber_per_100g NUMERIC(8,2),
  raw_payload JSONB,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE UNIQUE INDEX IF NOT EXISTS usda_food_cache_query_idx
  ON public.usda_food_cache (query_normalized);
CREATE INDEX IF NOT EXISTS usda_food_cache_expires_idx
  ON public.usda_food_cache (expires_at);

ALTER TABLE public.usda_food_cache ENABLE ROW LEVEL SECURITY;

-- No user-facing policies. Reads + writes go through createAdminClient
-- (service-role bypasses RLS). RLS is on so the Supabase advisor stays happy.
