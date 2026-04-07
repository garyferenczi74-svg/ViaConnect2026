-- ============================================================
-- Founding 8,888 Waitlist
-- ============================================================
-- Pre-launch waitlist limited to the first 8,888 customers. Each
-- signup unlocks four founder benefits redeemable after launch:
--
--   1. 25% off first order (any product)
--   2. 6 months free Platinum Personal Wellness Portal
--   3. 1 year free Platinum Personal Wellness Portal with the
--      purchase of a GeneX360 panel
--   4. 20% off other products with the purchase of a GeneX360 panel
--
-- The table holds emails (sensitive), so it is RLS-locked. Joining
-- and reading aggregate counts both go through SECURITY DEFINER
-- functions granted to anon so the public landing page works
-- without authentication.

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT NOT NULL,
  position        INTEGER NOT NULL,
  capacity        INTEGER NOT NULL DEFAULT 8888,
  benefits        JSONB NOT NULL DEFAULT jsonb_build_object(
                    'founder_25_off_first_order',           true,
                    'platinum_6_months_free',               true,
                    'platinum_1_year_free_with_genex360',   true,
                    'supplements_20_off_with_genex360',     true
                  ),
  referral_source TEXT,
  user_agent      TEXT,
  ip_address      INET,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','redeemed','expired')),
  redeemed_at     TIMESTAMPTZ,
  redeemed_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_uniq
  ON waitlist_signups (LOWER(email));

CREATE INDEX IF NOT EXISTS waitlist_signups_position_idx
  ON waitlist_signups (position);

CREATE INDEX IF NOT EXISTS waitlist_signups_created_idx
  ON waitlist_signups (created_at DESC);

-- RLS: lock everything down. All public access goes through the
-- SECURITY DEFINER functions below. Service role bypasses RLS
-- entirely for admin tooling.
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- ── Atomic join function ─────────────────────────────────────────
-- Acquires an advisory transaction lock so concurrent inserts can't
-- collide on position assignment, validates the email, and either
-- returns the existing row (idempotent re-join) or inserts a new row.
CREATE OR REPLACE FUNCTION waitlist_join(
  p_email           TEXT,
  p_referral_source TEXT DEFAULT NULL,
  p_user_agent      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email    TEXT := LOWER(TRIM(p_email));
  v_capacity INT  := 8888;
  v_existing waitlist_signups;
  v_count    INT;
  v_new_pos  INT;
  v_row      waitlist_signups;
BEGIN
  IF v_email IS NULL OR v_email = '' OR v_email NOT LIKE '%_@_%.%_' THEN
    RAISE EXCEPTION 'invalid_email' USING HINT = 'Provide a well-formed email address.';
  END IF;

  -- Serialize concurrent join attempts so two simultaneous signups
  -- can never receive the same position number.
  PERFORM pg_advisory_xact_lock(hashtext('waitlist_signups_join'));

  -- Idempotent: same email re-joining returns the existing row.
  SELECT * INTO v_existing FROM waitlist_signups WHERE LOWER(email) = v_email;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success',         true,
      'already_joined',  true,
      'position',        v_existing.position,
      'capacity',        v_existing.capacity,
      'remaining',       GREATEST(0, v_existing.capacity - (SELECT COUNT(*) FROM waitlist_signups)),
      'benefits',        v_existing.benefits,
      'created_at',      v_existing.created_at
    );
  END IF;

  SELECT COUNT(*) INTO v_count FROM waitlist_signups;
  IF v_count >= v_capacity THEN
    RETURN jsonb_build_object(
      'success',  false,
      'error',    'capacity_full',
      'capacity', v_capacity,
      'count',    v_count
    );
  END IF;

  v_new_pos := v_count + 1;

  INSERT INTO waitlist_signups (email, position, capacity, referral_source, user_agent)
  VALUES (v_email, v_new_pos, v_capacity, p_referral_source, p_user_agent)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'success',        true,
    'already_joined', false,
    'position',       v_row.position,
    'capacity',       v_row.capacity,
    'remaining',      GREATEST(0, v_row.capacity - v_new_pos),
    'benefits',       v_row.benefits,
    'created_at',     v_row.created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION waitlist_join(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ── Public stats function ────────────────────────────────────────
-- Returns only aggregate counts so the landing page can render the
-- live progress bar without exposing any individual emails.
CREATE OR REPLACE FUNCTION waitlist_stats()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total',          COUNT(*),
    'capacity',       8888,
    'remaining',      GREATEST(0, 8888 - COUNT(*)),
    'percent_filled', ROUND(LEAST(100, COUNT(*) * 100.0 / 8888), 2)
  )
  FROM waitlist_signups;
$$;

GRANT EXECUTE ON FUNCTION waitlist_stats() TO anon, authenticated;
