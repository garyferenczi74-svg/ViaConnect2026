-- Prompt #100 audit remediation: set explicit search_path on helper
-- functions so Supabase linter stops flagging them. No behavioral
-- change — these functions only reference built-ins + public tables.

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.map_grace_hours(severity TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE
SET search_path = public AS $$
  SELECT CASE severity
    WHEN 'yellow' THEN 168
    WHEN 'orange' THEN 72
    WHEN 'red'    THEN 48
    WHEN 'black'  THEN 24
    ELSE 72
  END;
$$;

CREATE OR REPLACE FUNCTION public.classify_map_severity(
  observed_cents         INTEGER,
  map_cents              INTEGER,
  ingredient_floor_cents INTEGER
) RETURNS TEXT LANGUAGE plpgsql IMMUTABLE
SET search_path = public AS $$
DECLARE discount_pct NUMERIC(5,2);
BEGIN
  IF observed_cents IS NULL OR map_cents IS NULL OR map_cents <= 0 THEN RETURN NULL; END IF;
  IF observed_cents < ingredient_floor_cents THEN RETURN 'black'; END IF;
  IF observed_cents >= map_cents THEN RETURN NULL; END IF;
  discount_pct := ((map_cents - observed_cents)::NUMERIC / map_cents) * 100;
  IF discount_pct > 15 THEN RETURN 'red';
  ELSIF discount_pct > 5 THEN RETURN 'orange';
  ELSE RETURN 'yellow';
  END IF;
END;
$$;
