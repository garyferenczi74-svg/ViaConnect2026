-- Prompt 184b: Fat Field Consolidation and Fat Source Health-Value System.
-- Append-only. Adds the fat_sources reference table (Gordon-owned fatty-acid
-- profiles, Hannah-owned health tiers) and the meals columns that link an entry
-- to a fat source and store the resolved breakdown plus fat-quality
-- contribution. The legacy good_fat / healthy_fat handling is removed in code
-- bindings only; the existing meals.fat_healthy_g column stays (append-only,
-- already nullable per 177d) and is left NULL going forward.

CREATE TABLE IF NOT EXISTS public.fat_sources (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    TEXT NOT NULL UNIQUE,
  display_name            TEXT NOT NULL,
  -- Fatty-acid profile per gram of fat (owned by Gordon). For a known source
  -- saturated + monounsaturated + polyunsaturated + trans sum to about 1.0;
  -- omega3 and omega6 are subsets of polyunsaturated. All nullable so the
  -- not_specified fallback carries NULL (unknown), never a coerced 0.
  saturated_g_per_g       NUMERIC(4,3),
  monounsaturated_g_per_g NUMERIC(4,3),
  polyunsaturated_g_per_g NUMERIC(4,3),
  trans_g_per_g           NUMERIC(4,3),
  omega3_g_per_g          NUMERIC(4,3),
  omega6_g_per_g          NUMERIC(4,3),
  -- Hannah-owned consumer health framing.
  health_tier             TEXT CHECK (health_tier IN ('favorable','moderate','limit','neutral')),
  -- Gordon-owned fat-quality value (0 to 100) fed into the Nutrition Score and
  -- BOS. Seeded with a tier-aligned v1; the per-profile refinement is the
  -- Gordon compute step (a later append-only migration may update it).
  fat_quality_value       NUMERIC(5,2) CHECK (fat_quality_value IS NULL OR (fat_quality_value >= 0 AND fat_quality_value <= 100)),
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fat_sources_active_sort_idx
  ON public.fat_sources (is_active, sort_order);

ALTER TABLE public.fat_sources ENABLE ROW LEVEL SECURITY;

-- Reference data: any authenticated user may read; writes are service-role only.
DROP POLICY IF EXISTS fat_sources_authenticated_read ON public.fat_sources;
CREATE POLICY fat_sources_authenticated_read
  ON public.fat_sources FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.fat_sources TO authenticated;

-- Keep updated_at fresh when Gordon refines the values in a later migration or job.
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fat_sources_updated_at ON public.fat_sources;
CREATE TRIGGER trg_fat_sources_updated_at
  BEFORE UPDATE ON public.fat_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Meals entry link plus resolved breakdown. Nullable by design: when the source
-- is unspecified and cannot be inferred, all three stay NULL (never 0), carrying
-- the estimated/confidence marker rather than a coerced zero.
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS fat_source_id UUID REFERENCES public.fat_sources(id),
  ADD COLUMN IF NOT EXISTS fat_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS fat_quality_contribution NUMERIC(6,2);

CREATE INDEX IF NOT EXISTS meals_fat_source_idx
  ON public.meals (fat_source_id) WHERE fat_source_id IS NOT NULL;

-- Seed. Fatty-acid fractions are well-established nutritional values (Gordon).
-- health_tier is Hannah-curated framing; fat_quality_value here is the v1
-- tier-aligned baseline (favorable about 85, moderate about 60, limit about 35).
INSERT INTO public.fat_sources
  (slug, display_name, saturated_g_per_g, monounsaturated_g_per_g, polyunsaturated_g_per_g, trans_g_per_g, omega3_g_per_g, omega6_g_per_g, health_tier, fat_quality_value, sort_order)
VALUES
  ('extra_virgin_olive_oil','Extra virgin olive oil',0.140,0.730,0.110,0.000,0.008,0.098,'favorable',88,10),
  ('olive_oil','Olive oil',0.140,0.730,0.110,0.000,0.008,0.098,'favorable',85,20),
  ('avocado_oil','Avocado oil',0.120,0.710,0.130,0.000,0.010,0.120,'favorable',85,30),
  ('canola_oil','Canola oil',0.070,0.630,0.290,0.004,0.092,0.190,'favorable',82,40),
  ('flaxseed_oil','Flaxseed oil',0.090,0.180,0.680,0.000,0.530,0.140,'favorable',84,50),
  ('peanut_oil','Peanut oil',0.170,0.460,0.320,0.000,0.000,0.320,'moderate',62,60),
  ('sesame_oil','Sesame oil',0.140,0.400,0.420,0.000,0.004,0.410,'moderate',62,70),
  ('sunflower_oil','Sunflower oil',0.100,0.200,0.660,0.000,0.000,0.660,'moderate',60,80),
  ('soybean_vegetable_oil','Soybean or vegetable oil',0.150,0.230,0.580,0.010,0.070,0.510,'moderate',58,90),
  ('margarine','Margarine',0.160,0.390,0.390,0.020,0.020,0.300,'moderate',55,100),
  -- MCT oil is tiered moderate (not limit) despite about 0.97 saturated: the
  -- medium-chain (C8/C10) fats have a distinct metabolic pathway. Hannah-owned
  -- tier; rationale per the Gordon 184b profile review.
  ('mct_oil','MCT oil',0.970,0.000,0.000,0.000,0.000,0.000,'moderate',55,110),
  ('lard','Lard',0.390,0.450,0.110,0.000,0.010,0.100,'limit',38,120),
  ('palm_oil','Palm oil',0.490,0.370,0.100,0.000,0.002,0.096,'limit',35,130),
  ('beef_tallow','Beef tallow',0.500,0.420,0.040,0.040,0.006,0.032,'limit',33,140),
  ('ghee','Ghee',0.620,0.290,0.040,0.040,0.015,0.022,'limit',32,150),
  ('butter','Butter',0.630,0.260,0.040,0.030,0.005,0.022,'limit',32,160),
  ('coconut_oil','Coconut oil',0.870,0.060,0.020,0.000,0.000,0.018,'limit',35,170)
ON CONFLICT (slug) DO NOTHING;

-- Default fallback: unspecified source. NULL profile means unknown/estimated,
-- never coerced to 0. Neutral tier, no quality value.
INSERT INTO public.fat_sources
  (slug, display_name, saturated_g_per_g, monounsaturated_g_per_g, polyunsaturated_g_per_g, trans_g_per_g, omega3_g_per_g, omega6_g_per_g, health_tier, fat_quality_value, sort_order)
VALUES
  ('not_specified','Not specified',NULL,NULL,NULL,NULL,NULL,NULL,'neutral',NULL,999)
ON CONFLICT (slug) DO NOTHING;
