-- Prompt 170l Phase 1a: per-user daily OFF lookup counter for 200/day cap.
-- Gate 4: server-side enforcement (good OFF citizenship per §3.5).
-- Composite PK (user_id, date); nightly purge of >7-day-old rows.
-- Atomic increment via increment_user_off_lookup function.

CREATE TABLE IF NOT EXISTS public.user_off_lookups (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS user_off_lookups_date_idx
  ON public.user_off_lookups (date);

ALTER TABLE public.user_off_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_off_lookups_service_role_all
  ON public.user_off_lookups
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Atomic increment helper; serializes counter writes per (user_id, date) row.
CREATE OR REPLACE FUNCTION public.increment_user_off_lookup(
  p_user_id uuid,
  p_date date,
  p_updated_at timestamptz
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_count int;
BEGIN
  INSERT INTO public.user_off_lookups (user_id, date, count, updated_at)
  VALUES (p_user_id, p_date, 1, p_updated_at)
  ON CONFLICT (user_id, date) DO UPDATE
    SET count = public.user_off_lookups.count + 1,
        updated_at = p_updated_at
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_off_lookup(uuid, date, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_off_lookup(uuid, date, timestamptz) TO service_role;

COMMENT ON TABLE public.user_off_lookups IS
  '170l Gate 4: 200 OFF lookups/user/day rate limit counter.';
COMMENT ON FUNCTION public.increment_user_off_lookup(uuid, date, timestamptz) IS
  '170l atomic counter increment for OFF rate limit; service_role only.';
