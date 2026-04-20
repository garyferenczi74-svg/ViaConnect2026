-- Prompt #102 RLS across all 12 new tables.
-- Uses profiles.role pattern (user_roles table does not exist in this
-- codebase). Practitioners see their own rows; admins see all;
-- payout_batches admin-only.

ALTER TABLE public.practitioner_verified_channels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_verification_attempts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_volume_checks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_tax_documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_payout_methods          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_reconciliation_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_reconciliation_lines      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batches                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batch_lines                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_transactions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_statements              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_disputes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practitioner_operations_audit_log    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Channels
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='practitioner_verified_channels' AND policyname='channels_self_rw') THEN
    CREATE POLICY "channels_self_rw" ON public.practitioner_verified_channels FOR ALL TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='channel_verification_attempts' AND policyname='cva_inherit') THEN
    CREATE POLICY "cva_inherit" ON public.channel_verification_attempts FOR ALL TO authenticated
      USING (channel_id IN (SELECT channel_id FROM public.practitioner_verified_channels WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (channel_id IN (SELECT channel_id FROM public.practitioner_verified_channels WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='channel_volume_checks' AND policyname='cvc_read_admin_write') THEN
    CREATE POLICY "cvc_read_admin_write" ON public.channel_volume_checks FOR SELECT TO authenticated
      USING (channel_id IN (SELECT channel_id FROM public.practitioner_verified_channels WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  -- Tax + payment methods
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='practitioner_tax_documents' AND policyname='tax_docs_self_rw') THEN
    CREATE POLICY "tax_docs_self_rw" ON public.practitioner_tax_documents FOR ALL TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_officer')))
      WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='practitioner_payout_methods' AND policyname='payout_methods_self_rw') THEN
    CREATE POLICY "payout_methods_self_rw" ON public.practitioner_payout_methods FOR ALL TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  -- Reconciliation
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commission_reconciliation_runs' AND policyname='crr_self_read') THEN
    CREATE POLICY "crr_self_read" ON public.commission_reconciliation_runs FOR SELECT TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commission_reconciliation_runs' AND policyname='crr_service_all') THEN
    CREATE POLICY "crr_service_all" ON public.commission_reconciliation_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commission_reconciliation_lines' AND policyname='crl_inherit') THEN
    CREATE POLICY "crl_inherit" ON public.commission_reconciliation_lines FOR SELECT TO authenticated
      USING (run_id IN (SELECT run_id FROM public.commission_reconciliation_runs WHERE practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid())) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='commission_reconciliation_lines' AND policyname='crl_service_all') THEN
    CREATE POLICY "crl_service_all" ON public.commission_reconciliation_lines FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Payout batches: admin only, practitioners see their own line subset
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payout_batches' AND policyname='payout_batches_admin_only') THEN
    CREATE POLICY "payout_batches_admin_only" ON public.payout_batches FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payout_batch_lines' AND policyname='pbl_practitioner_read_admin_full') THEN
    CREATE POLICY "pbl_practitioner_read_admin_full" ON public.payout_batch_lines FOR SELECT TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payout_batch_lines' AND policyname='pbl_admin_all') THEN
    CREATE POLICY "pbl_admin_all" ON public.payout_batch_lines FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payout_transactions' AND policyname='pt_admin_only') THEN
    CREATE POLICY "pt_admin_only" ON public.payout_transactions FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  -- Statements
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='practitioner_statements' AND policyname='statements_self_read') THEN
    CREATE POLICY "statements_self_read" ON public.practitioner_statements FOR SELECT TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  -- Disputes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payout_disputes' AND policyname='disputes_self_rw') THEN
    CREATE POLICY "disputes_self_rw" ON public.payout_disputes FOR ALL TO authenticated
      USING (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (practitioner_id IN (SELECT id FROM public.practitioners WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  -- Audit log: admin read, service write
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='practitioner_operations_audit_log' AND policyname='poal_admin_read') THEN
    CREATE POLICY "poal_admin_read" ON public.practitioner_operations_audit_log FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='practitioner_operations_audit_log' AND policyname='poal_service_write') THEN
    CREATE POLICY "poal_service_write" ON public.practitioner_operations_audit_log FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END $$;
