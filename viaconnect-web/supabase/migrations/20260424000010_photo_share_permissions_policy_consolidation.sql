-- =============================================================================
-- Performance advisor remediation: photo_share_permissions policy consolidation
-- =============================================================================
-- Cuts 6 of the 30 multiple_permissive_policies WARN advisor findings.
--
-- Prior state had two overlapping permissive policies:
--   "User manages own shares"                  FOR ALL    (auth.uid() = photo_session_user_id)
--   "Practitioner reads shares granted to them" FOR SELECT (auth.uid() = practitioner_id)
-- The overlap fires on SELECT for every authenticated user (advisor flags
-- it for SELECT * commands; owner triggers BOTH the FOR ALL and the
-- explicit FOR SELECT, practitioner triggers FOR SELECT alone).
--
-- Replacement: split into per-command policies that do not overlap.
--   FOR SELECT  : owner OR practitioner can read
--   FOR INSERT  : owner only
--   FOR UPDATE  : owner only
--   FOR DELETE  : owner only
-- Semantics preserved exactly; warning eliminated.
--
-- Also fixes an autoheal artifact: the prior policies had ~95 nested
-- (SELECT (SELECT (SELECT auth.uid()))) layers from repeated autoheal
-- runs. Reduced to a single (SELECT auth.uid()) per the official
-- auth_rls_initplan recommendation.
-- =============================================================================

DROP POLICY IF EXISTS "User manages own shares"                  ON public.photo_share_permissions;
DROP POLICY IF EXISTS "Practitioner reads shares granted to them" ON public.photo_share_permissions;

CREATE POLICY photo_share_permissions_select_owner_or_practitioner
  ON public.photo_share_permissions FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = photo_session_user_id
    OR (SELECT auth.uid()) = practitioner_id
  );

CREATE POLICY photo_share_permissions_insert_owner
  ON public.photo_share_permissions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = photo_session_user_id);

CREATE POLICY photo_share_permissions_update_owner
  ON public.photo_share_permissions FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = photo_session_user_id)
  WITH CHECK ((SELECT auth.uid()) = photo_session_user_id);

CREATE POLICY photo_share_permissions_delete_owner
  ON public.photo_share_permissions FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = photo_session_user_id);
