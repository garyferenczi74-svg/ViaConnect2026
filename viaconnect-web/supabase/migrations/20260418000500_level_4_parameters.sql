-- =============================================================================
-- Prompt #97 Phase 5 + 7: Level 4 governed parameters.
-- =============================================================================
-- Single-row table holding the tunable pricing + MOQ parameters for Level 4.
-- Every Level 4 pricing calculator reads from here at runtime. Changes flow
-- through Prompt #95 governance (pricing_domains wired in Phase 7).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.level_4_parameters (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  development_fee_cents INTEGER NOT NULL DEFAULT 388800,
  medical_review_fee_cents INTEGER NOT NULL DEFAULT 88800,
  moq_per_formulation INTEGER NOT NULL DEFAULT 500,
  minimum_order_value_cents INTEGER NOT NULL DEFAULT 3000000,
  manufacturing_overhead_percent INTEGER NOT NULL DEFAULT 25 CHECK (manufacturing_overhead_percent >= 0),
  qa_qc_percent INTEGER NOT NULL DEFAULT 8 CHECK (qa_qc_percent >= 0),
  packaging_labor_percent INTEGER NOT NULL DEFAULT 5 CHECK (packaging_labor_percent >= 0),
  markup_percent INTEGER NOT NULL DEFAULT 40 CHECK (markup_percent >= 0),
  expedited_surcharge_percent INTEGER NOT NULL DEFAULT 20 CHECK (expedited_surcharge_percent >= 0),
  admin_fee_on_refund_cents INTEGER NOT NULL DEFAULT 50000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.level_4_parameters IS
  'Single-row tunable parameters for Level 4 pricing. Changes go through Prompt #95 governance (pricing_domains _420_l4_* ids wired in Phase 7).';
COMMENT ON COLUMN public.level_4_parameters.id IS
  'Forced to ''default'' via CHECK so only one configuration row ever exists.';

ALTER TABLE public.level_4_parameters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='level_4_parameters' AND policyname='l4_params_read_all') THEN
    -- Public read so the practitioner quote endpoint can fetch without admin auth.
    CREATE POLICY "l4_params_read_all"
      ON public.level_4_parameters FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='level_4_parameters' AND policyname='l4_params_admin_write') THEN
    CREATE POLICY "l4_params_admin_write"
      ON public.level_4_parameters FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

INSERT INTO public.level_4_parameters (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
