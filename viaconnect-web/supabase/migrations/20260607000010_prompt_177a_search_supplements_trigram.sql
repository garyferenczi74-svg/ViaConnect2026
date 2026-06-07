-- =============================================================================
-- Prompt 177a (2026-06-07): index the search_supplements typeahead.
--
-- Adds a maintained, denormalized search_blob column on
-- supplement_brand_top_products plus a trigram GIN index, then rewrites
-- the search_supplements RPC so its dominant predicate is a single
-- indexable LIKE against search_blob and the alias arm is a separate
-- UNION leg with its own index. Substring (infix) match behavior and
-- result scoring are preserved, including the cross-boundary brand +
-- product match the prior OR construct exhibited.
--
-- pg_trgm is already installed on this project; the CREATE EXTENSION is
-- an idempotent guard. The trigger-maintained column is needed because
-- brand_name lives on a different table (supplement_brand_registry), so
-- a generated STORED column cannot reach across it.
--
-- Append-only. No applied migration is touched.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Combined, denormalized search column on the products table.
ALTER TABLE public.supplement_brand_top_products
  ADD COLUMN IF NOT EXISTS search_blob text;

-- 2. Maintain search_blob whenever a product row is written.
CREATE OR REPLACE FUNCTION public.sbtp_set_search_blob()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  NEW.search_blob := lower(
    coalesce((SELECT br.brand_name FROM public.supplement_brand_registry br WHERE br.id = NEW.brand_registry_id), '')
    || ' ' || NEW.product_name
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sbtp_set_search_blob ON public.supplement_brand_top_products;
CREATE TRIGGER trg_sbtp_set_search_blob
  BEFORE INSERT OR UPDATE OF product_name, brand_registry_id
  ON public.supplement_brand_top_products
  FOR EACH ROW EXECUTE FUNCTION public.sbtp_set_search_blob();

-- 3. Recompute child products when a brand name changes (rare, but keeps the blob correct).
CREATE OR REPLACE FUNCTION public.sbr_refresh_product_search_blob()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE public.supplement_brand_top_products btp
     SET search_blob = lower(NEW.brand_name || ' ' || btp.product_name)
   WHERE btp.brand_registry_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sbr_refresh_product_search_blob ON public.supplement_brand_registry;
CREATE TRIGGER trg_sbr_refresh_product_search_blob
  AFTER UPDATE OF brand_name
  ON public.supplement_brand_registry
  FOR EACH ROW
  WHEN (OLD.brand_name IS DISTINCT FROM NEW.brand_name)
  EXECUTE FUNCTION public.sbr_refresh_product_search_blob();

-- 4. Backfill the existing rows.
UPDATE public.supplement_brand_top_products btp
   SET search_blob = lower(br.brand_name || ' ' || btp.product_name)
  FROM public.supplement_brand_registry br
 WHERE btp.brand_registry_id = br.id;

-- 5. Trigram GIN indexes. At this row count a plain build is sub-second.
CREATE INDEX IF NOT EXISTS idx_sbtp_search_blob_trgm
  ON public.supplement_brand_top_products USING gin (search_blob gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_sba_normalized_alias_trgm
  ON public.supplement_brand_aliases USING gin (normalized_alias gin_trgm_ops);

-- 6. Replace the RPC. Signature and returned column set unchanged.
CREATE OR REPLACE FUNCTION public.search_supplements(search_query text, result_limit integer DEFAULT 8)
RETURNS TABLE(result_type text, brand_id uuid, brand_name text, product_id uuid, product_name text, product_category text, is_enriched boolean, ingredient_breakdown jsonb, match_score numeric)
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  q  text := lower(search_query);
  qn text := replace(lower(search_query), ' ', '');
BEGIN
  RETURN QUERY
  WITH product_matches AS (
    -- Arm 1: indexable combined-text match (subsumes product_name, brand_name, and combined contains).
    SELECT btp.id AS p_id, br.id AS b_id, br.brand_name AS b_name, btp.product_name AS p_name,
           btp.product_category AS p_cat, btp.is_enriched AS p_enr, btp.ingredient_breakdown AS p_ing,
      (CASE
         WHEN btp.search_blob LIKE q || '%'            THEN 100
         WHEN lower(btp.product_name) LIKE q || '%'    THEN 90
         WHEN lower(br.brand_name) LIKE q || '%'       THEN 80
         WHEN lower(btp.product_name) LIKE '%'||q||'%' THEN 60
         ELSE 10 END
       + CASE WHEN btp.is_enriched THEN 5 ELSE 0 END)::numeric AS score
    FROM public.supplement_brand_top_products btp
    JOIN public.supplement_brand_registry br ON btp.brand_registry_id = br.id
    WHERE btp.search_blob LIKE '%' || q || '%'
    UNION ALL
    -- Arm 2: products whose brand matches via an alias.
    SELECT btp.id, br.id, br.brand_name, btp.product_name,
           btp.product_category, btp.is_enriched, btp.ingredient_breakdown,
      (10 + CASE WHEN btp.is_enriched THEN 5 ELSE 0 END)::numeric
    FROM public.supplement_brand_top_products btp
    JOIN public.supplement_brand_registry br ON btp.brand_registry_id = br.id
    WHERE EXISTS (
      SELECT 1 FROM public.supplement_brand_aliases ba
      WHERE ba.brand_registry_id = br.id
        AND ba.normalized_alias ILIKE '%' || qn || '%'
    )
  ),
  product_best AS (
    SELECT DISTINCT ON (p_id) p_id, b_id, b_name, p_name, p_cat, p_enr, p_ing, score
    FROM product_matches
    ORDER BY p_id, score DESC
  ),
  brand_matches AS (
    SELECT br.id AS b_id, br.brand_name AS b_name,
      (CASE WHEN lower(br.brand_name) LIKE q || '%' THEN 75 ELSE 45 END)::numeric AS score
    FROM public.supplement_brand_registry br
    WHERE (
      lower(br.brand_name) LIKE '%' || q || '%'
      OR EXISTS (SELECT 1 FROM public.supplement_brand_aliases ba2
                 WHERE ba2.brand_registry_id = br.id
                   AND ba2.normalized_alias ILIKE '%' || qn || '%')
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.supplement_brand_top_products btp2
      WHERE btp2.brand_registry_id = br.id
        AND lower(btp2.product_name) LIKE '%' || q || '%'
    )
  )
  SELECT 'product'::text, pb.b_id, pb.b_name, pb.p_id, pb.p_name, pb.p_cat, pb.p_enr, pb.p_ing, pb.score
  FROM product_best pb
  UNION ALL
  SELECT 'brand'::text, bm.b_id, bm.b_name, NULL::uuid, NULL::text, NULL::text, NULL::boolean, NULL::jsonb, bm.score
  FROM brand_matches bm
  ORDER BY 9 DESC
  LIMIT result_limit;
END;
$function$;
