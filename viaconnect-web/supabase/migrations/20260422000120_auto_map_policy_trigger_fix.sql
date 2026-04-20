-- =============================================================================
-- Prompt #103 Phase 7 (Jeffery review fix): auto-MAP trigger CHECK compliance
-- =============================================================================
-- Jeffery caught that the original auto_generate_map_policy_for_new_sku
-- function (migration 20260422000080) inserted 0 cents for map_price,
-- msrp, and ingredient cost floor. The map_policies table has three
-- CHECK constraints that reject zero values:
--   map_price_cents > 0
--   msrp_cents >= map_price_cents
--   ingredient_cost_floor_cents > 0
--   map_price_cents >= (ingredient_cost_floor_cents * 1.72)::INTEGER
--
-- The original trigger would have raised a constraint violation on
-- every new L1/L2 supplement SKU insert, blocking the whole INSERT.
-- This replacement uses minimum viable placeholders that satisfy every
-- constraint, so admin can still populate the real values later:
--   ingredient_cost_floor_cents = 100  ($1.00 placeholder)
--   map_price_cents             = 172  ($1.72 = floor * 1.72)
--   msrp_cents                  = 172  (>= map_price)
--
-- The 30-day enforcement-start offset still gives admin a window to
-- populate the real values before MAP enforcement kicks in.
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
    RETURN NEW;
  END IF;

  -- Minimum viable placeholders that pass every CHECK constraint on
  -- map_policies. Admin must populate real values before publishing.
  INSERT INTO public.map_policies (
    product_id, tier,
    map_price_cents, msrp_cents, ingredient_cost_floor_cents,
    map_enforcement_start_date
  ) VALUES (
    NEW.id, NEW.pricing_tier,
    172,   -- $1.72 placeholder (=ingredient_cost_floor_cents * 1.72)
    172,   -- msrp = map to start; admin must raise msrp to real MSRP
    100,   -- $1.00 ingredient cost floor placeholder
    (NOW() + INTERVAL '30 days')::DATE
  )
  ON CONFLICT (product_id, tier) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger itself unchanged; the CREATE OR REPLACE above swaps the
-- function body.

COMMENT ON FUNCTION public.auto_generate_map_policy_for_new_sku() IS
  'Prompt #103 (fixed): auto-creates placeholder map_policies rows for new L1/L2 supplement SKUs. Uses minimum viable values (100 / 172 / 172 cents) that pass every map_policies CHECK constraint. Skips L3/L4 tiers and GeneX360 Testing category.';
