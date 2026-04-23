-- =============================================================================
-- Prompt #112 Phase 1.4: Harden RLS policies flagged by advisor
-- (rls_policy_always_true on audit table INSERT). These three tables are
-- written exclusively from server-side contexts (edge functions + Next.js API
-- routes) that use the service-role client, which bypasses RLS. Tighten the
-- authenticated-role INSERT policies to admin/compliance_admin only to
-- close the permissive surface without breaking any real write path.
-- =============================================================================

DROP POLICY IF EXISTS "inbox_insert_authenticated" ON public.notification_events_inbox;
CREATE POLICY "inbox_insert_admin" ON public.notification_events_inbox FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));

DROP POLICY IF EXISTS "optin_insert_authenticated" ON public.notification_sms_opt_in_log;
CREATE POLICY "optin_insert_admin" ON public.notification_sms_opt_in_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));

DROP POLICY IF EXISTS "nd_insert_authenticated" ON public.notifications_dispatched;
CREATE POLICY "nd_insert_admin" ON public.notifications_dispatched FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','compliance_admin')));
