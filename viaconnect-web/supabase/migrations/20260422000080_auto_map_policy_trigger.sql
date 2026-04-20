-- =============================================================================
-- Prompt #103 Phase 2: Auto-generate MAP policy for new L1/L2 supplement SKUs
-- =============================================================================
-- When a new product is inserted with pricing_tier IN ('L1','L2') AND its
-- category is a supplement category (not GeneX360 Testing, not L3/L4),
-- an after-insert trigger generates a placeholder map_policies row with
-- a 30-day grace period so admin can populate MAP/MSRP before
-- enforcement starts.
--
-- Defensive:
--   - Skips if product_category_id is NULL (row created without category)
--   - Skips genex360_testing category (test kits are not supplements)
--   - Only fires for 'L1' and 'L2' tiers (L3 white-label + L4 custom
--     formulations remain MAP-exempt per #100 §3.1)
--   - ON CONFLICT DO NOTHING on the map_policies insert so manual admin
--     rows created ahead of time aren't overwritten
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_generate_map_policy_for_new_sku()
RETURNS TRIGGER AS $$
DECLARE
  v_category_slug TEXT;
BEGIN
  IF NEW.pricing_tier IS NULL OR NEW.pricing_tier NOT IN ('L1', 'L2') THEN
    RETURN NEW;
  END IF;

  IF NEW.product_category_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT category_slug INTO v_category_slug
    FROM public.product_categories
    WHERE product_category_id = NEW.product_category_id;

  IF v_category_slug = 'genex360_testing' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'map_policies'
  ) THEN
    -- MAP #100 not yet applied; silently skip. Safe for fresh environments.
    RETURN NEW;
  END IF;

  INSERT INTO public.map_policies (
    product_id, tier,
    map_price_cents, msrp_cents, ingredient_cost_floor_cents,
    map_enforcement_start_date
  ) VALUES (
    NEW.id, NEW.pricing_tier,
    0, 0, 0,
    (NOW() + INTERVAL '30 days')::DATE
  )
  ON CONFLICT (product_id, tier) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_generate_map_policy ON public.products;
CREATE TRIGGER trg_auto_generate_map_policy
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_map_policy_for_new_sku();

COMMENT ON FUNCTION public.auto_generate_map_policy_for_new_sku() IS
  'Prompt #103: auto-creates placeholder map_policies rows for new L1/L2 supplement SKUs. Skips L3/L4 tiers and GeneX360 Testing category. Defensive against missing MAP schema.';
