-- =============================================================================
-- Prompt #103 Phase 5: Practitioner sub-brand + category opt-in
-- =============================================================================
-- One row per (practitioner, category) opt-in. Default-enabled categories
-- (Base Formulas, Advanced Formulas, Women's Health) can be pre-seeded by
-- the application on practitioner provisioning; opt-in categories (SNP,
-- Mushrooms, GeneX360 Testing, Childrens/Sproutables) require explicit
-- acknowledgment.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.practitioner_category_opt_ins (
  opt_in_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id        UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  product_category_id    UUID NOT NULL REFERENCES public.product_categories(product_category_id) ON DELETE CASCADE,
  opted_in_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_rules     BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at        TIMESTAMPTZ,
  opted_out_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (practitioner_id, product_category_id)
);

CREATE INDEX IF NOT EXISTS idx_prac_category_opt_ins_practitioner
  ON public.practitioner_category_opt_ins(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_prac_category_opt_ins_category
  ON public.practitioner_category_opt_ins(product_category_id);
CREATE INDEX IF NOT EXISTS idx_prac_category_opt_ins_active
  ON public.practitioner_category_opt_ins(practitioner_id, product_category_id)
  WHERE opted_out_at IS NULL;

ALTER TABLE public.practitioner_category_opt_ins ENABLE ROW LEVEL SECURITY;

-- Practitioner sees + mutates only their own opt-ins; admin sees all.
DROP POLICY IF EXISTS prac_category_opt_ins_self_read ON public.practitioner_category_opt_ins;
CREATE POLICY prac_category_opt_ins_self_read ON public.practitioner_category_opt_ins
  FOR SELECT TO authenticated
  USING (
    practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS prac_category_opt_ins_self_write ON public.practitioner_category_opt_ins;
CREATE POLICY prac_category_opt_ins_self_write ON public.practitioner_category_opt_ins
  FOR ALL TO authenticated
  USING (
    practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE public.practitioner_category_opt_ins IS
  'Prompt #103: practitioner opt-ins to the 7-category taxonomy. Gates which SKUs appear in wholesale ordering, commission dashboard, MAP monitoring, and Revenue Intelligence filters.';
