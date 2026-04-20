-- =============================================================================
-- Prompt #97 Phase 1.5: Custom formulation ingredients junction table.
-- =============================================================================
-- One row per (custom_formulation, ingredient) pair. Holds the practitioner-
-- specified dose + unit + form. Inherits access via the parent formulation
-- (RLS policy).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.custom_formulation_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_formulation_id UUID NOT NULL REFERENCES public.custom_formulations(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES public.ingredient_library(id),
  dose_per_serving NUMERIC(10, 3) NOT NULL CHECK (dose_per_serving > 0),
  dose_unit TEXT NOT NULL CHECK (dose_unit IN ('mg','mcg','iu','g','cfu_billions')),
  percent_daily_value NUMERIC(6, 2),
  ingredient_form TEXT,
  source_notes TEXT,
  is_active_ingredient BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (custom_formulation_id, ingredient_id)
);

COMMENT ON COLUMN public.custom_formulation_ingredients.is_active_ingredient IS
  'Distinguishes active ingredients from excipient fillers. Only active ingredients appear in the supplement facts panel.';
COMMENT ON COLUMN public.custom_formulation_ingredients.ingredient_form IS
  'Specific form (e.g., methylcobalamin for B12, glycinate for Mg). Affects bioavailability and per-mg cost.';

CREATE INDEX IF NOT EXISTS idx_cfi_formulation
  ON public.custom_formulation_ingredients(custom_formulation_id);
CREATE INDEX IF NOT EXISTS idx_cfi_ingredient
  ON public.custom_formulation_ingredients(ingredient_id);

ALTER TABLE public.custom_formulation_ingredients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='custom_formulation_ingredients' AND policyname='cfi_self_rw') THEN
    CREATE POLICY "cfi_self_rw"
      ON public.custom_formulation_ingredients FOR ALL TO authenticated
      USING (custom_formulation_id IN (
        SELECT id FROM public.custom_formulations
        WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
      ))
      WITH CHECK (custom_formulation_id IN (
        SELECT id FROM public.custom_formulations
        WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='custom_formulation_ingredients' AND policyname='cfi_admin_all') THEN
    CREATE POLICY "cfi_admin_all"
      ON public.custom_formulation_ingredients FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
