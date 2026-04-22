-- =============================================================================
-- Prompt #111 Phase 1.1: ENUM types for international multi-currency stack.
-- =============================================================================
-- Creates the foundational enum types used across pricing, tax, orders, and
-- settlement tables introduced by Prompt #111. Append-only: no existing
-- schema is touched.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.market_code AS ENUM ('US','EU','UK','AU');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.currency_code AS ENUM ('USD','EUR','GBP','AUD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pricing_status AS ENUM (
    'draft',
    'pending_governance',
    'pending_approval',
    'active',
    'rejected',
    'superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tax_registration_status AS ENUM (
    'pending','active','suspended','retired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.vat_invoice_status AS ENUM (
    'draft','issued','void','superseded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TYPE public.market_code IS 'Prompt #111 geo-commerce market. US default; EU/UK/AU activate through Prompt #113 regulatory gating.';
COMMENT ON TYPE public.currency_code IS 'Prompt #111 supported settlement currencies (ISO 4217). Extendable only through a new migration.';
COMMENT ON TYPE public.pricing_status IS 'Prompt #111 lifecycle of a master_skus_market_pricing row. One active row per (sku,market_code) enforced by partial unique index.';
COMMENT ON TYPE public.tax_registration_status IS 'Prompt #111 lifecycle of a VAT/GST/sales-tax registration record.';
COMMENT ON TYPE public.vat_invoice_status IS 'Prompt #111 lifecycle of a VAT invoice. Issued invoices are immutable; void/superseded create new rows with references.';
