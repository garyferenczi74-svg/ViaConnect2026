-- 20260430000000_prompt_141v3_phase_f6a_drop_legacy_promo_fn.sql
-- Phase F6a of Prompt #141 v3 (Shop Redesign + Card System Clone).
-- Drops the transitional one-arg increment_promo_redemption(text) function
-- that F5b shipped and F5c.5 superseded with the verified two-arg
-- increment_promo_redemption(text, uuid). The orphan
-- serverIncrementPromoRedemption wrapper that was its only caller was
-- removed in F5c.5; a grep across src/ at audit time confirmed no
-- remaining callers. The two-arg signature stays.

BEGIN;

DROP FUNCTION IF EXISTS public.increment_promo_redemption(text);

COMMIT;
