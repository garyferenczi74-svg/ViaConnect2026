-- =============================================================
-- Prompt #90 Phase 1.3: GeneX360 Products + Purchases + Gift Trigger
-- genex360_products (3 seeded), genex360_purchases (lifecycle
-- tracking). Trigger activates gift membership when
-- test_results_delivered_at transitions NULL -> timestamp.
-- Trigger dual-writes tier (legacy) and tier_id (new) for
-- backward compatibility with existing app reads.
-- =============================================================

-- 1. GeneX360 product catalog
CREATE TABLE IF NOT EXISTS public.genex360_products (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  panel_count INTEGER NOT NULL CHECK (panel_count > 0),
  panels_included TEXT[] NOT NULL,
  price_cents INTEGER NOT NULL,
  family_member_discount_percent INTEGER NOT NULL DEFAULT 25 CHECK (family_member_discount_percent BETWEEN 0 AND 100),
  gifted_tier_id TEXT REFERENCES public.membership_tiers(id),
  gifted_months INTEGER NOT NULL CHECK (gifted_months >= 0),
  unlocks_full_precision BOOLEAN NOT NULL DEFAULT false,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.genex360_products IS 'GeneX360 genetic testing panel products. Purchase grants bundled membership gift activated on result delivery.';
COMMENT ON COLUMN public.genex360_products.panels_included IS 'Identifiers: genex_m, nutrigen_dx, hormone_iq, epigen_hq, peptide_iq, cannabis_iq. Map to master_skus 57 (GeneXM), 58 (NutragenHQ), 59 (HormoneIQ), 60 (EpiGenDX), 67 (PeptidesIQ), 68 (CannabisIQ).';

ALTER TABLE public.genex360_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='genex360_products' AND policyname='genex360_products_read_all_authenticated') THEN
    CREATE POLICY "genex360_products_read_all_authenticated"
      ON public.genex360_products FOR SELECT
      TO authenticated USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='genex360_products' AND policyname='genex360_products_read_all_anon') THEN
    CREATE POLICY "genex360_products_read_all_anon"
      ON public.genex360_products FOR SELECT
      TO anon USING (is_active = true);
  END IF;
END $$;

INSERT INTO public.genex360_products (
  id, display_name, description, panel_count, panels_included,
  price_cents, gifted_tier_id, gifted_months, unlocks_full_precision, sort_order
) VALUES
  ('genex_m','GeneX-M Methylation Panel',
    'Entry-point genetic testing focused on methylation pathway variants: MTHFR, COMT, MAOA, VDR. Comprehensive methylation report with ViaConnect integration.',
    1, ARRAY['genex_m'],
    38888,'gold',3,false,1),
  ('genex360_core','GeneX360 Core',
    'Three-panel bundle: Methylation (GeneX-M), Nutrigenomics (NutragenHQ), and Hormonal (HormoneIQ). Covers the most clinically actionable panels.',
    3, ARRAY['genex_m','nutrigen_dx','hormone_iq'],
    78888,'platinum',6,false,2),
  ('genex360_complete','GeneX360 Complete',
    'All six GeneX360 panels: Methylation, Nutrigenomics, Hormonal, Epigenetics (EpiGenDX), Peptide Response (PeptidesIQ), Cannabinoid Response (CannabisIQ).',
    6, ARRAY['genex_m','nutrigen_dx','hormone_iq','epigen_hq','peptide_iq','cannabis_iq'],
    118888,'platinum',12,true,3)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_genex360_products_sort ON public.genex360_products(sort_order) WHERE is_active = true;

