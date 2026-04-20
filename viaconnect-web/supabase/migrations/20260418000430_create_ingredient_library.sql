-- =============================================================================
-- Prompt #97 Phase 1.1: Ingredient library (Level 4 Custom Formulations).
-- =============================================================================
-- Master library of ingredients eligible for inclusion in Level 4 custom
-- formulations. Q1 launch admits only pre-1994 dietary ingredients and
-- GRAS-affirmed post-1994 ingredients; NDI-requiring ingredients are
-- excluded. Prohibited categories (prescriptions, DEA schedules, peptides,
-- hormones, CBD, warning-letter ingredients) are enforced at the
-- application layer (Phase 3 validation engine) by a hardcoded block list
-- plus the fda_warning_letter_issued + fda_safety_concern_listed flags on
-- this table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ingredient_library (
  id TEXT PRIMARY KEY,
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  alternate_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  category TEXT NOT NULL CHECK (category IN (
    'vitamin','mineral','amino_acid','botanical_herb','enzyme',
    'probiotic_strain','fatty_acid','phytochemical','nutraceutical',
    'antioxidant','mushroom_extract','fiber','excipient_filler','other'
  )),
  subcategory TEXT,

  regulatory_status TEXT NOT NULL CHECK (regulatory_status IN (
    'pre_1994_dietary_ingredient','gras_affirmed','ndi_notified_accepted',
    'ndi_required_not_filed','prohibited','under_review'
  )),
  gras_notice_number TEXT,
  gras_affirmation_date DATE,
  ndi_notification_number TEXT,
  fda_warning_letter_issued BOOLEAN NOT NULL DEFAULT false,
  fda_safety_concern_listed BOOLEAN NOT NULL DEFAULT false,

  available_forms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  minimum_effective_dose_mg NUMERIC(10, 3),
  typical_dose_mg NUMERIC(10, 3),
  dose_unit TEXT NOT NULL CHECK (dose_unit IN (
    'mg','mcg','iu','g','cfu_billions','mg_per_kg'
  )),

  tolerable_upper_limit_adult_mg NUMERIC(10, 3),
  tolerable_upper_limit_pediatric_mg NUMERIC(10, 3),
  pregnancy_category TEXT CHECK (pregnancy_category IN (
    'safe','caution','contraindicated','insufficient_data'
  )),

  typical_cogs_cents_per_mg NUMERIC(12, 6),
  supplier_notes TEXT,
  minimum_source_quantity_kg NUMERIC(10, 3),

  primary_indications TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  mechanism_summary TEXT,
  structure_function_claim_allowed BOOLEAN NOT NULL DEFAULT false,
  allowed_claim_language TEXT[],

  contains_allergen_milk BOOLEAN NOT NULL DEFAULT false,
  contains_allergen_soy BOOLEAN NOT NULL DEFAULT false,
  contains_allergen_wheat BOOLEAN NOT NULL DEFAULT false,
  contains_allergen_egg BOOLEAN NOT NULL DEFAULT false,
  contains_allergen_tree_nut BOOLEAN NOT NULL DEFAULT false,
  contains_allergen_peanut BOOLEAN NOT NULL DEFAULT false,
  contains_allergen_fish BOOLEAN NOT NULL DEFAULT false,
  contains_allergen_shellfish BOOLEAN NOT NULL DEFAULT false,
  contains_allergen_sesame BOOLEAN NOT NULL DEFAULT false,

  is_available_for_custom_formulation BOOLEAN NOT NULL DEFAULT false,
  inclusion_justification TEXT,
  excluded_reason TEXT,

  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.ingredient_library IS
  'Master library of ingredients eligible for Level 4 Custom Formulations. Q1 launch admits only pre_1994_dietary_ingredient and gras_affirmed regulatory statuses. Prohibited categories enforced at app layer (validation engine).';
COMMENT ON COLUMN public.ingredient_library.is_available_for_custom_formulation IS
  'Admin toggle. Must be true for ingredient to appear in the practitioner formulation builder. Defaults to false; admin must explicitly enable after review.';

CREATE INDEX IF NOT EXISTS idx_ingredient_library_category
  ON public.ingredient_library(category)
  WHERE is_available_for_custom_formulation = true;
CREATE INDEX IF NOT EXISTS idx_ingredient_library_available
  ON public.ingredient_library(common_name)
  WHERE is_available_for_custom_formulation = true;
CREATE INDEX IF NOT EXISTS idx_ingredient_library_regulatory
  ON public.ingredient_library(regulatory_status);

ALTER TABLE public.ingredient_library ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ingredient_library' AND policyname='ingredient_library_admin_all') THEN
    CREATE POLICY "ingredient_library_admin_all"
      ON public.ingredient_library FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  -- Enrolled-practitioner read policy: for Q1, admit any authenticated practitioner who
  -- has an active level_4_enrollment. Practitioners who are not enrolled see no rows.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ingredient_library' AND policyname='ingredient_library_read_enrolled') THEN
    CREATE POLICY "ingredient_library_read_enrolled"
      ON public.ingredient_library FOR SELECT TO authenticated
      USING (
        is_available_for_custom_formulation = true
        AND regulatory_status IN ('pre_1994_dietary_ingredient','gras_affirmed')
        AND EXISTS (
          SELECT 1 FROM public.level_4_enrollments le
          INNER JOIN public.practitioners p ON p.id = le.practitioner_id
          WHERE p.user_id = auth.uid()
            AND le.status IN ('active','formulation_development','eligibility_verified')
        )
      );
  END IF;
END $$;
