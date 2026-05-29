-- Prompt 170 NutriVision: server side recognition cache.
-- Keyed by (image_hash_sha256, provider) for exact match plus phash_64 for
-- near match lookup (170a section 4.1). The pHash is computed by sharp
-- (already installed) as an 8x8 DCT fingerprint that survives small
-- geometric and lighting perturbations.
--
-- Service role only. RLS enabled with no policies so client side reads and
-- writes are blocked.
--
-- Near match lookup uses Postgres 14+ bit_count on the XOR of the two
-- 64 bit fingerprints. A Hamming distance of 6 or fewer bits with a label
-- set Jaccard overlap of 0.80 or higher counts as a soft hit per
-- ultrathink residual #2.

CREATE TABLE IF NOT EXISTS public.food_recognition_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_hash_sha256 TEXT NOT NULL,
  phash_64 BIGINT,
  provider TEXT NOT NULL,
  recognition_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (image_hash_sha256, provider)
);

CREATE INDEX IF NOT EXISTS idx_food_recognition_cache_expires
  ON public.food_recognition_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_food_recognition_cache_phash
  ON public.food_recognition_cache(phash_64);

ALTER TABLE public.food_recognition_cache ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: service role only access.
