-- Prompt #105 — RLS across all 13 new #105 tables.
-- profiles.role pattern (user_roles doesn't exist in this codebase).

ALTER TABLE public.aggregation_snapshots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_library                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_pack_kpi_snapshots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_pack_templates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_pack_ai_prompts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_packs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_pack_sections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_pack_artifacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_meetings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_pack_distributions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_pack_download_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executive_reporting_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Exec reporting admin (admin / cfo / ceo / exec_reporting_admin) manages everything
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='aggregation_snapshots' AND policyname='agg_snapshots_exec_admin_all') THEN
    CREATE POLICY "agg_snapshots_exec_admin_all" ON public.aggregation_snapshots FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='kpi_library' AND policyname='kpi_library_exec_admin_all') THEN
    CREATE POLICY "kpi_library_exec_admin_all" ON public.kpi_library FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_pack_kpi_snapshots' AND policyname='bpks_exec_admin_all') THEN
    CREATE POLICY "bpks_exec_admin_all" ON public.board_pack_kpi_snapshots FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_pack_templates' AND policyname='bpt_exec_admin_all') THEN
    CREATE POLICY "bpt_exec_admin_all" ON public.board_pack_templates FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_pack_ai_prompts' AND policyname='bpap_exec_admin_all') THEN
    CREATE POLICY "bpap_exec_admin_all" ON public.board_pack_ai_prompts FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;

  -- Board packs: exec admin all ops; board members SELECT only their distributions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_packs' AND policyname='bp_exec_admin_all') THEN
    CREATE POLICY "bp_exec_admin_all" ON public.board_packs FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_packs' AND policyname='bp_board_member_distributed') THEN
    CREATE POLICY "bp_board_member_distributed" ON public.board_packs FOR SELECT TO authenticated
      USING (
        pack_id IN (
          SELECT d.pack_id FROM public.board_pack_distributions d
          JOIN public.board_members m ON m.member_id = d.member_id
          WHERE m.auth_user_id = auth.uid()
            AND m.departure_date IS NULL
            AND m.nda_status = 'on_file'
            AND d.access_revoked_at IS NULL
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_pack_sections' AND policyname='bps_exec_admin_all') THEN
    CREATE POLICY "bps_exec_admin_all" ON public.board_pack_sections FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;

  -- Artifacts: exec admin all; board members cannot SELECT row metadata directly
  -- (they access via signed download URLs served by edge function)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_pack_artifacts' AND policyname='bpa_exec_admin_all') THEN
    CREATE POLICY "bpa_exec_admin_all" ON public.board_pack_artifacts FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;

  -- Board members: exec admin rw; board_member role sees own row
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_members' AND policyname='bm_exec_admin_all') THEN
    CREATE POLICY "bm_exec_admin_all" ON public.board_members FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_members' AND policyname='bm_self_read') THEN
    CREATE POLICY "bm_self_read" ON public.board_members FOR SELECT TO authenticated
      USING (auth_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_meetings' AND policyname='bme_exec_admin_all') THEN
    CREATE POLICY "bme_exec_admin_all" ON public.board_meetings FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_meetings' AND policyname='bme_attendee_read') THEN
    CREATE POLICY "bme_attendee_read" ON public.board_meetings FOR SELECT TO authenticated
      USING (
        (SELECT member_id FROM public.board_members WHERE auth_user_id = auth.uid() LIMIT 1) = ANY(attendees)
      );
  END IF;

  -- Distributions: exec admin rw; board member SELECT own only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_pack_distributions' AND policyname='bpd_exec_admin_all') THEN
    CREATE POLICY "bpd_exec_admin_all" ON public.board_pack_distributions FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_pack_distributions' AND policyname='bpd_board_member_read_own') THEN
    CREATE POLICY "bpd_board_member_read_own" ON public.board_pack_distributions FOR SELECT TO authenticated
      USING (
        member_id IN (SELECT member_id FROM public.board_members WHERE auth_user_id = auth.uid())
        AND access_revoked_at IS NULL
      );
  END IF;

  -- Download events: board member INSERT own; exec admin SELECT all; service bypass
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_pack_download_events' AND policyname='bpde_member_insert_own') THEN
    CREATE POLICY "bpde_member_insert_own" ON public.board_pack_download_events FOR INSERT TO authenticated
      WITH CHECK (
        distribution_id IN (
          SELECT d.distribution_id FROM public.board_pack_distributions d
          JOIN public.board_members m ON m.member_id = d.member_id
          WHERE m.auth_user_id = auth.uid()
            AND m.departure_date IS NULL
            AND m.nda_status = 'on_file'
            AND d.access_revoked_at IS NULL
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='board_pack_download_events' AND policyname='bpde_exec_admin_read') THEN
    CREATE POLICY "bpde_exec_admin_read" ON public.board_pack_download_events FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;

  -- Audit log: exec admin read; service write only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='executive_reporting_audit_log' AND policyname='eral_exec_admin_read') THEN
    CREATE POLICY "eral_exec_admin_read" ON public.executive_reporting_audit_log FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','cfo','ceo','exec_reporting_admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='executive_reporting_audit_log' AND policyname='eral_service_write') THEN
    CREATE POLICY "eral_service_write" ON public.executive_reporting_audit_log FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END $$;
