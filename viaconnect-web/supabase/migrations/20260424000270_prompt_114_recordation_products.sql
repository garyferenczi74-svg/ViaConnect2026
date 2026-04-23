-- =============================================================================
-- Prompt #114 P3: customs_recordation_products junction
-- =============================================================================
-- Links a recordation (trademark or copyright) to the SKUs that bear the mark.
-- Used downstream in P4 detention workflows to auto-populate MSRP (§ 133.27
-- civil fine calculation) and authorized-manufacturer data from master_skus.
--
-- FK idiom matches the rest of the codebase: references master_skus(sku) TEXT,
-- not master_skus(id) UUID. See outcome_stack_components.sku for precedent
-- (20260418000010_consumer_pricing_reference.sql:139).
--
-- master_skus remains read-only per the #111 contract; this migration does
-- NOT alter master_skus RLS. Legal-ops clients go through the server-side
-- API picker route at /api/admin/legal/customs/master-skus.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.customs_recordation_products (
  recordation_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recordation_id         UUID NOT NULL
                           REFERENCES public.customs_recordations(recordation_id) ON DELETE CASCADE,
  sku                    TEXT NOT NULL
                           REFERENCES public.master_skus(sku) ON DELETE RESTRICT,
  linked_by              UUID REFERENCES auth.users(id),
  linked_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trade_secrets_flag     BOOLEAN NOT NULL DEFAULT TRUE,
  notes                  TEXT,
  UNIQUE (recordation_id, sku)
);

COMMENT ON TABLE public.customs_recordation_products IS
  'Prompt #114 P3: junction between a CBP recordation and the SKUs bearing the mark. Consumed by detention workflow in P4 to look up MSRP for § 133.27 fine calc.';

CREATE INDEX IF NOT EXISTS idx_customs_recordation_products_recordation_id
  ON public.customs_recordation_products (recordation_id);

CREATE INDEX IF NOT EXISTS idx_customs_recordation_products_sku
  ON public.customs_recordation_products (sku);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.customs_recordation_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customs_recordation_products_legal_ops_all ON public.customs_recordation_products;
CREATE POLICY customs_recordation_products_legal_ops_all
  ON public.customs_recordation_products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('admin','compliance_officer','legal_ops')));

DROP POLICY IF EXISTS customs_recordation_products_cfo_ceo_read ON public.customs_recordation_products;
CREATE POLICY customs_recordation_products_cfo_ceo_read
  ON public.customs_recordation_products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
                  AND role IN ('cfo','ceo')));
