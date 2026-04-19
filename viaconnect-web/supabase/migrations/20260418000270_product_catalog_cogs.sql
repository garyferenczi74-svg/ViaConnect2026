-- =============================================================================
-- Prompt #94 Phase 3.1: product_catalog.cogs_cents extension
-- =============================================================================
-- Append-only. The LTV engine subtracts COGS from revenue to compute
-- contribution margin per customer. Phase 3 needs a per-SKU COGS column on
-- product_catalog. Until vendor invoices are reconciled, the column is
-- backfilled to 35 percent of price (a conservative default for a
-- supplement business; refined quarterly per the methodology doc).
--
-- The column is nullable so future bulk imports can leave it unset and the
-- LTV engine can fall back to the percentage estimate per row at compute
-- time.
-- =============================================================================

ALTER TABLE public.product_catalog
  ADD COLUMN IF NOT EXISTS cogs_cents INTEGER
    CHECK (cogs_cents IS NULL OR cogs_cents >= 0);

COMMENT ON COLUMN public.product_catalog.cogs_cents IS
  'Per-unit cost of goods sold in cents. NULL means use the LTV engine fallback (35 percent of price). Refine quarterly from vendor invoices.';

-- Backfill is a one-time helper executed only on rows where cogs_cents is
-- still NULL. price is in dollars (NUMERIC) per existing schema, so we
-- multiply by 100 first then take 35 percent. ROUND keeps integer cents.
UPDATE public.product_catalog
   SET cogs_cents = ROUND(price * 100 * 0.35)::INTEGER
 WHERE cogs_cents IS NULL
   AND price IS NOT NULL
   AND price > 0;
