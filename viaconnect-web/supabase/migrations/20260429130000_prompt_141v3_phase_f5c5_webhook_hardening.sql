-- 20260429130000_prompt_141v3_phase_f5c5_webhook_hardening.sql
-- Phase F5c.5 of Prompt #141 v3 (Shop Redesign + Card System Clone).
-- Three changes:
--   1. Replace the non-UNIQUE partial expression index from F5
--      (idx_shop_orders_stripe_session) with a UNIQUE version. This closes
--      the race window in which the success-URL handler and the Stripe
--      webhook could each pass the existence check before either commits,
--      producing duplicate orders + double Helix credits.
--   2. Add an overloaded two-argument variant of increment_promo_redemption
--      (text, uuid) that verifies the cited order is paid and carries the
--      same discount_code before bumping times_redeemed. The single-arg
--      version is RETAINED in this migration to preserve transitional
--      callers; a future cleanup migration drops it once the codebase has
--      fully migrated.
--   3. No status-column constraint changes. New refund/dispute statuses
--      ('refunded', 'disputed') are introduced by app code and accepted by
--      shop_orders.status (free-text column today).
--
-- Pre-flight verified via Supabase MCP: zero duplicate stripe_session_id
-- values exist in shop_orders, so the UNIQUE conversion is safe.

BEGIN;

DROP INDEX IF EXISTS public.idx_shop_orders_stripe_session;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_orders_stripe_session_uniq
  ON public.shop_orders ((metadata->>'stripe_session_id'))
  WHERE metadata ? 'stripe_session_id';

CREATE OR REPLACE FUNCTION public.increment_promo_redemption(
  p_code text,
  p_order_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized text;
  v_order_exists boolean;
BEGIN
  v_normalized := upper(trim(coalesce(p_code, '')));
  IF v_normalized = '' OR p_order_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.shop_orders
    WHERE id = p_order_id
      AND status = 'paid'
      AND upper(coalesce(discount_code, '')) = v_normalized
  ) INTO v_order_exists;

  IF NOT v_order_exists THEN
    RAISE EXCEPTION 'increment_promo_redemption: order % not paid with code %', p_order_id, v_normalized;
  END IF;

  UPDATE public.promo_codes
    SET times_redeemed = times_redeemed + 1, updated_at = now()
    WHERE code = v_normalized;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_promo_redemption(text, uuid) TO authenticated;

COMMIT;
