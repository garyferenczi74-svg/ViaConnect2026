-- =============================================================================
-- Prompt #97 audit fix: restore practitioner read policies.
-- =============================================================================
-- Jeffery review flagged that enrolled practitioners could not read
-- ingredient_library or ingredient_library_interactions because only the
-- *_admin_all policies materialized. Without the *_read_enrolled SELECT
-- policies, the formulation builder shows zero ingredients and the
-- validation engine runs against empty inputs (which would silently
-- pass). Patient-safety critical.
--
-- This migration re-creates the missing SELECT policies using IF NOT EXISTS
-- guards so it is safe to re-run.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'ingredient_library'
       AND policyname = 'ingredient_library_read_enrolled'
  ) THEN
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'ingredient_library_interactions'
       AND policyname = 'ingredient_interactions_read_enrolled'
  ) THEN
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