-- 2. GeneX360 purchases with lifecycle tracking
CREATE TABLE IF NOT EXISTS public.genex360_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.genex360_products(id),
  family_member_id UUID REFERENCES public.family_members(id),
  order_id UUID REFERENCES public.shop_orders(id),

  price_paid_cents INTEGER NOT NULL,
  family_discount_applied_percent INTEGER NOT NULL DEFAULT 0,

  stripe_payment_intent_id TEXT,
  paypal_order_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','refunded','failed')),

  kit_shipped_at TIMESTAMPTZ,
  kit_tracking_number TEXT,
  sample_received_at TIMESTAMPTZ,
  lab_processing_started_at TIMESTAMPTZ,
  test_results_delivered_at TIMESTAMPTZ,

  gift_membership_id UUID,
  gift_starts_at TIMESTAMPTZ,
  gift_ends_at TIMESTAMPTZ,

  lifecycle_status TEXT NOT NULL DEFAULT 'purchased'
    CHECK (lifecycle_status IN (
      'purchased','kit_shipped','sample_received',
      'processing','results_delivered','results_reviewed'
    )),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.genex360_purchases IS 'Lifecycle tracking for GeneX360 purchases. Gift membership auto-activates on test_results_delivered_at via trigger.';

ALTER TABLE public.genex360_purchases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='genex360_purchases' AND policyname='genex360_purchases_user_own_read') THEN
    CREATE POLICY "genex360_purchases_user_own_read"
      ON public.genex360_purchases FOR SELECT
      TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='genex360_purchases' AND policyname='genex360_purchases_user_own_insert') THEN
    CREATE POLICY "genex360_purchases_user_own_insert"
      ON public.genex360_purchases FOR INSERT
      TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='genex360_purchases' AND policyname='genex360_purchases_service_update') THEN
    CREATE POLICY "genex360_purchases_service_update"
      ON public.genex360_purchases FOR UPDATE
      TO service_role USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_genex360_purchases_user   ON public.genex360_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_genex360_purchases_status ON public.genex360_purchases(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_genex360_purchases_results_pending
  ON public.genex360_purchases(lifecycle_status)
  WHERE lifecycle_status IN ('purchased','kit_shipped','sample_received','processing');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_genex360_purchases_updated_at') THEN
    CREATE TRIGGER trg_genex360_purchases_updated_at
    BEFORE UPDATE ON public.genex360_purchases
    FOR EACH ROW EXECUTE FUNCTION public.memberships_set_updated_at();
  END IF;
END $$;

-- 3. Gift membership activation trigger
-- Fires when test_results_delivered_at transitions NULL -> value.
-- Dual-writes tier (legacy TEXT) and tier_id (new FK) for backward compat.
CREATE OR REPLACE FUNCTION public.activate_genex360_gift_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_membership_id UUID;
  v_period_end TIMESTAMPTZ;
BEGIN
  IF OLD.test_results_delivered_at IS NULL AND NEW.test_results_delivered_at IS NOT NULL THEN
    SELECT * INTO v_product FROM public.genex360_products WHERE id = NEW.product_id;

    IF v_product.gifted_months > 0 AND v_product.gifted_tier_id IS NOT NULL THEN
      v_period_end := NEW.test_results_delivered_at + (v_product.gifted_months || ' months')::INTERVAL;

      INSERT INTO public.memberships (
        user_id,
        tier,                   -- legacy TEXT column, kept in sync
        tier_id,                -- new FK column
        billing_cycle,
        started_at,
        current_period_start,
        current_period_end,
        expires_at,             -- legacy column, kept in sync
        status,
        payment_method,
        gift_source_id,
        is_annual_prepay
      ) VALUES (
        NEW.user_id,
        v_product.gifted_tier_id,
        v_product.gifted_tier_id,
        'gift',
        NEW.test_results_delivered_at,
        NEW.test_results_delivered_at,
        v_period_end,
        v_period_end,
        'gift_active',
        'gift_from_genex360',
        NEW.id,
        false
      )
      RETURNING id INTO v_membership_id;

      NEW.gift_membership_id := v_membership_id;
      NEW.gift_starts_at := NEW.test_results_delivered_at;
      NEW.gift_ends_at := v_period_end;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_activate_genex360_gift') THEN
    CREATE TRIGGER trigger_activate_genex360_gift
    BEFORE UPDATE OF test_results_delivered_at ON public.genex360_purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.activate_genex360_gift_membership();
  END IF;
END $$;
