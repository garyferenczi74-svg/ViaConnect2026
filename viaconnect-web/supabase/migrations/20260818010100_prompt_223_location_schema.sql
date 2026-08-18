-- Prompt 223 schema only, no seed rows, no coordinates.
-- Structured country / subdivision / city reference tables, profile columns,
-- normalize helper, typeahead RPCs, and signup metadata copy trigger.
-- Does not modify handle_new_user.

-- ---------------------------------------------------------------------------
-- Reference tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ref_countries (
  code text PRIMARY KEY,
  name text NOT NULL,
  name_normalized text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ref_subdivisions (
  code text PRIMARY KEY,
  country_code text NOT NULL REFERENCES public.ref_countries (code),
  name text NOT NULL,
  name_normalized text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ref_cities (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  country_code text NOT NULL REFERENCES public.ref_countries (code),
  subdivision_code text NULL REFERENCES public.ref_subdivisions (code),
  name text NOT NULL,
  name_normalized text NOT NULL,
  source text NOT NULL,
  is_free_entry_origin boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_ref_countries_name_normalized
  ON public.ref_countries (name_normalized text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_ref_subdivisions_country_name_normalized
  ON public.ref_subdivisions (country_code, name_normalized text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_ref_cities_country_sub_name_normalized
  ON public.ref_cities (country_code, subdivision_code, name_normalized text_pattern_ops);

-- ---------------------------------------------------------------------------
-- RLS: anon and authenticated SELECT only
-- ---------------------------------------------------------------------------

ALTER TABLE public.ref_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_subdivisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ref_cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_countries_select ON public.ref_countries;
CREATE POLICY ref_countries_select
  ON public.ref_countries
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS ref_subdivisions_select ON public.ref_subdivisions;
CREATE POLICY ref_subdivisions_select
  ON public.ref_subdivisions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS ref_cities_select ON public.ref_cities;
CREATE POLICY ref_cities_select
  ON public.ref_cities
  FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE ALL ON public.ref_countries FROM PUBLIC;
REVOKE ALL ON public.ref_subdivisions FROM PUBLIC;
REVOKE ALL ON public.ref_cities FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ref_countries FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ref_subdivisions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.ref_cities FROM anon, authenticated;

GRANT SELECT ON public.ref_countries TO anon, authenticated;
GRANT SELECT ON public.ref_subdivisions TO anon, authenticated;
GRANT SELECT ON public.ref_cities TO anon, authenticated;
GRANT ALL ON public.ref_countries TO service_role;
GRANT ALL ON public.ref_subdivisions TO service_role;
GRANT ALL ON public.ref_cities TO service_role;

-- ---------------------------------------------------------------------------
-- profiles columns (inherit existing profiles RLS)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS subdivision_name text,
  ADD COLUMN IF NOT EXISTS subdivision_code text,
  ADD COLUMN IF NOT EXISTS country_name text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS location_legacy text,
  ADD COLUMN IF NOT EXISTS location_needs_confirm boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_is_free_entry boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- Normalize helper: lower, strip diacritics, collapse spaces
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_place_name(p_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_text text;
BEGIN
  IF p_input IS NULL THEN
    RETURN NULL;
  END IF;

  v_text := lower(btrim(p_input));

  BEGIN
    v_text := unaccent(v_text);
  EXCEPTION
    WHEN undefined_function THEN
      v_text := replace(v_text, 'ß', 'ss');
      v_text := replace(v_text, 'æ', 'ae');
      v_text := replace(v_text, 'œ', 'oe');
      v_text := translate(
        v_text,
        'àáâãäåāăąçćčďđèéêëēėęěìíîïīįłñńňòóôõöőøùúûüűýÿžźż',
        'aaaaaaaaacccddeeeeeeeeiiiiiilnnnooooooouuuuuyyzzz'
      );
  END;

  v_text := regexp_replace(v_text, '\s+', ' ', 'g');
  RETURN btrim(v_text);
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_place_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_place_name(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Typeahead RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_ref_countries(q text, lim int DEFAULT 20)
RETURNS TABLE (code text, name text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT c.code, c.name
  FROM public.ref_countries c
  WHERE
    q IS NULL
    OR btrim(q) = ''
    OR c.name_normalized LIKE public.normalize_place_name(q) || '%'
    OR c.name_normalized LIKE '%' || public.normalize_place_name(q) || '%'
  ORDER BY
    CASE
      WHEN q IS NULL OR btrim(q) = '' THEN 1
      WHEN c.name_normalized LIKE public.normalize_place_name(q) || '%' THEN 0
      ELSE 1
    END,
    c.name
  LIMIT GREATEST(1, LEAST(COALESCE(lim, 20), 50));
$$;

CREATE OR REPLACE FUNCTION public.search_ref_subdivisions(
  p_country text,
  q text,
  lim int DEFAULT 30
)
RETURNS TABLE (code text, name text, country_code text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT s.code, s.name, s.country_code
  FROM public.ref_subdivisions s
  WHERE s.country_code = p_country
    AND (
      q IS NULL
      OR btrim(q) = ''
      OR s.name_normalized LIKE public.normalize_place_name(q) || '%'
      OR s.name_normalized LIKE '%' || public.normalize_place_name(q) || '%'
    )
  ORDER BY
    CASE
      WHEN q IS NULL OR btrim(q) = '' THEN 1
      WHEN s.name_normalized LIKE public.normalize_place_name(q) || '%' THEN 0
      ELSE 1
    END,
    s.name
  LIMIT GREATEST(1, LEAST(COALESCE(lim, 30), 80));
$$;

CREATE OR REPLACE FUNCTION public.search_ref_cities(
  p_country text,
  p_subdivision text,
  q text,
  lim int DEFAULT 20
)
RETURNS TABLE (id bigint, name text, subdivision_code text, country_code text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.name, c.subdivision_code, c.country_code
  FROM public.ref_cities c
  WHERE c.country_code = p_country
    AND (
      p_subdivision IS NULL
      OR btrim(p_subdivision) = ''
      OR c.subdivision_code = p_subdivision
    )
    AND q IS NOT NULL
    AND btrim(q) <> ''
    AND (
      c.name_normalized LIKE public.normalize_place_name(q) || '%'
      OR c.name_normalized LIKE '%' || public.normalize_place_name(q) || '%'
    )
  ORDER BY
    CASE
      WHEN c.name_normalized LIKE public.normalize_place_name(q) || '%' THEN 0
      ELSE 1
    END,
    c.name
  LIMIT GREATEST(1, LEAST(COALESCE(lim, 20), 50));
$$;

REVOKE ALL ON FUNCTION public.search_ref_countries(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_ref_subdivisions(text, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_ref_cities(text, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_ref_countries(text, int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_ref_subdivisions(text, text, int) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_ref_cities(text, text, text, int) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Copy structured signup metadata onto profiles after auth.users insert.
-- SECURITY INVOKER (no SECURITY DEFINER). Runs as the inserting role.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.copy_signup_location_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_meta jsonb;
  v_legacy text;
  v_free_entry boolean;
BEGIN
  v_meta := NEW.raw_user_meta_data;
  IF v_meta IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT (
    v_meta ? 'city'
    OR v_meta ? 'subdivision_name'
    OR v_meta ? 'subdivision_code'
    OR v_meta ? 'country_name'
    OR v_meta ? 'country_code'
    OR v_meta ? 'location_is_free_entry'
    OR v_meta ? 'location'
    OR v_meta ? 'location_legacy'
  ) THEN
    RETURN NEW;
  END IF;

  v_legacy := NULLIF(btrim(COALESCE(v_meta ->> 'location_legacy', v_meta ->> 'location')), '');

  v_free_entry := lower(COALESCE(v_meta ->> 'location_is_free_entry', ''))
    IN ('true', 't', '1', 'yes');

  UPDATE public.profiles
  SET
    city = NULLIF(btrim(v_meta ->> 'city'), ''),
    subdivision_name = NULLIF(btrim(v_meta ->> 'subdivision_name'), ''),
    subdivision_code = NULLIF(btrim(v_meta ->> 'subdivision_code'), ''),
    country_name = NULLIF(btrim(v_meta ->> 'country_name'), ''),
    country_code = NULLIF(btrim(v_meta ->> 'country_code'), ''),
    location_legacy = COALESCE(v_legacy, location_legacy),
    location_is_free_entry = v_free_entry
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_copy_signup_location ON auth.users;
CREATE TRIGGER trg_copy_signup_location
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.copy_signup_location_to_profile();

REVOKE ALL ON FUNCTION public.copy_signup_location_to_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.copy_signup_location_to_profile() TO service_role;

-- INVOKER trigger on auth.users runs as supabase_auth_admin. Column grants
-- let it copy signup metadata onto the new profiles row.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT UPDATE (
      city,
      subdivision_name,
      subdivision_code,
      country_name,
      country_code,
      location_legacy,
      location_is_free_entry
    ) ON TABLE public.profiles TO supabase_auth_admin;

    GRANT EXECUTE ON FUNCTION public.copy_signup_location_to_profile() TO supabase_auth_admin;

    DROP POLICY IF EXISTS profiles_copy_signup_location ON public.profiles;
    CREATE POLICY profiles_copy_signup_location
      ON public.profiles
      FOR UPDATE
      TO supabase_auth_admin
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
