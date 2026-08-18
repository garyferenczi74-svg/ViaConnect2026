-- Prompt 223 location backfill.
-- Legacy source is ONLY auth.users.raw_user_meta_data->>'location'.
-- There is no profiles.location column.
-- Parses only unambiguous matches against ref_cities.
-- Does not invent a country for a bare city name with multiple matches.
-- The Buffalo fixture stays prompted (Buffalo NY and Buffalo WY both exist).
-- No coordinates. Does not modify handle_new_user.

CREATE OR REPLACE FUNCTION public.backfill_profile_locations()
RETURNS TABLE (total int, parsed int, prompted int)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total int;
  v_parsed int;
  v_prompted int;
BEGIN
  -- 1. Copy metadata location into profiles.location_legacy once.
  UPDATE public.profiles AS p
  SET location_legacy = NULLIF(btrim(u.raw_user_meta_data ->> 'location'), '')
  FROM auth.users AS u
  WHERE p.id = u.id
    AND p.location_legacy IS NULL
    AND NULLIF(btrim(u.raw_user_meta_data ->> 'location'), '') IS NOT NULL;

  -- 2a. City, ST where ST is a USPS or CA/AU subdivision suffix
  -- and the pair matches exactly one ref_cities row.
  WITH candidates AS (
    SELECT
      p.id,
      public.normalize_place_name(
        btrim(substring(btrim(p.location_legacy) FROM '^(.*),[[:space:]]*[A-Za-z]{2,3}$'))
      ) AS city_norm,
      upper(btrim(substring(btrim(p.location_legacy) FROM ',[[:space:]]*([A-Za-z]{2,3})$'))) AS st
    FROM public.profiles AS p
    WHERE p.city IS NULL
      AND NULLIF(btrim(p.location_legacy), '') IS NOT NULL
      AND btrim(p.location_legacy) ~* '^.+,[[:space:]]*[A-Za-z]{2,3}$'
  ),
  matched AS (
    SELECT
      cand.id,
      c.name AS city,
      s.name AS subdivision_name,
      c.subdivision_code,
      co.name AS country_name,
      c.country_code
    FROM candidates AS cand
    JOIN public.ref_cities AS c
      ON c.name_normalized = cand.city_norm
     AND c.subdivision_code IN (
       'US-' || cand.st,
       'CA-' || cand.st,
       'AU-' || cand.st
     )
    JOIN public.ref_subdivisions AS s
      ON s.code = c.subdivision_code
    JOIN public.ref_countries AS co
      ON co.code = c.country_code
  ),
  unique_matched AS (
    SELECT id
    FROM matched
    GROUP BY id
    HAVING count(*) = 1
  )
  UPDATE public.profiles AS p
  SET
    city = m.city,
    subdivision_name = m.subdivision_name,
    subdivision_code = m.subdivision_code,
    country_name = m.country_name,
    country_code = m.country_code,
    location_needs_confirm = false
  FROM matched AS m
  JOIN unique_matched AS u ON u.id = m.id
  WHERE p.id = m.id
    AND p.city IS NULL;

  -- 2b. Exact single ref_cities.name match worldwide (case/diacritic
  -- insensitive). Multiple Buffalos stay unparsed. Never pick one.
  WITH candidates AS (
    SELECT
      p.id,
      public.normalize_place_name(p.location_legacy) AS city_norm
    FROM public.profiles AS p
    WHERE p.city IS NULL
      AND NULLIF(btrim(p.location_legacy), '') IS NOT NULL
  ),
  unique_names AS (
    SELECT c.name_normalized
    FROM public.ref_cities AS c
    GROUP BY c.name_normalized
    HAVING count(*) = 1
  ),
  matched AS (
    SELECT
      cand.id,
      c.name AS city,
      s.name AS subdivision_name,
      c.subdivision_code,
      co.name AS country_name,
      c.country_code
    FROM candidates AS cand
    JOIN unique_names AS u ON u.name_normalized = cand.city_norm
    JOIN public.ref_cities AS c ON c.name_normalized = cand.city_norm
    LEFT JOIN public.ref_subdivisions AS s ON s.code = c.subdivision_code
    JOIN public.ref_countries AS co ON co.code = c.country_code
  )
  UPDATE public.profiles AS p
  SET
    city = m.city,
    subdivision_name = m.subdivision_name,
    subdivision_code = m.subdivision_code,
    country_name = m.country_name,
    country_code = m.country_code,
    location_needs_confirm = false
  FROM matched AS m
  WHERE p.id = m.id
    AND p.city IS NULL;

  -- 2c. Everything else, including bare Buffalo, stays unstructured
  -- and is flagged for the Confirm your location prompt.
  UPDATE public.profiles AS p
  SET location_needs_confirm = true
  WHERE p.city IS NULL
    AND NULLIF(btrim(p.location_legacy), '') IS NOT NULL;

  SELECT
    count(*) FILTER (
      WHERE NULLIF(btrim(location_legacy), '') IS NOT NULL
    )::int,
    count(*) FILTER (
      WHERE NULLIF(btrim(location_legacy), '') IS NOT NULL
        AND city IS NOT NULL
        AND location_needs_confirm = false
    )::int,
    count(*) FILTER (
      WHERE NULLIF(btrim(location_legacy), '') IS NOT NULL
        AND location_needs_confirm = true
    )::int
  INTO v_total, v_parsed, v_prompted
  FROM public.profiles;

  RETURN QUERY SELECT v_total, v_parsed, v_prompted;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_profile_locations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.backfill_profile_locations() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_profile_locations() TO service_role;

-- Apply once on migrate. Function remains for later stats and reruns.
SELECT * FROM public.backfill_profile_locations();
