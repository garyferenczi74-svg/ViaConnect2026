-- 20260429120000_prompt_141v3_phase_f5b_promo_codes.sql
-- Phase F5b of Prompt #141 v3 (Shop Redesign + Card System Clone).
-- Replaces the in-memory STUB_PROMO_CODES whitelist in cart-store with a
-- DB-backed table managed via two SECURITY DEFINER RPC functions:
--   - validate_promo_code(p_code, p_subtotal_cents)
--   - increment_promo_redemption(p_code)
--
-- Design notes:
--   - Code stored upper-cased (CHECK constraint enforces).
--   - kind = 'percent' or 'amount'; for 'percent' value is capped at 100.
--   - Optional max_redemptions, valid_from, valid_until, min_subtotal_cents.
--   - is_active flag for soft-disable without deletion.
--   - times_redeemed incremented on successful checkout finalize. Concurrency
--     is handled by Postgres row-level locking on the UPDATE.
--   - RLS: no direct SELECT for anon/authenticated. All reads go through
--     validate_promo_code (SECURITY DEFINER) which returns only the fields
--     the caller needs. Service role can administer rows directly.
--   - Seed: WELCOME10 (10% off) and SAVE25 ($25 off) match the existing
--     stub whitelist so existing localhost workflows keep working.

BEGIN;

CREATE TABLE IF NOT EXISTS public.promo_codes (
  code text PRIMARY KEY,
  kind text NOT NULL,
  value numeric NOT NULL,
  max_redemptions integer,
  times_redeemed integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  min_subtotal_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_code_uppercase CHECK (code = upper(code)),
  CONSTRAINT promo_codes_kind_check CHECK (kind IN ('percent', 'amount')),
  CONSTRAINT promo_codes_value_positive CHECK (value > 0),
  CONSTRAINT promo_codes_percent_max CHECK (kind <> 'percent' OR value <= 100),
  CONSTRAINT promo_codes_redemption_nonneg CHECK (times_redeemed >= 0),
  CONSTRAINT promo_codes_min_subtotal_nonneg CHECK (min_subtotal_cents >= 0)
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_active
  ON public.promo_codes(is_active)
  WHERE is_active = true;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'promo_codes'
      AND policyname = 'Service role manages promo codes'
  ) THEN
    CREATE POLICY "Service role manages promo codes"
      ON public.promo_codes FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $policy$;

CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code text,
  p_subtotal_cents integer
) RETURNS TABLE(
  ok boolean,
  normalized_code text,
  kind text,
  value numeric,
  error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized text;
  v_row public.promo_codes%ROWTYPE;
BEGIN
  v_normalized := upper(trim(coalesce(p_code, '')));
  IF v_normalized = '' THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::numeric, 'Code is empty.'::text;
    RETURN;
  END IF;

  SELECT * INTO v_row FROM public.promo_codes WHERE code = v_normalized AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::numeric, 'Code not recognized.'::text;
    RETURN;
  END IF;

  IF v_row.valid_from IS NOT NULL AND now() < v_row.valid_from THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::numeric, 'Code is not yet valid.'::text;
    RETURN;
  END IF;

  IF v_row.valid_until IS NOT NULL AND now() > v_row.valid_until THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::numeric, 'Code has expired.'::text;
    RETURN;
  END IF;

  IF v_row.max_redemptions IS NOT NULL AND v_row.times_redeemed >= v_row.max_redemptions THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::numeric, 'Code has reached its redemption limit.'::text;
    RETURN;
  END IF;

  IF coalesce(p_subtotal_cents, 0) < v_row.min_subtotal_cents THEN
    RETURN QUERY SELECT
      false,
      NULL::text,
      NULL::text,
      NULL::numeric,
      format('Code requires a minimum order of $%s.', round(v_row.min_subtotal_cents / 100.0, 2)::text)::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_row.code, v_row.kind, v_row.value, NULL::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_promo_redemption(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized text;
BEGIN
  v_normalized := upper(trim(coalesce(p_code, '')));
  IF v_normalized = '' THEN
    RETURN;
  END IF;
  UPDATE public.promo_codes
    SET times_redeemed = times_redeemed + 1, updated_at = now()
    WHERE code = v_normalized;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_promo_redemption(text) TO authenticated;

INSERT INTO public.promo_codes (code, kind, value, is_active) VALUES
  ('WELCOME10', 'percent', 10, true),
  ('SAVE25',    'amount',  25, true)
ON CONFLICT (code) DO NOTHING;

COMMIT;
