-- =============================================================================
-- Prompt #91, Phase 2.1: Practitioner subscription tiers
-- =============================================================================
-- Append-only. Two tiers: Standard Portal ($128.88/mo) and White-Label
-- Platform ($288.88/mo). Annual prepay = 10x monthly (two months free).
-- Stripe IDs are NULL until Stripe is configured for the practitioner channel.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.practitioner_tiers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL CHECK (monthly_price_cents >= 0),
  annual_price_cents INTEGER NOT NULL CHECK (annual_price_cents >= 0),
  annual_savings_cents INTEGER GENERATED ALWAYS AS (monthly_price_cents * 12 - annual_price_cents) STORED,
  description TEXT,
  co_branding_level TEXT NOT NULL CHECK (co_branding_level IN ('medium', 'heavy_white_label')),
  wholesale_discount_percent INTEGER NOT NULL DEFAULT 50 CHECK (wholesale_discount_percent BETWEEN 0 AND 100),
  stripe_product_id TEXT,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.practitioner_tiers IS
  'Practitioner subscription tiers: Standard Portal and White-Label Platform.';

ALTER TABLE public.practitioner_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS practitioner_tiers_read_all ON public.practitioner_tiers;
CREATE POLICY practitioner_tiers_read_all
  ON public.practitioner_tiers FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS practitioner_tiers_admin_write ON public.practitioner_tiers;
CREATE POLICY practitioner_tiers_admin_write
  ON public.practitioner_tiers FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.practitioner_tiers (
  id, display_name, monthly_price_cents, annual_price_cents,
  description, co_branding_level, wholesale_discount_percent, sort_order
) VALUES
  ('standard', 'Standard Practitioner Portal',
    12888, 128880,
    'Full practitioner portal access. Medium co-branded patient experience. Level 1 Foundation certification included. Wholesale pricing at 50 percent off MSRP. Patient panel management, protocol tools, integrated messaging.',
    'medium', 50, 1),
  ('white_label', 'White-Label Platform',
    28888, 288880,
    'Premium practitioner tier. Heavy white-label patient experience with custom domain option. Minimal ViaCura branding. Dedicated account management. Priority feature requests. Qualifying criteria: Level 3 Master Practitioner certification, 500+ active patients, or $50K+ annual wholesale.',
    'heavy_white_label', 50, 2)
ON CONFLICT (id) DO UPDATE SET
  display_name              = EXCLUDED.display_name,
  monthly_price_cents       = EXCLUDED.monthly_price_cents,
  annual_price_cents        = EXCLUDED.annual_price_cents,
  description               = EXCLUDED.description,
  co_branding_level         = EXCLUDED.co_branding_level,
  wholesale_discount_percent= EXCLUDED.wholesale_discount_percent,
  sort_order                = EXCLUDED.sort_order,
  updated_at                = NOW();
