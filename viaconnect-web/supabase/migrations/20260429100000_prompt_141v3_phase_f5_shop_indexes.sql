-- 20260429100000_prompt_141v3_phase_f5_shop_indexes.sql
-- Phase F5 of Prompt #141 v3 (Shop Redesign + Card System Clone).
-- Adds the expression index that supports idempotency lookups in
-- finalizeShopOrder, which filters shop_orders by
--   .filter('metadata->>stripe_session_id', 'eq', sessionId)
-- Without this index, the lookup sequential-scans shop_orders. Currently
-- sub-millisecond at low order volume, but degrades past ~10k orders.

CREATE INDEX IF NOT EXISTS idx_shop_orders_stripe_session
  ON public.shop_orders ((metadata->>'stripe_session_id'))
  WHERE metadata ? 'stripe_session_id';
