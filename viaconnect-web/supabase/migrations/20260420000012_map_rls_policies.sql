-- =============================================================================
-- Prompt #100 MAP Enforcement — RLS policies.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum
--
-- Standard ViaConnect pattern uses profiles.role (not user_roles).
-- Every MAP table has RLS enabled with:
--   - practitioner sees own rows
--   - admin sees all
--   - consumer + naturopath explicitly denied
-- =============================================================================

ALTER TABLE public.map_policies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_price_observations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_violations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_compliance_scores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_policy_change_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_remediation_evidence ENABLE ROW LEVEL SECURITY;

-- map_policies: authenticated practitioners + admins read; admins manage.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_policies'
      AND policyname='map_policies_read_for_practitioners_admins'
  ) THEN
    CREATE POLICY "map_policies_read_for_practitioners_admins"
      ON public.map_policies FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('practitioner','admin'))
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_policies'
      AND policyname='map_policies_admin_all'
  ) THEN
    CREATE POLICY "map_policies_admin_all"
      ON public.map_policies FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin'));
  END IF;

  -- map_price_observations: admin + service_role only; practitioners
  -- do not read raw observations directly (they see them through
  -- their own violation records).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_price_observations'
      AND policyname='map_observations_admin_read'
  ) THEN
    CREATE POLICY "map_observations_admin_read"
      ON public.map_price_observations FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_price_observations'
      AND policyname='map_observations_service_all'
  ) THEN
    CREATE POLICY "map_observations_service_all"
      ON public.map_price_observations FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  -- map_violations: practitioner sees own, admin sees all.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_violations'
      AND policyname='map_violations_self_read'
  ) THEN
    CREATE POLICY "map_violations_self_read"
      ON public.map_violations FOR SELECT TO authenticated
      USING (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin')
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_violations'
      AND policyname='map_violations_admin_all'
  ) THEN
    CREATE POLICY "map_violations_admin_all"
      ON public.map_violations FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin'));
  END IF;

  -- map_compliance_scores: practitioner sees own, admin sees all.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_compliance_scores'
      AND policyname='map_compliance_self_read'
  ) THEN
    CREATE POLICY "map_compliance_self_read"
      ON public.map_compliance_scores FOR SELECT TO authenticated
      USING (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin')
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_compliance_scores'
      AND policyname='map_compliance_service_all'
  ) THEN
    CREATE POLICY "map_compliance_service_all"
      ON public.map_compliance_scores FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;

  -- map_policy_change_log: admin-only read; service writes.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_policy_change_log'
      AND policyname='map_policy_log_admin_read'
  ) THEN
    CREATE POLICY "map_policy_log_admin_read"
      ON public.map_policy_change_log FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_policy_change_log'
      AND policyname='map_policy_log_admin_insert'
  ) THEN
    CREATE POLICY "map_policy_log_admin_insert"
      ON public.map_policy_change_log FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin'));
  END IF;

  -- map_remediation_evidence: practitioner submits own, admin reads all.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_remediation_evidence'
      AND policyname='map_evidence_self_rw'
  ) THEN
    CREATE POLICY "map_evidence_self_rw"
      ON public.map_remediation_evidence FOR ALL TO authenticated
      USING (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin')
      )
      WITH CHECK (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role='admin')
      );
  END IF;
END $$;
