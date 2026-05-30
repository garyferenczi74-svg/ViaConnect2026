-- Prompt 170l Phase 1a: Open Food Facts product cache with stale-while-revalidate.
-- 7-day TTL refreshed via nightly Edge Function (Phase 1b).
-- 90-day cold-purge of rows never re-hit.
-- Stores selective field subset per spec §3.4 size mitigation.

CREATE TABLE IF NOT EXISTS public.off_product_cache (
  barcode text PRIMARY KEY,
  product_name text,
  brands text,
  nutriments jsonb,
  image_url text,
  nutriscore_grade text,
  nova_group int,
  ecoscore_grade text,
  ingredients_text text,
  allergens_tags text[],
  serving_size text,
  completeness numeric,
  cached_at timestamptz NOT NULL DEFAULT now(),
  revalidated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  last_hit_at timestamptz NOT NULL DEFAULT now(),
  hit_count int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS off_product_cache_expires_at_idx
  ON public.off_product_cache (expires_at);
CREATE INDEX IF NOT EXISTS off_product_cache_last_hit_at_idx
  ON public.off_product_cache (last_hit_at);

ALTER TABLE public.off_product_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY off_product_cache_service_role_all
  ON public.off_product_cache
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.off_product_cache IS
  '170l OFF cache. 7-day TTL stale-while-revalidate. 90-day cold purge.';
