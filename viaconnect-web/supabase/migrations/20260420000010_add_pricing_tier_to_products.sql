-- Prompt #100 Phase 1: MAP enforcement scope column.
--
-- Adds pricing_tier to products so every MAP query can filter
-- `WHERE pricing_tier IN ('L1','L2')` per Prompt #100 §3.1. L3
-- (white-label #96) and L4 (custom formulations #97) are exempt.
--
-- Existing catalog rows default to L1 (standard wholesale) since the
-- FarmCeutica catalog was built as L1 before the multi-tier network
-- launched. L3/L4 entries are created by their respective programs
-- (whitelabel_orders, custom_formulations) and will set pricing_tier
-- explicitly when those programs go live.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pricing_tier TEXT NOT NULL DEFAULT 'L1'
    CHECK (pricing_tier IN ('L1', 'L2', 'L3', 'L4'));

COMMENT ON COLUMN public.products.pricing_tier IS
  'MAP enforcement scope. L1 = standard wholesale, L2 = subscription (both MAP-enforced). L3 = white-label, L4 = custom formulations (both MAP-exempt, practitioner-priced).';

CREATE INDEX IF NOT EXISTS idx_products_pricing_tier ON public.products(pricing_tier);
