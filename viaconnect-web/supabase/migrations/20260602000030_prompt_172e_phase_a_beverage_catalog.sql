-- Prompt 172e Phase A Deliverable 3: beverage_catalog table.
--
-- Append only per spec §4. Drives the catalog endpoint at
-- /api/nutrition/hydration/catalog and (Phase B) the picker UI on
-- /wellness-analytics/hydration. New beverages are seed data, not code.
--
-- Gate 2 addition (Gary 2026-06-02): hydration_source_kind text column
-- maps each row to the live 9 value 170o enum so the catalog row carries
-- its own runtime coefficient mapping; the runtime hydration calculation
-- continues to flow through src/lib/nutrition/hydration/types.ts. The
-- hydration_coefficient column on the row is the Maughan grounded display
-- value, kept on the row for picker rendering and Hannah/Kelsey audit.

CREATE TABLE IF NOT EXISTS public.beverage_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  hydration_source_kind TEXT NOT NULL,
  display_name TEXT NOT NULL,
  default_volume_ml INTEGER NOT NULL,
  hydration_coefficient NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  caffeine_mg_per_serving INTEGER NOT NULL DEFAULT 0,
  kcal_per_serving INTEGER NOT NULL DEFAULT 0,
  sugar_g NUMERIC(5,1) NOT NULL DEFAULT 0,
  sodium_mg INTEGER NOT NULL DEFAULT 0,
  potassium_mg INTEGER NOT NULL DEFAULT 0,
  magnesium_mg INTEGER NOT NULL DEFAULT 0,
  is_alcoholic BOOLEAN NOT NULL DEFAULT FALSE,
  abv NUMERIC(4,1),
  evidence_source TEXT,
  requires_claim_review BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Category bucket constraint mirrors spec §4 and the 9 UI category buckets
-- Hannah named (water, coffee, tea, juice, pop, sports_energy, milk,
-- functional, alcohol).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='beverage_catalog_category_check'
  ) THEN
    ALTER TABLE public.beverage_catalog
      ADD CONSTRAINT beverage_catalog_category_check
      CHECK (category IN ('water','coffee','tea','juice','pop','sports_energy','milk','functional','alcohol'));
  END IF;
END $$;

-- hydration_source_kind must map to the live 9 value enum the 170o
-- runtime keys off. Append only: new enum values per Phase B must be
-- added to this CHECK and to HYDRATION_SOURCE_KINDS together.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema='public'
      AND constraint_name='beverage_catalog_hydration_source_kind_check'
  ) THEN
    ALTER TABLE public.beverage_catalog
      ADD CONSTRAINT beverage_catalog_hydration_source_kind_check
      CHECK (hydration_source_kind IN (
        'pure_water','coffee_tea','juice_smoothie','dairy','soda',
        'alcohol_low','alcohol_high','sports_drink','high_water_food'
      ));
  END IF;
END $$;

-- Picker query path: WHERE is_active = true ORDER BY category, sort_order.
CREATE INDEX IF NOT EXISTS idx_beverage_catalog_active_sort
  ON public.beverage_catalog(category, sort_order)
  WHERE is_active = TRUE;

-- Audit and Hannah/Kelsey claim review path.
CREATE INDEX IF NOT EXISTS idx_beverage_catalog_claim_review
  ON public.beverage_catalog(requires_claim_review)
  WHERE requires_claim_review = TRUE;

ALTER TABLE public.beverage_catalog ENABLE ROW LEVEL SECURITY;

-- Read only for authenticated users (catalog is global consumer data).
DROP POLICY IF EXISTS beverage_catalog_authenticated_read ON public.beverage_catalog;
CREATE POLICY beverage_catalog_authenticated_read ON public.beverage_catalog
  FOR SELECT TO authenticated
  USING (true);

-- Writes are service role only via Supabase admin client. No additional
-- policies; the absence of a write policy enforces it.

COMMENT ON TABLE public.beverage_catalog IS
  'Prompt 172e Phase A beverage catalog. Drives the picker UI and the catalog endpoint; rows are seed data not code. hydration_source_kind maps to the live 9 value 170o enum that the runtime keys off; hydration_coefficient is the Maughan grounded display value kept on the row for audit.';
