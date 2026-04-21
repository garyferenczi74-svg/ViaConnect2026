-- =============================================================================
-- Prompt #106 — Shop Image & Formulation Refresh (Supplements Only)
-- Workstream A + B + C schema.
-- =============================================================================
-- 3 tables: supplement_photo_inventory, supplement_photo_bindings,
--           shop_refresh_reconciliation_findings.
--
-- SCOPE ISOLATION (§3.2):
--   - This migration touches ONLY these three new tables.
--   - NEVER references genex360_products, peptide_*, master_skus (read-only),
--     pricing_tiers (read-only), helix_* or any Stripe-adjacent column.
--   - The supplement-photos storage bucket is already provisioned; this
--     migration does not modify storage.buckets.
-- =============================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'photo_scope') THEN
    CREATE TYPE public.photo_scope AS ENUM ('in_scope', 'out_of_scope');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shop_finding_type') THEN
    CREATE TYPE public.shop_finding_type AS ENUM (
      'missing_in_catalog',
      'catalog_not_in_canonical',
      'mismatched_name',
      'mismatched_category',
      'mismatched_price'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shop_finding_resolution') THEN
    CREATE TYPE public.shop_finding_resolution AS ENUM (
      'pending_review',
      'approved_to_insert',
      'approved_to_retire',
      'approved_to_correct',
      'rejected'
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- supplement_photo_inventory — one row per object observed in supplement-photos.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplement_photo_inventory (
  inventory_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name      TEXT NOT NULL DEFAULT 'supplement-photos'
                     CHECK (bucket_name = 'supplement-photos'),
  object_path      TEXT NOT NULL,
  content_type     TEXT NOT NULL
                     CHECK (content_type IN ('image/png', 'image/jpeg')),
  byte_size        BIGINT NOT NULL CHECK (byte_size > 0 AND byte_size <= 2097152),
  sha256_hash      TEXT NOT NULL CHECK (sha256_hash ~ '^[a-f0-9]{64}$'),
  last_modified_at TIMESTAMPTZ NOT NULL,
  scope            public.photo_scope NOT NULL DEFAULT 'in_scope',
  deleted_at       TIMESTAMPTZ,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bucket_name, object_path)
);
CREATE INDEX IF NOT EXISTS idx_spi_scope
  ON public.supplement_photo_inventory(scope);
CREATE INDEX IF NOT EXISTS idx_spi_deleted
  ON public.supplement_photo_inventory(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- supplement_photo_bindings — binds an inventory object to a master_skus sku.
-- -----------------------------------------------------------------------------
-- Only one is_primary=TRUE binding per sku at any time — enforced by a
-- partial unique index (classic pattern; EXCLUDE would require btree_gist).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.supplement_photo_bindings (
  binding_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              TEXT NOT NULL,
  inventory_id     UUID NOT NULL REFERENCES public.supplement_photo_inventory(inventory_id),
  version          INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  bound_by_user_id UUID REFERENCES auth.users(id),
  bound_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_spb_sku ON public.supplement_photo_bindings(sku);
CREATE UNIQUE INDEX IF NOT EXISTS uq_spb_primary_per_sku
  ON public.supplement_photo_bindings(sku)
  WHERE is_primary = TRUE AND archived_at IS NULL;

-- -----------------------------------------------------------------------------
-- shop_refresh_reconciliation_findings — output of a three-way diff run.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_refresh_reconciliation_findings (
  finding_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_run_id  UUID NOT NULL,
  finding_type           public.shop_finding_type NOT NULL,
  sku                    TEXT NOT NULL,
  canonical_payload_json JSONB,
  catalog_payload_json   JSONB,
  resolution_status      public.shop_finding_resolution NOT NULL DEFAULT 'pending_review',
  resolution_reason      TEXT,
  resolved_by_user_id    UUID REFERENCES auth.users(id),
  resolved_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Retirement + correction flows require a reason string of at least 20
  -- chars. Insert-approval does not (the canonical row IS the reason).
  CHECK (
    resolution_status IN ('pending_review', 'approved_to_insert')
    OR char_length(COALESCE(resolution_reason, '')) >= 20
  )
);
CREATE INDEX IF NOT EXISTS idx_srrf_run
  ON public.shop_refresh_reconciliation_findings(reconciliation_run_id);
CREATE INDEX IF NOT EXISTS idx_srrf_status
  ON public.shop_refresh_reconciliation_findings(resolution_status);

-- -----------------------------------------------------------------------------
-- RLS — admin-only read/write; service role for cron + edge functions.
-- -----------------------------------------------------------------------------
ALTER TABLE public.supplement_photo_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_photo_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_refresh_reconciliation_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spi_admin_all ON public.supplement_photo_inventory;
CREATE POLICY spi_admin_all ON public.supplement_photo_inventory
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS spb_admin_all ON public.supplement_photo_bindings;
CREATE POLICY spb_admin_all ON public.supplement_photo_bindings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS srrf_admin_all ON public.shop_refresh_reconciliation_findings;
CREATE POLICY srrf_admin_all ON public.shop_refresh_reconciliation_findings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.supplement_photo_inventory IS
  'Prompt #106: one row per object enumerated in the supplement-photos bucket. SHA-256 captured at observation time; tamper detection re-verifies on read.';
COMMENT ON TABLE public.supplement_photo_bindings IS
  'Prompt #106: binds a canonical master_skus.sku to an inventory object. is_primary=TRUE (not archived) is unique per sku.';
COMMENT ON TABLE public.shop_refresh_reconciliation_findings IS
  'Prompt #106: three-way diff between master_skus + pricing_tiers + product_catalog. Resolution requires typed-confirmation (retire/correct) or canonical-match approval (insert).';
