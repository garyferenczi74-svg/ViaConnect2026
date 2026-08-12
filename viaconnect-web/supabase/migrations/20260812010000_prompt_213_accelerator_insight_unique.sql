-- Prompt 213: unique accelerator insights per user + product key.
-- Prevents generation/upsert from writing four identical Replenish NAD+ rows.
-- Append-only. Does not edit prior migrations.

-- ---------------------------------------------------------------------------
-- 1) Dedupe existing ultrathink_recommendations (keep best rank, then newest)
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, lower(trim(farmceutica_product))
      ORDER BY rank ASC NULLS LAST, created_at DESC NULLS LAST, id ASC
    ) AS rn
  FROM public.ultrathink_recommendations
  WHERE farmceutica_product IS NOT NULL
    AND trim(farmceutica_product) <> ''
)
DELETE FROM public.ultrathink_recommendations u
USING ranked r
WHERE u.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ultrathink_recs_user_product_key
  ON public.ultrathink_recommendations (user_id, (lower(trim(farmceutica_product))));

-- ---------------------------------------------------------------------------
-- 2) Dedupe existing recommendations (keep best priority_rank, then newest)
-- ---------------------------------------------------------------------------
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, lower(trim(product_name))
      ORDER BY priority_rank ASC NULLS LAST, created_at DESC NULLS LAST, id ASC
    ) AS rn
  FROM public.recommendations
  WHERE product_name IS NOT NULL
    AND trim(product_name) <> ''
)
DELETE FROM public.recommendations rec
USING ranked r
WHERE rec.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_recommendations_user_product_key
  ON public.recommendations (user_id, (lower(trim(product_name))));
