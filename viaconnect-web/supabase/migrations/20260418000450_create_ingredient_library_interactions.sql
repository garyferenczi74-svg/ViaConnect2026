-- =============================================================================
-- Prompt #97 Phase 1.2: Ingredient-to-ingredient interactions.
-- =============================================================================
-- Pairwise interaction records consulted by the Phase 3 validation engine.
-- `blocks_formulation = true` causes the validation engine to reject the
-- formulation; false surfaces a warning the medical reviewer evaluates.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ingredient_library_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  ingredient_a_id TEXT NOT NULL REFERENCES public.ingredient_library(id),
  ingredient_b_id TEXT NOT NULL REFERENCES public.ingredient_library(id),

  severity TEXT NOT NULL CHECK (severity IN ('minor','moderate','major','contraindicated')),
  mechanism TEXT NOT NULL,
  clinical_significance TEXT,
  source_reference TEXT,

  blocks_formulation BOOLEAN NOT NULL DEFAULT false,

  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),

  UNIQUE (ingredient_a_id, ingredient_b_id),
  CHECK (ingredient_a_id < ingredient_b_id)
);

COMMENT ON TABLE public.ingredient_library_interactions IS
  'Pairwise interactions. The validation engine consults both (a,b) and (b,a) via OR. The CHECK (a<b) enforces canonical ordering so there is never a duplicate row for the same pair.';

CREATE INDEX IF NOT EXISTS idx_ingredient_interactions_a
  ON public.ingredient_library_interactions(ingredient_a_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_interactions_b
  ON public.ingredient_library_interactions(ingredient_b_id);

ALTER TABLE public.ingredient_library_interactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ingredient_library_interactions' AND policyname='ingredient_interactions_admin_all') THEN
    CREATE POLICY "ingredient_interactions_admin_all"
      ON public.ingredient_library_interactions FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ingredient_library_interactions' AND policyname='ingredient_interactions_read_enrolled') THEN
    CREATE POLICY "ingredient_interactions_read_enrolled"
      ON public.ingredient_library_interactions FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.level_4_enrollments le
          INNER JOIN public.practitioners p ON p.id = le.practitioner_id
          WHERE p.user_id = auth.uid()
            AND le.status IN ('active','formulation_development','eligibility_verified')
        )
      );
  END IF;
END $$;
