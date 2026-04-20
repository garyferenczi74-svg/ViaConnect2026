-- =============================================================================
-- Prompt #101 — RLS policies for waiver + VIP + manual_customer tables.
-- =============================================================================
-- EXCLUDES: all forbidden reward-program tables per #17b Addendum

ALTER TABLE public.map_waivers                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_waiver_skus                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_waiver_evidence                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_vip_exemptions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_vip_exemption_sensitive_notes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_customers                    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- map_waivers: practitioner sees own, admin sees all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_waivers' AND policyname='map_waivers_self_rw') THEN
    CREATE POLICY "map_waivers_self_rw" ON public.map_waivers FOR ALL TO authenticated
      USING (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_officer'))
      )
      WITH CHECK (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_waiver_skus' AND policyname='map_waiver_skus_inherit') THEN
    CREATE POLICY "map_waiver_skus_inherit" ON public.map_waiver_skus FOR ALL TO authenticated
      USING (
        waiver_id IN (
          SELECT w.waiver_id FROM public.map_waivers w
          WHERE w.practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        waiver_id IN (
          SELECT w.waiver_id FROM public.map_waivers w
          WHERE w.practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_waiver_evidence' AND policyname='map_waiver_evidence_inherit') THEN
    CREATE POLICY "map_waiver_evidence_inherit" ON public.map_waiver_evidence FOR ALL TO authenticated
      USING (
        waiver_id IN (
          SELECT w.waiver_id FROM public.map_waivers w
          WHERE w.practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_officer'))
      )
      WITH CHECK (
        waiver_id IN (
          SELECT w.waiver_id FROM public.map_waivers w
          WHERE w.practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;

  -- map_vip_exemptions: practitioner sees own, admin + compliance see all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_vip_exemptions' AND policyname='map_vip_exemptions_self_rw') THEN
    CREATE POLICY "map_vip_exemptions_self_rw" ON public.map_vip_exemptions FOR ALL TO authenticated
      USING (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_officer'))
      )
      WITH CHECK (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;

  -- map_vip_exemption_sensitive_notes: restricted to admin + compliance + owning practitioner
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_vip_exemption_sensitive_notes' AND policyname='map_vip_sensitive_notes_restricted_read') THEN
    CREATE POLICY "map_vip_sensitive_notes_restricted_read" ON public.map_vip_exemption_sensitive_notes FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_officer'))
        OR EXISTS (
          SELECT 1 FROM public.map_vip_exemptions ve
          JOIN public.practitioners pr ON pr.id = ve.practitioner_id
          WHERE ve.vip_exemption_id = map_vip_exemption_sensitive_notes.vip_exemption_id
            AND pr.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='map_vip_exemption_sensitive_notes' AND policyname='map_vip_sensitive_notes_restricted_insert') THEN
    CREATE POLICY "map_vip_sensitive_notes_restricted_insert" ON public.map_vip_exemption_sensitive_notes FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (
          SELECT 1 FROM public.map_vip_exemptions ve
          JOIN public.practitioners pr ON pr.id = ve.practitioner_id
          WHERE ve.vip_exemption_id = map_vip_exemption_sensitive_notes.vip_exemption_id
            AND pr.user_id = auth.uid()
        )
      );
  END IF;

  -- manual_customers: practitioner manages own, admin verifies all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='manual_customers' AND policyname='manual_customers_self_rw') THEN
    CREATE POLICY "manual_customers_self_rw" ON public.manual_customers FOR ALL TO authenticated
      USING (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;
