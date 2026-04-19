-- =============================================================================
-- Prompt #93 Phase 1.6: Rollout cohorts for gradual feature activation.
-- =============================================================================
-- Named cohorts referenced by features.rollout_cohort_ids when
-- rollout_strategy = 'cohort_list'. Each cohort's membership rule is encoded
-- as a JSONB definition that the evaluation engine matches against the
-- current user. Three built-in definition types are supported:
--
--   profile_role_match        {type, roles: TEXT[]}
--   explicit_user_list        {type, user_ids: UUID[]}
--   practitioner_cohort_match {type, cohort_number: INT}
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rollout_cohorts (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  cohort_type TEXT NOT NULL CHECK (cohort_type IN (
    'internal_staff',
    'beta_testers',
    'practitioner_cohort',
    'geographic_region',
    'membership_tier',
    'custom'
  )),
  definition JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.rollout_cohorts IS
  'Named cohorts for feature flag cohort_list rollout strategy. definition JSONB encodes the membership rule; see migration _230 header for supported types.';

ALTER TABLE public.rollout_cohorts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rollout_cohorts' AND policyname='rollout_cohorts_read_all') THEN
    CREATE POLICY "rollout_cohorts_read_all"
      ON public.rollout_cohorts FOR SELECT
      TO authenticated USING (is_active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rollout_cohorts' AND policyname='rollout_cohorts_admin_all') THEN
    CREATE POLICY "rollout_cohorts_admin_all"
      ON public.rollout_cohorts FOR ALL
      TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rollout_cohorts' AND policyname='rollout_cohorts_service_all') THEN
    CREATE POLICY "rollout_cohorts_service_all"
      ON public.rollout_cohorts FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Seed the three standard cohorts.
-- -----------------------------------------------------------------------------
INSERT INTO public.rollout_cohorts (id, display_name, description, cohort_type, definition) VALUES
  ('internal_staff',
   'Internal FarmCeutica Staff',
   'admin, staff, and founder roles from public.profiles.role',
   'internal_staff',
   '{"type": "profile_role_match", "roles": ["admin", "staff", "founder"]}'::jsonb),
  ('beta_testers',
   'Beta Testing Group',
   'Explicit user list. Admins add user ids to definition.user_ids via the Phase 4 admin UI.',
   'beta_testers',
   '{"type": "explicit_user_list", "user_ids": []}'::jsonb),
  ('cohort_1_practitioners',
   'Cohort 1 Practitioners',
   'Practitioners assigned to practitioner_cohorts.cohort_number = 1.',
   'practitioner_cohort',
   '{"type": "practitioner_cohort_match", "cohort_number": 1}'::jsonb)
ON CONFLICT (id) DO NOTHING;
