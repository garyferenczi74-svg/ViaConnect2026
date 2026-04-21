-- =============================================================================
-- Photo Sync prompt §3.4: products_image_audit table
-- =============================================================================
-- Append-only audit log for the photo-sync runner. Every UPDATE on
-- products.image_url writes a row here inside the same transaction.
-- Admin-only RLS; consumer/practitioner/naturopath roles cannot read.
--
-- The runner itself (scripts/sync-supplement-photos.ts) does the
-- UPDATE writes — this migration only provisions the audit table so
-- the match plan can be reviewed before any DB writes happen.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.products_image_audit (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         UUID,
  variant_id         UUID,
  sku                TEXT NOT NULL,
  previous_image_url TEXT,
  new_image_url      TEXT NOT NULL,
  match_confidence   TEXT NOT NULL CHECK (match_confidence IN ('HIGH', 'LOW', 'MANUAL', 'ROLLBACK')),
  match_source       TEXT NOT NULL,
  applied_by         TEXT NOT NULL DEFAULT 'photo-sync-script',
  applied_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_id             UUID
);

CREATE INDEX IF NOT EXISTS products_image_audit_sku_idx
  ON public.products_image_audit (sku);
CREATE INDEX IF NOT EXISTS products_image_audit_applied_at_idx
  ON public.products_image_audit (applied_at DESC);
CREATE INDEX IF NOT EXISTS products_image_audit_run_id_idx
  ON public.products_image_audit (run_id);

ALTER TABLE public.products_image_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_image_audit_admin_all ON public.products_image_audit;
CREATE POLICY products_image_audit_admin_all
  ON public.products_image_audit FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE public.products_image_audit IS
  'Photo Sync prompt: append-only audit of every products.image_url change made by the photo-sync runner. Rollback uses run_id to find the rows to revert.';
