-- =============================================================================
-- Prompt #95 Phase 1.7: Competitor pricing reference.
-- =============================================================================
-- Manual admin-entered observations of competitor pricing. Linked to our
-- pricing_domains where comparable so proposal builder can surface context.
-- Automated scraping is explicitly out of scope (ToS risk).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.competitor_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  competitor_name TEXT NOT NULL,
  competitor_url TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'consumer_subscription',
    'practitioner_subscription',
    'genetic_test',
    'supplement_retail',
    'peptide_retail',
    'certification',
    'precision_wellness_platform',
    'other'
  )),

  product_name TEXT NOT NULL,
  product_description TEXT,
  price_cents INTEGER NOT NULL,
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual', 'one_time', 'per_unit')),

  observed_at DATE NOT NULL,
  observed_by_user_id UUID REFERENCES auth.users(id),
  source_notes TEXT,

  viacura_comparable_domain_id TEXT REFERENCES public.pricing_domains(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_pricing_category
  ON public.competitor_pricing(category, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_comparable
  ON public.competitor_pricing(viacura_comparable_domain_id, observed_at DESC)
  WHERE viacura_comparable_domain_id IS NOT NULL;

ALTER TABLE public.competitor_pricing ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='competitor_pricing' AND policyname='competitor_pricing_admin_all') THEN
    CREATE POLICY "competitor_pricing_admin_all"
      ON public.competitor_pricing FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
