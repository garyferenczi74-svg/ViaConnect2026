-- MANUAL TEMPLATE. Not a migration. Gary applies this file by hand.
-- Regenerate it from a fresh pg_policies snapshot immediately before applying.
-- Each policy has an md5 drift guard. Any mismatch or missing policy RAISES
-- and the single transaction rolls every change back.
--
-- Snapshot id (sha256): df94404d465a08e9c7115038923be79b2ee41fda5f215100234f8f995aabf321
-- Captured: 2026-09-26 ~12:20-12:25 MT (America/Edmonton, UTC-6); captured in 14 ordered pages, row count and total expression chars cross-checked against a single aggregate query (1188 rows, 9,144,121 chars)
--
-- Generator (run from viaconnect-web):
--   node --experimental-strip-types scripts/audit/flatten-auth-policies.ts \
--     --snapshot <pg_policies.json> \
--     --backup <policy-rewrite-backup-earliest.json> \
--     --merges <autoheal-merges.json> \
--     --migrations supabase/migrations \
--     --out supabase/manual/flatten_auth_uid_policies.sql \
--     --summary-out <summary.json>
--
-- ALTER POLICY only. No DROP POLICY, no CREATE POLICY.
-- One transaction. SET LOCAL lock_timeout and statement_timeout.
-- No per-table commit. No session-level SET.
-- Held tables are omitted: public.engagement_score_snapshots.
-- See supabase/audit/2026-09-26-policy-diff.md.
--
-- Needs Gary approval before applying.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';

-- policy public.advisor_peptide_shares :: peptide_shares_patient_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."advisor_peptide_shares"'::regclass
     AND polname = 'peptide_shares_patient_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'peptide_shares_patient_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'fbad55f8031ef94e9e148a55edf98079' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'peptide_shares_patient_insert', qual_hash, NULL, check_hash, 'fbad55f8031ef94e9e148a55edf98079';
  END IF;
END
$guard$;
ALTER POLICY "peptide_shares_patient_insert" ON "public"."advisor_peptide_shares"
  WITH CHECK (((patient_id = ( SELECT auth.uid() AS uid)) AND (length(peptide_name) > 0) AND (length(original_question) > 0) AND (length(advisor_response) > 0) AND (EXISTS ( SELECT 1
   FROM protocol_shares ps
  WHERE ((ps.patient_id = ( SELECT auth.uid() AS uid)) AND (ps.provider_id = advisor_peptide_shares.practitioner_id) AND (ps.status = 'active'::text))))));

-- policy public.advisor_peptide_shares :: peptide_shares_practitioner_update
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."advisor_peptide_shares"'::regclass
     AND polname = 'peptide_shares_practitioner_update';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'peptide_shares_practitioner_update';
  END IF;
  IF qual_hash IS DISTINCT FROM 'f505318a6d67077fef195ee1a9cfe2be' OR check_hash IS DISTINCT FROM 'f9ecfae2750d9f3959f7059f0407feaf' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'peptide_shares_practitioner_update', qual_hash, 'f505318a6d67077fef195ee1a9cfe2be', check_hash, 'f9ecfae2750d9f3959f7059f0407feaf';
  END IF;
END
$guard$;
ALTER POLICY "peptide_shares_practitioner_update" ON "public"."advisor_peptide_shares"
  USING ((practitioner_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK (((practitioner_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['pending_review'::text, 'reviewed'::text, 'approved_for_protocol'::text, 'dismissed'::text]))));

-- policy public.advisor_peptide_shares :: peptide_shares_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."advisor_peptide_shares"'::regclass
     AND polname = 'peptide_shares_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'peptide_shares_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '0cad6547a089f66a0155476eb35c9cab' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'peptide_shares_read', qual_hash, '0cad6547a089f66a0155476eb35c9cab', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "peptide_shares_read" ON "public"."advisor_peptide_shares"
  USING (((patient_id = ( SELECT auth.uid() AS uid)) OR (practitioner_id = ( SELECT auth.uid() AS uid))));

-- policy public.aggregation_snapshots :: agg_snapshots_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."aggregation_snapshots"'::regclass
     AND polname = 'agg_snapshots_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'agg_snapshots_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'agg_snapshots_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "agg_snapshots_exec_admin_all" ON "public"."aggregation_snapshots"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.ai_insights :: Users can insert own ai_insights
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ai_insights"'::regclass
     AND polname = 'Users can insert own ai_insights';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own ai_insights';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own ai_insights', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own ai_insights" ON "public"."ai_insights"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.ai_insights :: Users can update own ai_insights
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ai_insights"'::regclass
     AND polname = 'Users can update own ai_insights';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own ai_insights';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own ai_insights', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own ai_insights" ON "public"."ai_insights"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.ai_insights :: Users can view own ai_insights
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ai_insights"'::regclass
     AND polname = 'Users can view own ai_insights';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own ai_insights';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own ai_insights', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own ai_insights" ON "public"."ai_insights"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.analytics_category_history :: Users view own category history
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."analytics_category_history"'::regclass
     AND polname = 'Users view own category history';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users view own category history';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users view own category history', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users view own category history" ON "public"."analytics_category_history"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.appeal_agreement_rollups :: agreement_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."appeal_agreement_rollups"'::regclass
     AND polname = 'agreement_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'agreement_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '9e9a4880ec685dd546e3ce492fe2e128' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'agreement_admin_read', qual_hash, '9e9a4880ec685dd546e3ce492fe2e128', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "agreement_admin_read" ON "public"."appeal_agreement_rollups"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['compliance_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.appeal_analyses :: appeals_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."appeal_analyses"'::regclass
     AND polname = 'appeals_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'appeals_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '9e9a4880ec685dd546e3ce492fe2e128' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'appeals_admin_read', qual_hash, '9e9a4880ec685dd546e3ce492fe2e128', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "appeals_admin_read" ON "public"."appeal_analyses"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['compliance_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.appeal_decisions :: decisions_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."appeal_decisions"'::regclass
     AND polname = 'decisions_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'decisions_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '9e9a4880ec685dd546e3ce492fe2e128' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'decisions_admin_read', qual_hash, '9e9a4880ec685dd546e3ce492fe2e128', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "decisions_admin_read" ON "public"."appeal_decisions"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['compliance_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.appeal_drafts :: drafts_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."appeal_drafts"'::regclass
     AND polname = 'drafts_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'drafts_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '9e9a4880ec685dd546e3ce492fe2e128' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'drafts_admin_read', qual_hash, '9e9a4880ec685dd546e3ce492fe2e128', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "drafts_admin_read" ON "public"."appeal_drafts"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['compliance_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.appeal_patterns :: patterns_admin_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."appeal_patterns"'::regclass
     AND polname = 'patterns_admin_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'patterns_admin_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM '9e9a4880ec685dd546e3ce492fe2e128' OR check_hash IS DISTINCT FROM '9e9a4880ec685dd546e3ce492fe2e128' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'patterns_admin_rw', qual_hash, '9e9a4880ec685dd546e3ce492fe2e128', check_hash, '9e9a4880ec685dd546e3ce492fe2e128';
  END IF;
END
$guard$;
ALTER POLICY "patterns_admin_rw" ON "public"."appeal_patterns"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['compliance_admin'::text, 'admin'::text, 'superadmin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['compliance_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.approver_assignments :: approver_assignments_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."approver_assignments"'::regclass
     AND polname = 'approver_assignments_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'approver_assignments_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'approver_assignments_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "approver_assignments_admin_all" ON "public"."approver_assignments"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.assessment_results :: Users manage own assessment results
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."assessment_results"'::regclass
     AND polname = 'Users manage own assessment results';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own assessment results';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own assessment results', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own assessment results" ON "public"."assessment_results"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.audit_logs :: Only admins can view audit logs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."audit_logs"'::regclass
     AND polname = 'Only admins can view audit logs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Only admins can view audit logs';
  END IF;
  IF qual_hash IS DISTINCT FROM 'aa658ceb4e319d6b766c2d5a4264e6d1' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Only admins can view audit logs', qual_hash, 'aa658ceb4e319d6b766c2d5a4264e6d1', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Only admins can view audit logs" ON "public"."audit_logs"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.bio_optimization_history :: bos_history_select_own
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."bio_optimization_history"'::regclass
     AND polname = 'bos_history_select_own';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bos_history_select_own';
  END IF;
  IF qual_hash IS DISTINCT FROM 'ec68dbfa672605315583adc7d792266f' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bos_history_select_own', qual_hash, 'ec68dbfa672605315583adc7d792266f', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "bos_history_select_own" ON "public"."bio_optimization_history"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.board_meetings :: bme_attendee_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_meetings"'::regclass
     AND polname = 'bme_attendee_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bme_attendee_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c559c5f53fafcddc44e4e8fbc73516d5' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bme_attendee_read', qual_hash, 'c559c5f53fafcddc44e4e8fbc73516d5', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "bme_attendee_read" ON "public"."board_meetings"
  USING ((( SELECT board_members.member_id
   FROM board_members
  WHERE (board_members.auth_user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = ANY (attendees)));

-- policy public.board_meetings :: bme_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_meetings"'::regclass
     AND polname = 'bme_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bme_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bme_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "bme_exec_admin_all" ON "public"."board_meetings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.board_members :: bm_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_members"'::regclass
     AND polname = 'bm_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bm_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bm_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "bm_exec_admin_all" ON "public"."board_members"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.board_members :: bm_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_members"'::regclass
     AND polname = 'bm_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bm_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '8ff1059a7859afbb037b1c873c370b8b' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bm_self_read', qual_hash, '8ff1059a7859afbb037b1c873c370b8b', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "bm_self_read" ON "public"."board_members"
  USING ((auth_user_id = ( SELECT auth.uid() AS uid)));

-- policy public.board_pack_ai_prompts :: bpap_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_pack_ai_prompts"'::regclass
     AND polname = 'bpap_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bpap_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bpap_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "bpap_exec_admin_all" ON "public"."board_pack_ai_prompts"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.board_pack_artifacts :: bpa_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_pack_artifacts"'::regclass
     AND polname = 'bpa_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bpa_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bpa_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "bpa_exec_admin_all" ON "public"."board_pack_artifacts"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.board_pack_distributions :: bpd_board_member_read_own
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_pack_distributions"'::regclass
     AND polname = 'bpd_board_member_read_own';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bpd_board_member_read_own';
  END IF;
  IF qual_hash IS DISTINCT FROM 'aab144ccdf27940cf702811c58daa8a7' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bpd_board_member_read_own', qual_hash, 'aab144ccdf27940cf702811c58daa8a7', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "bpd_board_member_read_own" ON "public"."board_pack_distributions"
  USING (((member_id IN ( SELECT board_members.member_id
   FROM board_members
  WHERE (board_members.auth_user_id = ( SELECT auth.uid() AS uid)))) AND (access_revoked_at IS NULL)));

-- policy public.board_pack_distributions :: bpd_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_pack_distributions"'::regclass
     AND polname = 'bpd_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bpd_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bpd_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "bpd_exec_admin_all" ON "public"."board_pack_distributions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.board_pack_download_events :: bpde_exec_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_pack_download_events"'::regclass
     AND polname = 'bpde_exec_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bpde_exec_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bpde_exec_admin_read', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "bpde_exec_admin_read" ON "public"."board_pack_download_events"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.board_pack_download_events :: bpde_member_insert_own
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_pack_download_events"'::regclass
     AND polname = 'bpde_member_insert_own';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bpde_member_insert_own';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'e17e57f787fded7c4f8fc12e6c1d3962' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bpde_member_insert_own', qual_hash, NULL, check_hash, 'e17e57f787fded7c4f8fc12e6c1d3962';
  END IF;
END
$guard$;
ALTER POLICY "bpde_member_insert_own" ON "public"."board_pack_download_events"
  WITH CHECK ((distribution_id IN ( SELECT d.distribution_id
   FROM (board_pack_distributions d
     JOIN board_members m ON ((m.member_id = d.member_id)))
  WHERE ((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND (m.departure_date IS NULL) AND (m.nda_status = 'on_file'::nda_status) AND (d.access_revoked_at IS NULL)))));

-- policy public.board_pack_kpi_snapshots :: bpks_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_pack_kpi_snapshots"'::regclass
     AND polname = 'bpks_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bpks_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bpks_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "bpks_exec_admin_all" ON "public"."board_pack_kpi_snapshots"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.board_pack_sections :: bps_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_pack_sections"'::regclass
     AND polname = 'bps_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bps_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bps_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "bps_exec_admin_all" ON "public"."board_pack_sections"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.board_pack_templates :: bpt_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_pack_templates"'::regclass
     AND polname = 'bpt_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bpt_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bpt_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "bpt_exec_admin_all" ON "public"."board_pack_templates"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.board_packs :: bp_board_member_distributed
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_packs"'::regclass
     AND polname = 'bp_board_member_distributed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bp_board_member_distributed';
  END IF;
  IF qual_hash IS DISTINCT FROM 'daacf8c5c00463c25abd42094ba1dcc5' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bp_board_member_distributed', qual_hash, 'daacf8c5c00463c25abd42094ba1dcc5', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "bp_board_member_distributed" ON "public"."board_packs"
  USING ((pack_id IN ( SELECT d.pack_id
   FROM (board_pack_distributions d
     JOIN board_members m ON ((m.member_id = d.member_id)))
  WHERE ((m.auth_user_id = ( SELECT auth.uid() AS uid)) AND (m.departure_date IS NULL) AND (m.nda_status = 'on_file'::nda_status) AND (d.access_revoked_at IS NULL)))));

-- policy public.board_packs :: bp_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."board_packs"'::regclass
     AND polname = 'bp_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bp_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bp_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "bp_exec_admin_all" ON "public"."board_packs"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.body_graphic_interactions :: bgi_self_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_graphic_interactions"'::regclass
     AND polname = 'bgi_self_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bgi_self_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'ba1e66586ff0f093a4dd62e07f6b12da' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bgi_self_insert', qual_hash, NULL, check_hash, 'ba1e66586ff0f093a4dd62e07f6b12da';
  END IF;
END
$guard$;
ALTER POLICY "bgi_self_insert" ON "public"."body_graphic_interactions"
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.body_graphic_interactions :: bgi_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_graphic_interactions"'::regclass
     AND polname = 'bgi_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bgi_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c632d00a1ff3cba81f9455a8363d9ffc' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bgi_self_read', qual_hash, 'c632d00a1ff3cba81f9455a8363d9ffc', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "bgi_self_read" ON "public"."body_graphic_interactions"
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.body_graphics_preferences :: bgp_self_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_graphics_preferences"'::regclass
     AND polname = 'bgp_self_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bgp_self_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM 'ba1e66586ff0f093a4dd62e07f6b12da' OR check_hash IS DISTINCT FROM 'ba1e66586ff0f093a4dd62e07f6b12da' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bgp_self_rw', qual_hash, 'ba1e66586ff0f093a4dd62e07f6b12da', check_hash, 'ba1e66586ff0f093a4dd62e07f6b12da';
  END IF;
END
$guard$;
ALTER POLICY "bgp_self_rw" ON "public"."body_graphics_preferences"
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.body_photo_sessions :: Users manage own photo sessions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_photo_sessions"'::regclass
     AND polname = 'Users manage own photo sessions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own photo sessions';
  END IF;
  IF qual_hash IS DISTINCT FROM '6cc48c8ae117c32c8307e7e8a1ce8553' OR check_hash IS DISTINCT FROM '6cc48c8ae117c32c8307e7e8a1ce8553' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own photo sessions', qual_hash, '6cc48c8ae117c32c8307e7e8a1ce8553', check_hash, '6cc48c8ae117c32c8307e7e8a1ce8553';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own photo sessions" ON "public"."body_photo_sessions"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_scan_measurements :: Users manage own scan measurements
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_scan_measurements"'::regclass
     AND polname = 'Users manage own scan measurements';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own scan measurements';
  END IF;
  IF qual_hash IS DISTINCT FROM '6cc48c8ae117c32c8307e7e8a1ce8553' OR check_hash IS DISTINCT FROM '6cc48c8ae117c32c8307e7e8a1ce8553' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own scan measurements', qual_hash, '6cc48c8ae117c32c8307e7e8a1ce8553', check_hash, '6cc48c8ae117c32c8307e7e8a1ce8553';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own scan measurements" ON "public"."body_scan_measurements"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_activity :: Users own activity
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_activity"'::regclass
     AND polname = 'Users own activity';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users own activity';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users own activity', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, '9ad14b2b86b8b04fa98c04698e3e99b1';
  END IF;
END
$guard$;
ALTER POLICY "Users own activity" ON "public"."body_tracker_activity"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_chronic_risk :: Users own chronic risk
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_chronic_risk"'::regclass
     AND polname = 'Users own chronic risk';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users own chronic risk';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users own chronic risk', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, '9ad14b2b86b8b04fa98c04698e3e99b1';
  END IF;
END
$guard$;
ALTER POLICY "Users own chronic risk" ON "public"."body_tracker_chronic_risk"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_circumference :: Users manage own bt circumference
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_circumference"'::regclass
     AND polname = 'Users manage own bt circumference';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own bt circumference';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own bt circumference', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, '9ad14b2b86b8b04fa98c04698e3e99b1';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own bt circumference" ON "public"."body_tracker_circumference"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_entries :: Users manage own bt entries
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_entries"'::regclass
     AND polname = 'Users manage own bt entries';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own bt entries';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own bt entries', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own bt entries" ON "public"."body_tracker_entries"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_journey_events :: Users own bt journey events
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_journey_events"'::regclass
     AND polname = 'Users own bt journey events';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users own bt journey events';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users own bt journey events', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, '9ad14b2b86b8b04fa98c04698e3e99b1';
  END IF;
END
$guard$;
ALTER POLICY "Users own bt journey events" ON "public"."body_tracker_journey_events"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_journeys :: Users own journeys
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_journeys"'::regclass
     AND polname = 'Users own journeys';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users own journeys';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users own journeys', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, '9ad14b2b86b8b04fa98c04698e3e99b1';
  END IF;
END
$guard$;
ALTER POLICY "Users own journeys" ON "public"."body_tracker_journeys"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_metabolic :: Users manage own bt metabolic
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_metabolic"'::regclass
     AND polname = 'Users manage own bt metabolic';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own bt metabolic';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own bt metabolic', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own bt metabolic" ON "public"."body_tracker_metabolic"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_milestones :: Users manage own bt milestones
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_milestones"'::regclass
     AND polname = 'Users manage own bt milestones';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own bt milestones';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own bt milestones', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own bt milestones" ON "public"."body_tracker_milestones"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_photo_scans :: Users own photo scans
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_photo_scans"'::regclass
     AND polname = 'Users own photo scans';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users own photo scans';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users own photo scans', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, '9ad14b2b86b8b04fa98c04698e3e99b1';
  END IF;
END
$guard$;
ALTER POLICY "Users own photo scans" ON "public"."body_tracker_photo_scans"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_recommendations :: Users own bt recommendations
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_recommendations"'::regclass
     AND polname = 'Users own bt recommendations';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users own bt recommendations';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users own bt recommendations', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, '9ad14b2b86b8b04fa98c04698e3e99b1';
  END IF;
END
$guard$;
ALTER POLICY "Users own bt recommendations" ON "public"."body_tracker_recommendations"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_scores :: Users manage own bt scores
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_scores"'::regclass
     AND polname = 'Users manage own bt scores';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own bt scores';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own bt scores', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own bt scores" ON "public"."body_tracker_scores"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_segmental_fat :: Users manage own bt seg fat
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_segmental_fat"'::regclass
     AND polname = 'Users manage own bt seg fat';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own bt seg fat';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own bt seg fat', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own bt seg fat" ON "public"."body_tracker_segmental_fat"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_segmental_muscle :: Users manage own bt seg muscle
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_segmental_muscle"'::regclass
     AND polname = 'Users manage own bt seg muscle';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own bt seg muscle';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own bt seg muscle', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own bt seg muscle" ON "public"."body_tracker_segmental_muscle"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_user_state :: Users own bt user state
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_user_state"'::regclass
     AND polname = 'Users own bt user state';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users own bt user state';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users own bt user state', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, '9ad14b2b86b8b04fa98c04698e3e99b1';
  END IF;
END
$guard$;
ALTER POLICY "Users own bt user state" ON "public"."body_tracker_user_state"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.body_tracker_weight :: Users manage own bt weight
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."body_tracker_weight"'::regclass
     AND polname = 'Users manage own bt weight';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own bt weight';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own bt weight', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own bt weight" ON "public"."body_tracker_weight"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.bos_compute_queue :: bos_queue_insert_own
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."bos_compute_queue"'::regclass
     AND polname = 'bos_queue_insert_own';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bos_queue_insert_own';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'ec68dbfa672605315583adc7d792266f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bos_queue_insert_own', qual_hash, NULL, check_hash, 'ec68dbfa672605315583adc7d792266f';
  END IF;
END
$guard$;
ALTER POLICY "bos_queue_insert_own" ON "public"."bos_compute_queue"
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.bos_compute_queue :: bos_queue_select_own
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."bos_compute_queue"'::regclass
     AND polname = 'bos_queue_select_own';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bos_queue_select_own';
  END IF;
  IF qual_hash IS DISTINCT FROM 'ec68dbfa672605315583adc7d792266f' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bos_queue_select_own', qual_hash, 'ec68dbfa672605315583adc7d792266f', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "bos_queue_select_own" ON "public"."bos_compute_queue"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.bos_write_telemetry :: bos_telemetry_insert_observability
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."bos_write_telemetry"'::regclass
     AND polname = 'bos_telemetry_insert_observability';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'bos_telemetry_insert_observability';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '0165b20e43915d2c4261d50de92611f3' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'bos_telemetry_insert_observability', qual_hash, NULL, check_hash, '0165b20e43915d2c4261d50de92611f3';
  END IF;
END
$guard$;
ALTER POLICY "bos_telemetry_insert_observability" ON "public"."bos_write_telemetry"
  WITH CHECK (((is_canonical = false) AND (user_id = ( SELECT auth.uid() AS uid))));

-- policy public.botanical_formula_items :: Items insertable with formula access
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."botanical_formula_items"'::regclass
     AND polname = 'Items insertable with formula access';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Items insertable with formula access';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '04d1cbc28f85373716ba62455f6eb680' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Items insertable with formula access', qual_hash, NULL, check_hash, '04d1cbc28f85373716ba62455f6eb680';
  END IF;
END
$guard$;
ALTER POLICY "Items insertable with formula access" ON "public"."botanical_formula_items"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM botanical_formulas
  WHERE ((botanical_formulas.id = botanical_formula_items.formula_id) AND (botanical_formulas.practitioner_id = ( SELECT auth.uid() AS uid))))));

-- policy public.botanical_formula_items :: Items viewable with formula access
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."botanical_formula_items"'::regclass
     AND polname = 'Items viewable with formula access';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Items viewable with formula access';
  END IF;
  IF qual_hash IS DISTINCT FROM '04d1cbc28f85373716ba62455f6eb680' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Items viewable with formula access', qual_hash, '04d1cbc28f85373716ba62455f6eb680', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Items viewable with formula access" ON "public"."botanical_formula_items"
  USING ((EXISTS ( SELECT 1
   FROM botanical_formulas
  WHERE ((botanical_formulas.id = botanical_formula_items.formula_id) AND (botanical_formulas.practitioner_id = ( SELECT auth.uid() AS uid))))));

-- policy public.botanical_formulas :: Practitioners can insert formulas
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."botanical_formulas"'::regclass
     AND polname = 'Practitioners can insert formulas';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Practitioners can insert formulas';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '0cd81013f150c7314469bb69b49862d3' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Practitioners can insert formulas', qual_hash, NULL, check_hash, '0cd81013f150c7314469bb69b49862d3';
  END IF;
END
$guard$;
ALTER POLICY "Practitioners can insert formulas" ON "public"."botanical_formulas"
  WITH CHECK ((( SELECT auth.uid() AS uid) = practitioner_id));

-- policy public.botanical_formulas :: Practitioners can update own formulas
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."botanical_formulas"'::regclass
     AND polname = 'Practitioners can update own formulas';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Practitioners can update own formulas';
  END IF;
  IF qual_hash IS DISTINCT FROM '0cd81013f150c7314469bb69b49862d3' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Practitioners can update own formulas', qual_hash, '0cd81013f150c7314469bb69b49862d3', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Practitioners can update own formulas" ON "public"."botanical_formulas"
  USING ((( SELECT auth.uid() AS uid) = practitioner_id));

-- policy public.botanical_formulas :: Practitioners can view own formulas
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."botanical_formulas"'::regclass
     AND polname = 'Practitioners can view own formulas';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Practitioners can view own formulas';
  END IF;
  IF qual_hash IS DISTINCT FROM '0cd81013f150c7314469bb69b49862d3' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Practitioners can view own formulas', qual_hash, '0cd81013f150c7314469bb69b49862d3', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Practitioners can view own formulas" ON "public"."botanical_formulas"
  USING ((( SELECT auth.uid() AS uid) = practitioner_id));

-- policy public.bundles :: Authenticated read bundles
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."bundles"'::regclass
     AND polname = 'Authenticated read bundles';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Authenticated read bundles';
  END IF;
  IF qual_hash IS DISTINCT FROM 'fe6be3363cff74e318b02a2651158dac' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Authenticated read bundles', qual_hash, 'fe6be3363cff74e318b02a2651158dac', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Authenticated read bundles" ON "public"."bundles"
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

-- policy public.caq_assessment_versions :: Users manage own assessments
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."caq_assessment_versions"'::regclass
     AND polname = 'Users manage own assessments';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own assessments';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own assessments', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own assessments" ON "public"."caq_assessment_versions"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.channel_verification_attempts :: cva_inherit
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."channel_verification_attempts"'::regclass
     AND polname = 'cva_inherit';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cva_inherit';
  END IF;
  IF qual_hash IS DISTINCT FROM '2c60913d872b542064621d8c970193da' OR check_hash IS DISTINCT FROM '2c60913d872b542064621d8c970193da' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cva_inherit', qual_hash, '2c60913d872b542064621d8c970193da', check_hash, '2c60913d872b542064621d8c970193da';
  END IF;
END
$guard$;
ALTER POLICY "cva_inherit" ON "public"."channel_verification_attempts"
  USING (((channel_id IN ( SELECT practitioner_verified_channels.channel_id
   FROM practitioner_verified_channels
  WHERE (practitioner_verified_channels.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((channel_id IN ( SELECT practitioner_verified_channels.channel_id
   FROM practitioner_verified_channels
  WHERE (practitioner_verified_channels.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.channel_volume_checks :: cvc_read_admin_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."channel_volume_checks"'::regclass
     AND polname = 'cvc_read_admin_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cvc_read_admin_write';
  END IF;
  IF qual_hash IS DISTINCT FROM '2c60913d872b542064621d8c970193da' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cvc_read_admin_write', qual_hash, '2c60913d872b542064621d8c970193da', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "cvc_read_admin_write" ON "public"."channel_volume_checks"
  USING (((channel_id IN ( SELECT practitioner_verified_channels.channel_id
   FROM practitioner_verified_channels
  WHERE (practitioner_verified_channels.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.clinical_assessments :: Users can insert own assessment
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."clinical_assessments"'::regclass
     AND polname = 'Users can insert own assessment';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own assessment';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own assessment', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own assessment" ON "public"."clinical_assessments"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.clinical_assessments :: Users can update own assessment
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."clinical_assessments"'::regclass
     AND polname = 'Users can update own assessment';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own assessment';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own assessment', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own assessment" ON "public"."clinical_assessments"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.clinical_assessments :: Users can view own assessment
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."clinical_assessments"'::regclass
     AND polname = 'Users can view own assessment';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own assessment';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own assessment', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own assessment" ON "public"."clinical_assessments"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.commission_accruals :: commission_accruals_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."commission_accruals"'::regclass
     AND polname = 'commission_accruals_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'commission_accruals_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'commission_accruals_self_read', qual_hash, '5d732ce63416021ad0328c12dc5fde80', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "commission_accruals_self_read" ON "public"."commission_accruals"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.commission_reconciliation_lines :: crl_inherit
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."commission_reconciliation_lines"'::regclass
     AND polname = 'crl_inherit';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'crl_inherit';
  END IF;
  IF qual_hash IS DISTINCT FROM '5ee377a68e2d566fb2d5c17983a652ff' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'crl_inherit', qual_hash, '5ee377a68e2d566fb2d5c17983a652ff', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "crl_inherit" ON "public"."commission_reconciliation_lines"
  USING (((run_id IN ( SELECT commission_reconciliation_runs.run_id
   FROM commission_reconciliation_runs
  WHERE (commission_reconciliation_runs.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.commission_reconciliation_runs :: crr_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."commission_reconciliation_runs"'::regclass
     AND polname = 'crr_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'crr_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'crr_self_read', qual_hash, '5d732ce63416021ad0328c12dc5fde80', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "crr_self_read" ON "public"."commission_reconciliation_runs"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.competitor_pricing :: competitor_pricing_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."competitor_pricing"'::regclass
     AND polname = 'competitor_pricing_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'competitor_pricing_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'competitor_pricing_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "competitor_pricing_admin_all" ON "public"."competitor_pricing"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.compliance_findings :: cf_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."compliance_findings"'::regclass
     AND polname = 'cf_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cf_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b5f84cefee7813cd33a25dad0f4ceb61' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cf_read', qual_hash, 'b5f84cefee7813cd33a25dad0f4ceb61', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "cf_read" ON "public"."compliance_findings"
  USING ((is_compliance_reader() OR (assigned_to = ( SELECT auth.uid() AS uid))));

-- policy public.compliance_waivers :: cw_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."compliance_waivers"'::regclass
     AND polname = 'cw_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cw_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'd73fc2400b7849ea7964670e9d6052a4' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cw_insert', qual_hash, NULL, check_hash, 'd73fc2400b7849ea7964670e9d6052a4';
  END IF;
END
$guard$;
ALTER POLICY "cw_insert" ON "public"."compliance_waivers"
  WITH CHECK ((is_compliance_reader() AND (approved_by = ( SELECT auth.uid() AS uid))));

-- policy public.consent_ledger :: cl_self_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."consent_ledger"'::regclass
     AND polname = 'cl_self_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cl_self_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '55995e46f86cffc3090a3705ce330bf1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cl_self_insert', qual_hash, NULL, check_hash, '55995e46f86cffc3090a3705ce330bf1';
  END IF;
END
$guard$;
ALTER POLICY "cl_self_insert" ON "public"."consent_ledger"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.consent_ledger :: cl_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."consent_ledger"'::regclass
     AND polname = 'cl_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cl_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '8ac3b1c552baab00ecff55e4888cfceb' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cl_self_read', qual_hash, '8ac3b1c552baab00ecff55e4888cfceb', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "cl_self_read" ON "public"."consent_ledger"
  USING (((( SELECT auth.uid() AS uid) = user_id) OR is_compliance_reader()));

-- policy public.consent_ledger :: cl_self_update
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."consent_ledger"'::regclass
     AND polname = 'cl_self_update';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cl_self_update';
  END IF;
  IF qual_hash IS DISTINCT FROM '55995e46f86cffc3090a3705ce330bf1' OR check_hash IS DISTINCT FROM '55995e46f86cffc3090a3705ce330bf1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cl_self_update', qual_hash, '55995e46f86cffc3090a3705ce330bf1', check_hash, '55995e46f86cffc3090a3705ce330bf1';
  END IF;
END
$guard$;
ALTER POLICY "cl_self_update" ON "public"."consent_ledger"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.consumer_counterfeit_reports :: consumer_report_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."consumer_counterfeit_reports"'::regclass
     AND polname = 'consumer_report_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'consumer_report_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'fc9f76b1d1a459e606f687a24890cb1b' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'consumer_report_insert', qual_hash, NULL, check_hash, 'fc9f76b1d1a459e606f687a24890cb1b';
  END IF;
END
$guard$;
ALTER POLICY "consumer_report_insert" ON "public"."consumer_counterfeit_reports"
  WITH CHECK (((submitted_by_user_id = ( SELECT auth.uid() AS uid)) OR (submitted_by_user_id IS NULL)));

-- policy public.consumer_counterfeit_reports :: consumer_report_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."consumer_counterfeit_reports"'::regclass
     AND polname = 'consumer_report_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'consumer_report_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '0b579a896fbffe20c08524db9b93ffac' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'consumer_report_self_read', qual_hash, '0b579a896fbffe20c08524db9b93ffac', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "consumer_report_self_read" ON "public"."consumer_counterfeit_reports"
  USING (((submitted_by_user_id = ( SELECT auth.uid() AS uid)) OR is_compliance_reader()));

-- policy public.counterfeit_dispositions :: dispositions_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."counterfeit_dispositions"'::regclass
     AND polname = 'dispositions_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'dispositions_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b2754a7631180ce383b9c6924c058e7c' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'dispositions_insert', qual_hash, NULL, check_hash, 'b2754a7631180ce383b9c6924c058e7c';
  END IF;
END
$guard$;
ALTER POLICY "dispositions_insert" ON "public"."counterfeit_dispositions"
  WITH CHECK (((decided_by = ( SELECT auth.uid() AS uid)) AND is_compliance_reader()));

-- policy public.counterfeit_exemplars :: exemplars_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."counterfeit_exemplars"'::regclass
     AND polname = 'exemplars_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'exemplars_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '6d1803a21e8c922c3a9d541699d203b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'exemplars_insert', qual_hash, NULL, check_hash, '6d1803a21e8c922c3a9d541699d203b8';
  END IF;
END
$guard$;
ALTER POLICY "exemplars_insert" ON "public"."counterfeit_exemplars"
  WITH CHECK (((confirmed_by = ( SELECT auth.uid() AS uid)) AND is_compliance_reader()));

-- policy public.counterfeit_reference_corpus :: crc_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."counterfeit_reference_corpus"'::regclass
     AND polname = 'crc_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'crc_write';
  END IF;
  IF qual_hash IS DISTINCT FROM '8d8508b74d20352b2ef5b1a2fb19c145' OR check_hash IS DISTINCT FROM '8d8508b74d20352b2ef5b1a2fb19c145' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'crc_write', qual_hash, '8d8508b74d20352b2ef5b1a2fb19c145', check_hash, '8d8508b74d20352b2ef5b1a2fb19c145';
  END IF;
END
$guard$;
ALTER POLICY "crc_write" ON "public"."counterfeit_reference_corpus"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))));

-- policy public.counterfeit_test_buys :: test_buys_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."counterfeit_test_buys"'::regclass
     AND polname = 'test_buys_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'test_buys_write';
  END IF;
  IF qual_hash IS DISTINCT FROM '8d8508b74d20352b2ef5b1a2fb19c145' OR check_hash IS DISTINCT FROM '8d8508b74d20352b2ef5b1a2fb19c145' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'test_buys_write', qual_hash, '8d8508b74d20352b2ef5b1a2fb19c145', check_hash, '8d8508b74d20352b2ef5b1a2fb19c145';
  END IF;
END
$guard$;
ALTER POLICY "test_buys_write" ON "public"."counterfeit_test_buys"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))));

-- policy public.custom_formulation_development_fees :: cf_dev_fees_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."custom_formulation_development_fees"'::regclass
     AND polname = 'cf_dev_fees_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cf_dev_fees_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cf_dev_fees_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "cf_dev_fees_admin_all" ON "public"."custom_formulation_development_fees"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.custom_formulation_development_fees :: cf_dev_fees_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."custom_formulation_development_fees"'::regclass
     AND polname = 'cf_dev_fees_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cf_dev_fees_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '5c9265de83b441c96b8b6161f6dd6d47' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cf_dev_fees_self_read', qual_hash, '5c9265de83b441c96b8b6161f6dd6d47', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "cf_dev_fees_self_read" ON "public"."custom_formulation_development_fees"
  USING ((custom_formulation_id IN ( SELECT custom_formulations.id
   FROM custom_formulations
  WHERE (custom_formulations.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))));

-- policy public.custom_formulation_ingredients :: custom_formulation_ingredients_all_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."custom_formulation_ingredients"'::regclass
     AND polname = 'custom_formulation_ingredients_all_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'custom_formulation_ingredients_all_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM '01a342b1cecb60cda6e436b94181e351' OR check_hash IS DISTINCT FROM '01a342b1cecb60cda6e436b94181e351' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'custom_formulation_ingredients_all_merged', qual_hash, '01a342b1cecb60cda6e436b94181e351', check_hash, '01a342b1cecb60cda6e436b94181e351';
  END IF;
END
$guard$;
ALTER POLICY "custom_formulation_ingredients_all_merged" ON "public"."custom_formulation_ingredients"
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))) OR (custom_formulation_id IN ( SELECT custom_formulations.id
   FROM custom_formulations
  WHERE (custom_formulations.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid))))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))) OR (custom_formulation_id IN ( SELECT custom_formulations.id
   FROM custom_formulations
  WHERE (custom_formulations.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid))))))));

-- policy public.custom_formulation_medical_reviews :: cf_medical_review_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."custom_formulation_medical_reviews"'::regclass
     AND polname = 'cf_medical_review_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cf_medical_review_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cf_medical_review_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "cf_medical_review_admin_all" ON "public"."custom_formulation_medical_reviews"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.custom_formulation_medical_reviews :: cf_medical_review_practitioner_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."custom_formulation_medical_reviews"'::regclass
     AND polname = 'cf_medical_review_practitioner_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cf_medical_review_practitioner_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '5c9265de83b441c96b8b6161f6dd6d47' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cf_medical_review_practitioner_read', qual_hash, '5c9265de83b441c96b8b6161f6dd6d47', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "cf_medical_review_practitioner_read" ON "public"."custom_formulation_medical_reviews"
  USING ((custom_formulation_id IN ( SELECT custom_formulations.id
   FROM custom_formulations
  WHERE (custom_formulations.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))));

-- policy public.custom_formulation_regulatory_reviews :: cf_reg_review_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."custom_formulation_regulatory_reviews"'::regclass
     AND polname = 'cf_reg_review_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cf_reg_review_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cf_reg_review_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "cf_reg_review_admin_all" ON "public"."custom_formulation_regulatory_reviews"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.custom_formulation_regulatory_reviews :: cf_reg_review_practitioner_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."custom_formulation_regulatory_reviews"'::regclass
     AND polname = 'cf_reg_review_practitioner_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cf_reg_review_practitioner_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '5c9265de83b441c96b8b6161f6dd6d47' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cf_reg_review_practitioner_read', qual_hash, '5c9265de83b441c96b8b6161f6dd6d47', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "cf_reg_review_practitioner_read" ON "public"."custom_formulation_regulatory_reviews"
  USING ((custom_formulation_id IN ( SELECT custom_formulations.id
   FROM custom_formulations
  WHERE (custom_formulations.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))));

-- policy public.custom_formulation_stability_tests :: cf_stability_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."custom_formulation_stability_tests"'::regclass
     AND polname = 'cf_stability_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cf_stability_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cf_stability_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "cf_stability_admin_all" ON "public"."custom_formulation_stability_tests"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.custom_formulation_stability_tests :: cf_stability_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."custom_formulation_stability_tests"'::regclass
     AND polname = 'cf_stability_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cf_stability_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '5c9265de83b441c96b8b6161f6dd6d47' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cf_stability_self_read', qual_hash, '5c9265de83b441c96b8b6161f6dd6d47', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "cf_stability_self_read" ON "public"."custom_formulation_stability_tests"
  USING ((custom_formulation_id IN ( SELECT custom_formulations.id
   FROM custom_formulations
  WHERE (custom_formulations.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))));

-- policy public.custom_formulations :: custom_formulations_all_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."custom_formulations"'::regclass
     AND polname = 'custom_formulations_all_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'custom_formulations_all_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM '6c31af9003ae2cf4b5f943e2335982e3' OR check_hash IS DISTINCT FROM '6c31af9003ae2cf4b5f943e2335982e3' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'custom_formulations_all_merged', qual_hash, '6c31af9003ae2cf4b5f943e2335982e3', check_hash, '6c31af9003ae2cf4b5f943e2335982e3';
  END IF;
END
$guard$;
ALTER POLICY "custom_formulations_all_merged" ON "public"."custom_formulations"
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))) OR (practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))) OR (practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid))))));

-- policy public.customer_price_bindings :: cpb_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customer_price_bindings"'::regclass
     AND polname = 'cpb_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cpb_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cpb_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "cpb_admin_all" ON "public"."customer_price_bindings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.customer_price_bindings :: cpb_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customer_price_bindings"'::regclass
     AND polname = 'cpb_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'cpb_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '2b32bec13250b91c96f5712dba3b7f47' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'cpb_self_read', qual_hash, '2b32bec13250b91c96f5712dba3b7f47', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "cpb_self_read" ON "public"."customer_price_bindings"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.customs_authentication_guides :: customs_guides_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_authentication_guides"'::regclass
     AND polname = 'customs_guides_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_guides_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_guides_legal_ops_all', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_guides_legal_ops_all" ON "public"."customs_authentication_guides"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_counsel_reviews :: customs_counsel_reviews_insert_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_counsel_reviews"'::regclass
     AND polname = 'customs_counsel_reviews_insert_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_counsel_reviews_insert_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_counsel_reviews_insert_legal_ops', qual_hash, NULL, check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_counsel_reviews_insert_legal_ops" ON "public"."customs_counsel_reviews"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_counsel_reviews :: customs_counsel_reviews_read_scoped
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_counsel_reviews"'::regclass
     AND polname = 'customs_counsel_reviews_read_scoped';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_counsel_reviews_read_scoped';
  END IF;
  IF qual_hash IS DISTINCT FROM 'd8faf44fd916eec5feccf327fda5b42e' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_counsel_reviews_read_scoped', qual_hash, 'd8faf44fd916eec5feccf327fda5b42e', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "customs_counsel_reviews_read_scoped" ON "public"."customs_counsel_reviews"
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))) OR ((case_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM legal_privilege_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND (g.case_id = customs_counsel_reviews.case_id) AND (g.active = true)))) AND (EXISTS ( SELECT 1
   FROM customs_counsel_sessions s
  WHERE ((s.user_id = ( SELECT auth.uid() AS uid)) AND (s.revoked_at IS NULL) AND (s.expires_at > now()) AND ((s.case_id IS NULL) OR (s.case_id = customs_counsel_reviews.case_id))))))));

-- policy public.customs_counsel_reviews :: customs_counsel_reviews_update_decide
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_counsel_reviews"'::regclass
     AND polname = 'customs_counsel_reviews_update_decide';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_counsel_reviews_update_decide';
  END IF;
  IF qual_hash IS DISTINCT FROM 'bd3e0125d3d0a113a224a87ef40f1fd2' OR check_hash IS DISTINCT FROM 'bd3e0125d3d0a113a224a87ef40f1fd2' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_counsel_reviews_update_decide', qual_hash, 'bd3e0125d3d0a113a224a87ef40f1fd2', check_hash, 'bd3e0125d3d0a113a224a87ef40f1fd2';
  END IF;
END
$guard$;
ALTER POLICY "customs_counsel_reviews_update_decide" ON "public"."customs_counsel_reviews"
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))) OR ((case_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM legal_privilege_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND (g.case_id = customs_counsel_reviews.case_id) AND (g.active = true)))) AND (EXISTS ( SELECT 1
   FROM customs_counsel_sessions s
  WHERE ((s.user_id = ( SELECT auth.uid() AS uid)) AND (s.revoked_at IS NULL) AND (s.expires_at > now()) AND ((s.case_id IS NULL) OR (s.case_id = customs_counsel_reviews.case_id))))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))) OR ((case_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM legal_privilege_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND (g.case_id = customs_counsel_reviews.case_id) AND (g.active = true)))) AND (EXISTS ( SELECT 1
   FROM customs_counsel_sessions s
  WHERE ((s.user_id = ( SELECT auth.uid() AS uid)) AND (s.revoked_at IS NULL) AND (s.expires_at > now()) AND ((s.case_id IS NULL) OR (s.case_id = customs_counsel_reviews.case_id))))))));

-- policy public.customs_counsel_sessions :: customs_counsel_sessions_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_counsel_sessions"'::regclass
     AND polname = 'customs_counsel_sessions_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_counsel_sessions_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b2b2896ececb9dc39207da370dc26528' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_counsel_sessions_read', qual_hash, 'b2b2896ececb9dc39207da370dc26528', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "customs_counsel_sessions_read" ON "public"."customs_counsel_sessions"
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text])))))));

-- policy public.customs_counsel_sessions :: customs_counsel_sessions_update_revoke_only
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_counsel_sessions"'::regclass
     AND polname = 'customs_counsel_sessions_update_revoke_only';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_counsel_sessions_update_revoke_only';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_counsel_sessions_update_revoke_only', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_counsel_sessions_update_revoke_only" ON "public"."customs_counsel_sessions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_detention_images :: customs_detention_images_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_detention_images"'::regclass
     AND polname = 'customs_detention_images_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_detention_images_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_detention_images_legal_ops_all', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_detention_images_legal_ops_all" ON "public"."customs_detention_images"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_detentions :: customs_detentions_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_detentions"'::regclass
     AND polname = 'customs_detentions_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_detentions_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_detentions_legal_ops_all', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_detentions_legal_ops_all" ON "public"."customs_detentions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_e_allegations :: customs_e_allegations_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_e_allegations"'::regclass
     AND polname = 'customs_e_allegations_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_e_allegations_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_e_allegations_legal_ops_all', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_e_allegations_legal_ops_all" ON "public"."customs_e_allegations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_fee_ledger :: customs_fee_ledger_insert_cfo
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_fee_ledger"'::regclass
     AND polname = 'customs_fee_ledger_insert_cfo';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_fee_ledger_insert_cfo';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '761684169280315d6ce413e43a376898' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_fee_ledger_insert_cfo', qual_hash, NULL, check_hash, '761684169280315d6ce413e43a376898';
  END IF;
END
$guard$;
ALTER POLICY "customs_fee_ledger_insert_cfo" ON "public"."customs_fee_ledger"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'cfo'::text]))))));

-- policy public.customs_fee_ledger :: customs_fee_ledger_read_authorised
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_fee_ledger"'::regclass
     AND polname = 'customs_fee_ledger_read_authorised';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_fee_ledger_read_authorised';
  END IF;
  IF qual_hash IS DISTINCT FROM 'a7bc22257402d15dd2935940c146bbed' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_fee_ledger_read_authorised', qual_hash, 'a7bc22257402d15dd2935940c146bbed', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "customs_fee_ledger_read_authorised" ON "public"."customs_fee_ledger"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text, 'cfo'::text, 'ceo'::text]))))));

-- policy public.customs_fee_ledger :: customs_fee_ledger_update_cfo
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_fee_ledger"'::regclass
     AND polname = 'customs_fee_ledger_update_cfo';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_fee_ledger_update_cfo';
  END IF;
  IF qual_hash IS DISTINCT FROM '761684169280315d6ce413e43a376898' OR check_hash IS DISTINCT FROM '761684169280315d6ce413e43a376898' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_fee_ledger_update_cfo', qual_hash, '761684169280315d6ce413e43a376898', check_hash, '761684169280315d6ce413e43a376898';
  END IF;
END
$guard$;
ALTER POLICY "customs_fee_ledger_update_cfo" ON "public"."customs_fee_ledger"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'cfo'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'cfo'::text]))))));

-- policy public.customs_fines_imposed :: customs_fines_insert_cfo
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_fines_imposed"'::regclass
     AND polname = 'customs_fines_insert_cfo';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_fines_insert_cfo';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '7f3d35ca745048420d87f6dc4b126fbd' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_fines_insert_cfo', qual_hash, NULL, check_hash, '7f3d35ca745048420d87f6dc4b126fbd';
  END IF;
END
$guard$;
ALTER POLICY "customs_fines_insert_cfo" ON "public"."customs_fines_imposed"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text]))))));

-- policy public.customs_fines_imposed :: customs_fines_read_authorised
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_fines_imposed"'::regclass
     AND polname = 'customs_fines_read_authorised';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_fines_read_authorised';
  END IF;
  IF qual_hash IS DISTINCT FROM 'a7bc22257402d15dd2935940c146bbed' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_fines_read_authorised', qual_hash, 'a7bc22257402d15dd2935940c146bbed', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "customs_fines_read_authorised" ON "public"."customs_fines_imposed"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text, 'cfo'::text, 'ceo'::text]))))));

-- policy public.customs_fines_imposed :: customs_fines_update_cfo
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_fines_imposed"'::regclass
     AND polname = 'customs_fines_update_cfo';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_fines_update_cfo';
  END IF;
  IF qual_hash IS DISTINCT FROM '7f3d35ca745048420d87f6dc4b126fbd' OR check_hash IS DISTINCT FROM '7f3d35ca745048420d87f6dc4b126fbd' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_fines_update_cfo', qual_hash, '7f3d35ca745048420d87f6dc4b126fbd', check_hash, '7f3d35ca745048420d87f6dc4b126fbd';
  END IF;
END
$guard$;
ALTER POLICY "customs_fines_update_cfo" ON "public"."customs_fines_imposed"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text]))))));

-- policy public.customs_guide_sections :: customs_guide_sections_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_guide_sections"'::regclass
     AND polname = 'customs_guide_sections_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_guide_sections_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_guide_sections_legal_ops_all', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_guide_sections_legal_ops_all" ON "public"."customs_guide_sections"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_iprs_scan_results :: customs_iprs_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_iprs_scan_results"'::regclass
     AND polname = 'customs_iprs_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_iprs_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_iprs_legal_ops_all', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_iprs_legal_ops_all" ON "public"."customs_iprs_scan_results"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_moiety_claims :: customs_moiety_exec_only
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_moiety_claims"'::regclass
     AND polname = 'customs_moiety_exec_only';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_moiety_exec_only';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b905eab6f1116f11de0dca830314da09' OR check_hash IS DISTINCT FROM 'b905eab6f1116f11de0dca830314da09' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_moiety_exec_only', qual_hash, 'b905eab6f1116f11de0dca830314da09', check_hash, 'b905eab6f1116f11de0dca830314da09';
  END IF;
END
$guard$;
ALTER POLICY "customs_moiety_exec_only" ON "public"."customs_moiety_claims"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'ceo'::text, 'cfo'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'ceo'::text, 'cfo'::text]))))));

-- policy public.customs_recordation_classes :: customs_recordation_classes_cfo_ceo_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_recordation_classes"'::regclass
     AND polname = 'customs_recordation_classes_cfo_ceo_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_recordation_classes_cfo_ceo_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '580586ebb78fd01e4f8ac9f0f446437c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_recordation_classes_cfo_ceo_read', qual_hash, '580586ebb78fd01e4f8ac9f0f446437c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "customs_recordation_classes_cfo_ceo_read" ON "public"."customs_recordation_classes"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['cfo'::text, 'ceo'::text]))))));

-- policy public.customs_recordation_classes :: customs_recordation_classes_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_recordation_classes"'::regclass
     AND polname = 'customs_recordation_classes_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_recordation_classes_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_recordation_classes_legal_ops_all', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_recordation_classes_legal_ops_all" ON "public"."customs_recordation_classes"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_recordation_products :: customs_recordation_products_cfo_ceo_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_recordation_products"'::regclass
     AND polname = 'customs_recordation_products_cfo_ceo_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_recordation_products_cfo_ceo_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '3121dc11eaca3ae9a88f23bf012acc3b' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_recordation_products_cfo_ceo_read', qual_hash, '3121dc11eaca3ae9a88f23bf012acc3b', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "customs_recordation_products_cfo_ceo_read" ON "public"."customs_recordation_products"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['cfo'::text, 'ceo'::text]))))));

-- policy public.customs_recordation_products :: customs_recordation_products_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_recordation_products"'::regclass
     AND polname = 'customs_recordation_products_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_recordation_products_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c2ce87be58b8e9b7dcbe2d364fbdca60' OR check_hash IS DISTINCT FROM 'c2ce87be58b8e9b7dcbe2d364fbdca60' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_recordation_products_legal_ops_all', qual_hash, 'c2ce87be58b8e9b7dcbe2d364fbdca60', check_hash, 'c2ce87be58b8e9b7dcbe2d364fbdca60';
  END IF;
END
$guard$;
ALTER POLICY "customs_recordation_products_legal_ops_all" ON "public"."customs_recordation_products"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_recordations :: customs_recordations_cfo_ceo_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_recordations"'::regclass
     AND polname = 'customs_recordations_cfo_ceo_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_recordations_cfo_ceo_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '580586ebb78fd01e4f8ac9f0f446437c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_recordations_cfo_ceo_read', qual_hash, '580586ebb78fd01e4f8ac9f0f446437c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "customs_recordations_cfo_ceo_read" ON "public"."customs_recordations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['cfo'::text, 'ceo'::text]))))));

-- policy public.customs_recordations :: customs_recordations_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_recordations"'::regclass
     AND polname = 'customs_recordations_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_recordations_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM 'c851320ea8182dcd498be8f44ff09cf4' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_recordations_legal_ops_all', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, 'c851320ea8182dcd498be8f44ff09cf4';
  END IF;
END
$guard$;
ALTER POLICY "customs_recordations_legal_ops_all" ON "public"."customs_recordations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text, 'ceo'::text]))))));

-- policy public.customs_seizures :: customs_seizures_cfo_ceo_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_seizures"'::regclass
     AND polname = 'customs_seizures_cfo_ceo_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_seizures_cfo_ceo_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '580586ebb78fd01e4f8ac9f0f446437c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_seizures_cfo_ceo_read', qual_hash, '580586ebb78fd01e4f8ac9f0f446437c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "customs_seizures_cfo_ceo_read" ON "public"."customs_seizures"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['cfo'::text, 'ceo'::text]))))));

-- policy public.customs_seizures :: customs_seizures_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_seizures"'::regclass
     AND polname = 'customs_seizures_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_seizures_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_seizures_legal_ops_all', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_seizures_legal_ops_all" ON "public"."customs_seizures"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.customs_trainings :: customs_trainings_legal_ops_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."customs_trainings"'::regclass
     AND polname = 'customs_trainings_legal_ops_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'customs_trainings_legal_ops_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'customs_trainings_legal_ops_all', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "customs_trainings_legal_ops_all" ON "public"."customs_trainings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.daily_checkins :: Users manage own checkins
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."daily_checkins"'::regclass
     AND polname = 'Users manage own checkins';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own checkins';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own checkins', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own checkins" ON "public"."daily_checkins"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.daily_scores :: Users manage own daily scores
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."daily_scores"'::regclass
     AND polname = 'Users manage own daily scores';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own daily scores';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own daily scores', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users manage own daily scores" ON "public"."daily_scores"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.daily_tasks :: Users can insert own daily_tasks
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."daily_tasks"'::regclass
     AND polname = 'Users can insert own daily_tasks';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own daily_tasks';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own daily_tasks', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own daily_tasks" ON "public"."daily_tasks"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.daily_tasks :: Users can update own daily_tasks
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."daily_tasks"'::regclass
     AND polname = 'Users can update own daily_tasks';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own daily_tasks';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own daily_tasks', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own daily_tasks" ON "public"."daily_tasks"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.daily_tasks :: Users can view own daily_tasks
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."daily_tasks"'::regclass
     AND polname = 'Users can view own daily_tasks';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own daily_tasks';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own daily_tasks', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own daily_tasks" ON "public"."daily_tasks"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.data_events :: Users manage own events
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."data_events"'::regclass
     AND polname = 'Users manage own events';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own events';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own events', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users manage own events" ON "public"."data_events"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.decision_rights_rules :: decision_rights_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."decision_rights_rules"'::regclass
     AND polname = 'decision_rights_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'decision_rights_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'decision_rights_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "decision_rights_admin_all" ON "public"."decision_rights_rules"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.dsar_requests :: dsar_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."dsar_requests"'::regclass
     AND polname = 'dsar_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'dsar_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '8ac3b1c552baab00ecff55e4888cfceb' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'dsar_self_read', qual_hash, '8ac3b1c552baab00ecff55e4888cfceb', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "dsar_self_read" ON "public"."dsar_requests"
  USING (((( SELECT auth.uid() AS uid) = user_id) OR is_compliance_reader()));

-- policy public.email_otps :: service_role_only_email_otps
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."email_otps"'::regclass
     AND polname = 'service_role_only_email_otps';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'service_role_only_email_otps';
  END IF;
  IF qual_hash IS DISTINCT FROM '8bbd793986518b26efe50928b8628636' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'service_role_only_email_otps', qual_hash, '8bbd793986518b26efe50928b8628636', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "service_role_only_email_otps" ON "public"."email_otps"
  USING ((( SELECT auth.role() AS role) = 'service_role'::text));

-- policy public.executive_recommendations :: Authenticated read executive_recommendations
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."executive_recommendations"'::regclass
     AND polname = 'Authenticated read executive_recommendations';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Authenticated read executive_recommendations';
  END IF;
  IF qual_hash IS DISTINCT FROM 'fe6be3363cff74e318b02a2651158dac' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Authenticated read executive_recommendations', qual_hash, 'fe6be3363cff74e318b02a2651158dac', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Authenticated read executive_recommendations" ON "public"."executive_recommendations"
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

-- policy public.executive_reporting_audit_log :: eral_exec_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."executive_reporting_audit_log"'::regclass
     AND polname = 'eral_exec_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'eral_exec_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'eral_exec_admin_read', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "eral_exec_admin_read" ON "public"."executive_reporting_audit_log"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.family_members :: family_members_primary_full_access
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."family_members"'::regclass
     AND polname = 'family_members_primary_full_access';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'family_members_primary_full_access';
  END IF;
  IF qual_hash IS DISTINCT FROM 'becfc641b757b7d9ee486f59c895f261' OR check_hash IS DISTINCT FROM 'becfc641b757b7d9ee486f59c895f261' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'family_members_primary_full_access', qual_hash, 'becfc641b757b7d9ee486f59c895f261', check_hash, 'becfc641b757b7d9ee486f59c895f261';
  END IF;
END
$guard$;
ALTER POLICY "family_members_primary_full_access" ON "public"."family_members"
  USING ((primary_user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((primary_user_id = ( SELECT auth.uid() AS uid)));

-- policy public.family_members :: family_members_select_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."family_members"'::regclass
     AND polname = 'family_members_select_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'family_members_select_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM 'ac986db4bbbcb134a319c24cf723c292' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'family_members_select_merged', qual_hash, 'ac986db4bbbcb134a319c24cf723c292', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "family_members_select_merged" ON "public"."family_members"
  USING (((member_user_id = ( SELECT auth.uid() AS uid)) OR (primary_user_id IN ( SELECT family_members_1.primary_user_id
   FROM family_members family_members_1
  WHERE ((family_members_1.member_user_id = ( SELECT auth.uid() AS uid)) AND (family_members_1.is_active = true))))));

-- policy public.farma_tokens :: Users can insert own farma_tokens
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."farma_tokens"'::regclass
     AND polname = 'Users can insert own farma_tokens';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own farma_tokens';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own farma_tokens', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own farma_tokens" ON "public"."farma_tokens"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.farma_tokens :: Users can update own farma_tokens
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."farma_tokens"'::regclass
     AND polname = 'Users can update own farma_tokens';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own farma_tokens';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own farma_tokens', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own farma_tokens" ON "public"."farma_tokens"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.farma_tokens :: Users can view own farma_tokens
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."farma_tokens"'::regclass
     AND polname = 'Users can view own farma_tokens';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own farma_tokens';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own farma_tokens', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own farma_tokens" ON "public"."farma_tokens"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.feature_flag_audit :: flag_audit_admin_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."feature_flag_audit"'::regclass
     AND polname = 'flag_audit_admin_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'flag_audit_admin_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'flag_audit_admin_insert', qual_hash, NULL, check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "flag_audit_admin_insert" ON "public"."feature_flag_audit"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.feature_flag_audit :: flag_audit_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."feature_flag_audit"'::regclass
     AND polname = 'flag_audit_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'flag_audit_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'flag_audit_admin_read', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "flag_audit_admin_read" ON "public"."feature_flag_audit"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.forecast_monthly :: Authenticated read forecast_monthly
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."forecast_monthly"'::regclass
     AND polname = 'Authenticated read forecast_monthly';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Authenticated read forecast_monthly';
  END IF;
  IF qual_hash IS DISTINCT FROM 'fe6be3363cff74e318b02a2651158dac' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Authenticated read forecast_monthly', qual_hash, 'fe6be3363cff74e318b02a2651158dac', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Authenticated read forecast_monthly" ON "public"."forecast_monthly"
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

-- policy public.framework_consistency_flags :: fcf_admin_update
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."framework_consistency_flags"'::regclass
     AND polname = 'fcf_admin_update';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'fcf_admin_update';
  END IF;
  IF qual_hash IS DISTINCT FROM 'ca0971ea3bd3db00f91006a3fadba89f' OR check_hash IS DISTINCT FROM 'ca0971ea3bd3db00f91006a3fadba89f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'fcf_admin_update', qual_hash, 'ca0971ea3bd3db00f91006a3fadba89f', check_hash, 'ca0971ea3bd3db00f91006a3fadba89f';
  END IF;
END
$guard$;
ALTER POLICY "fcf_admin_update" ON "public"."framework_consistency_flags"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text, 'compliance_officer'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text, 'compliance_officer'::text]))))));

-- policy public.framework_registry_flags :: framework_registry_flags_update_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."framework_registry_flags"'::regclass
     AND polname = 'framework_registry_flags_update_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'framework_registry_flags_update_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM 'e496a0f64929940893af92050ef8d3b9' OR check_hash IS DISTINCT FROM 'e496a0f64929940893af92050ef8d3b9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'framework_registry_flags_update_merged', qual_hash, 'e496a0f64929940893af92050ef8d3b9', check_hash, 'e496a0f64929940893af92050ef8d3b9';
  END IF;
END
$guard$;
ALTER POLICY "framework_registry_flags_update_merged" ON "public"."framework_registry_flags"
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text, 'compliance_officer'::text]))))) OR is_iso_admin()))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text, 'compliance_officer'::text]))))) OR is_iso_admin()));

-- policy public.genetic_profiles :: Users can insert own genetic_profiles
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."genetic_profiles"'::regclass
     AND polname = 'Users can insert own genetic_profiles';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own genetic_profiles';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own genetic_profiles', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own genetic_profiles" ON "public"."genetic_profiles"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.genetic_profiles :: Users can update own genetic_profiles
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."genetic_profiles"'::regclass
     AND polname = 'Users can update own genetic_profiles';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own genetic_profiles';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own genetic_profiles', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own genetic_profiles" ON "public"."genetic_profiles"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.genetic_profiles :: Users can view own genetic_profiles
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."genetic_profiles"'::regclass
     AND polname = 'Users can view own genetic_profiles';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own genetic_profiles';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own genetic_profiles', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own genetic_profiles" ON "public"."genetic_profiles"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.genex360_purchase_currency_details :: gx_ocd_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."genex360_purchase_currency_details"'::regclass
     AND polname = 'gx_ocd_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'gx_ocd_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'gx_ocd_read_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "gx_ocd_read_admin" ON "public"."genex360_purchase_currency_details"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.genex360_purchases :: genex360_purchases_user_own_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."genex360_purchases"'::regclass
     AND polname = 'genex360_purchases_user_own_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'genex360_purchases_user_own_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '2b32bec13250b91c96f5712dba3b7f47' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'genex360_purchases_user_own_insert', qual_hash, NULL, check_hash, '2b32bec13250b91c96f5712dba3b7f47';
  END IF;
END
$guard$;
ALTER POLICY "genex360_purchases_user_own_insert" ON "public"."genex360_purchases"
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.genex360_purchases :: genex360_purchases_user_own_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."genex360_purchases"'::regclass
     AND polname = 'genex360_purchases_user_own_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'genex360_purchases_user_own_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '2b32bec13250b91c96f5712dba3b7f47' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'genex360_purchases_user_own_read', qual_hash, '2b32bec13250b91c96f5712dba3b7f47', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "genex360_purchases_user_own_read" ON "public"."genex360_purchases"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.governance_configuration_log :: gov_config_log_admin_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."governance_configuration_log"'::regclass
     AND polname = 'gov_config_log_admin_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'gov_config_log_admin_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'gov_config_log_admin_insert', qual_hash, NULL, check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "gov_config_log_admin_insert" ON "public"."governance_configuration_log"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.governance_configuration_log :: gov_config_log_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."governance_configuration_log"'::regclass
     AND polname = 'gov_config_log_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'gov_config_log_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'gov_config_log_admin_read', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "gov_config_log_admin_read" ON "public"."governance_configuration_log"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.governance_notifications_queue :: gov_notif_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."governance_notifications_queue"'::regclass
     AND polname = 'gov_notif_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'gov_notif_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'gov_notif_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "gov_notif_admin_all" ON "public"."governance_notifications_queue"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.governance_notifications_queue :: gov_notif_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."governance_notifications_queue"'::regclass
     AND polname = 'gov_notif_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'gov_notif_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'd8d7fd55fdbe4813788146f3b34dda08' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'gov_notif_self_read', qual_hash, 'd8d7fd55fdbe4813788146f3b34dda08', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "gov_notif_self_read" ON "public"."governance_notifications_queue"
  USING ((recipient_user_id = ( SELECT auth.uid() AS uid)));

-- policy public.health_metrics :: Users can insert own health_metrics
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."health_metrics"'::regclass
     AND polname = 'Users can insert own health_metrics';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own health_metrics';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own health_metrics', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own health_metrics" ON "public"."health_metrics"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.health_metrics :: Users can update own health_metrics
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."health_metrics"'::regclass
     AND polname = 'Users can update own health_metrics';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own health_metrics';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own health_metrics', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own health_metrics" ON "public"."health_metrics"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.health_metrics :: Users can view own health_metrics
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."health_metrics"'::regclass
     AND polname = 'Users can view own health_metrics';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own health_metrics';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own health_metrics', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own health_metrics" ON "public"."health_metrics"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.health_scores :: Users can insert own health_scores
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."health_scores"'::regclass
     AND polname = 'Users can insert own health_scores';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own health_scores';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own health_scores', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own health_scores" ON "public"."health_scores"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.health_scores :: Users can update own health_scores
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."health_scores"'::regclass
     AND polname = 'Users can update own health_scores';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own health_scores';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own health_scores', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own health_scores" ON "public"."health_scores"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.health_scores :: Users can view own health_scores
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."health_scores"'::regclass
     AND polname = 'Users can view own health_scores';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own health_scores';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own health_scores', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own health_scores" ON "public"."health_scores"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.helix_achievement_unlocks :: Consumer only helix_achievement_unlocks
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_achievement_unlocks"'::regclass
     AND polname = 'Consumer only helix_achievement_unlocks';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Consumer only helix_achievement_unlocks';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Consumer only helix_achievement_unlocks', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Consumer only helix_achievement_unlocks" ON "public"."helix_achievement_unlocks"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.helix_balances :: Consumer only helix_balances
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_balances"'::regclass
     AND polname = 'Consumer only helix_balances';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Consumer only helix_balances';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Consumer only helix_balances', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Consumer only helix_balances" ON "public"."helix_balances"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.helix_challenge_participants :: Consumer only helix_challenge_participants
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_challenge_participants"'::regclass
     AND polname = 'Consumer only helix_challenge_participants';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Consumer only helix_challenge_participants';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Consumer only helix_challenge_participants', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Consumer only helix_challenge_participants" ON "public"."helix_challenge_participants"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.helix_family_pool_config :: helix_pool_family_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_family_pool_config"'::regclass
     AND polname = 'helix_pool_family_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'helix_pool_family_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '00a97d063a23ca2354aeb00ce1ac247f' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'helix_pool_family_read', qual_hash, '00a97d063a23ca2354aeb00ce1ac247f', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "helix_pool_family_read" ON "public"."helix_family_pool_config"
  USING ((primary_user_id IN ( SELECT family_members.primary_user_id
   FROM family_members
  WHERE ((family_members.member_user_id = ( SELECT auth.uid() AS uid)) AND (family_members.is_active = true)))));

-- policy public.helix_family_pool_config :: helix_pool_primary_manage
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_family_pool_config"'::regclass
     AND polname = 'helix_pool_primary_manage';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'helix_pool_primary_manage';
  END IF;
  IF qual_hash IS DISTINCT FROM 'becfc641b757b7d9ee486f59c895f261' OR check_hash IS DISTINCT FROM 'becfc641b757b7d9ee486f59c895f261' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'helix_pool_primary_manage', qual_hash, 'becfc641b757b7d9ee486f59c895f261', check_hash, 'becfc641b757b7d9ee486f59c895f261';
  END IF;
END
$guard$;
ALTER POLICY "helix_pool_primary_manage" ON "public"."helix_family_pool_config"
  USING ((primary_user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((primary_user_id = ( SELECT auth.uid() AS uid)));

-- policy public.helix_leaderboard :: Consumer only helix_leaderboard
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_leaderboard"'::regclass
     AND polname = 'Consumer only helix_leaderboard';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Consumer only helix_leaderboard';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Consumer only helix_leaderboard', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Consumer only helix_leaderboard" ON "public"."helix_leaderboard"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.helix_redemptions :: Consumer only helix_redemptions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_redemptions"'::regclass
     AND polname = 'Consumer only helix_redemptions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Consumer only helix_redemptions';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Consumer only helix_redemptions', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Consumer only helix_redemptions" ON "public"."helix_redemptions"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.helix_referral_codes :: referral_codes_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_referral_codes"'::regclass
     AND polname = 'referral_codes_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'referral_codes_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '2b32bec13250b91c96f5712dba3b7f47' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'referral_codes_self_read', qual_hash, '2b32bec13250b91c96f5712dba3b7f47', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "referral_codes_self_read" ON "public"."helix_referral_codes"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.helix_referrals :: Consumer only helix_referrals
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_referrals"'::regclass
     AND polname = 'Consumer only helix_referrals';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Consumer only helix_referrals';
  END IF;
  IF qual_hash IS DISTINCT FROM '4ddcfbad847044a50cdaf8140e52c234' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Consumer only helix_referrals', qual_hash, '4ddcfbad847044a50cdaf8140e52c234', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Consumer only helix_referrals" ON "public"."helix_referrals"
  USING ((( SELECT auth.uid() AS uid) = referrer_id));

-- policy public.helix_streaks :: Consumer only helix_streaks
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_streaks"'::regclass
     AND polname = 'Consumer only helix_streaks';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Consumer only helix_streaks';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Consumer only helix_streaks', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Consumer only helix_streaks" ON "public"."helix_streaks"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.helix_transactions :: Consumer only helix_transactions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."helix_transactions"'::regclass
     AND polname = 'Consumer only helix_transactions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Consumer only helix_transactions';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Consumer only helix_transactions', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Consumer only helix_transactions" ON "public"."helix_transactions"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.herbs :: Authenticated users can view herbs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."herbs"'::regclass
     AND polname = 'Authenticated users can view herbs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Authenticated users can view herbs';
  END IF;
  IF qual_hash IS DISTINCT FROM 'fe6be3363cff74e318b02a2651158dac' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Authenticated users can view herbs', qual_hash, 'fe6be3363cff74e318b02a2651158dac', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Authenticated users can view herbs" ON "public"."herbs"
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

-- policy public.hipaa_breach_determinations :: hipaa_breach_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."hipaa_breach_determinations"'::regclass
     AND polname = 'hipaa_breach_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'hipaa_breach_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '298df28376e7c20ed3bd0525ff34b02f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'hipaa_breach_insert', qual_hash, NULL, check_hash, '298df28376e7c20ed3bd0525ff34b02f';
  END IF;
END
$guard$;
ALTER POLICY "hipaa_breach_insert" ON "public"."hipaa_breach_determinations"
  WITH CHECK ((is_hipaa_admin() AND (assessed_by = ( SELECT auth.uid() AS uid))));

-- policy public.hipaa_contingency_plan_tests :: hipaa_contingency_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."hipaa_contingency_plan_tests"'::regclass
     AND polname = 'hipaa_contingency_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'hipaa_contingency_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'd30c3aad1753a4e80f8221512a9b740b' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'hipaa_contingency_insert', qual_hash, NULL, check_hash, 'd30c3aad1753a4e80f8221512a9b740b';
  END IF;
END
$guard$;
ALTER POLICY "hipaa_contingency_insert" ON "public"."hipaa_contingency_plan_tests"
  WITH CHECK ((is_hipaa_admin() AND (recorded_by = ( SELECT auth.uid() AS uid))));

-- policy public.hipaa_emergency_access_invocations :: hipaa_emergency_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."hipaa_emergency_access_invocations"'::regclass
     AND polname = 'hipaa_emergency_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'hipaa_emergency_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '81bfa4e2702bcf3b17267a5528745139' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'hipaa_emergency_insert', qual_hash, NULL, check_hash, '81bfa4e2702bcf3b17267a5528745139';
  END IF;
END
$guard$;
ALTER POLICY "hipaa_emergency_insert" ON "public"."hipaa_emergency_access_invocations"
  WITH CHECK ((is_hipaa_admin() AND (invoked_by = ( SELECT auth.uid() AS uid))));

-- policy public.hipaa_sanction_actions :: hipaa_sanction_actions_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."hipaa_sanction_actions"'::regclass
     AND polname = 'hipaa_sanction_actions_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'hipaa_sanction_actions_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'd30c3aad1753a4e80f8221512a9b740b' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'hipaa_sanction_actions_insert', qual_hash, NULL, check_hash, 'd30c3aad1753a4e80f8221512a9b740b';
  END IF;
END
$guard$;
ALTER POLICY "hipaa_sanction_actions_insert" ON "public"."hipaa_sanction_actions"
  WITH CHECK ((is_hipaa_admin() AND (recorded_by = ( SELECT auth.uid() AS uid))));

-- policy public.hipaa_workforce_training :: hipaa_training_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."hipaa_workforce_training"'::regclass
     AND polname = 'hipaa_training_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'hipaa_training_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'd30c3aad1753a4e80f8221512a9b740b' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'hipaa_training_insert', qual_hash, NULL, check_hash, 'd30c3aad1753a4e80f8221512a9b740b';
  END IF;
END
$guard$;
ALTER POLICY "hipaa_training_insert" ON "public"."hipaa_workforce_training"
  WITH CHECK ((is_hipaa_admin() AND (recorded_by = ( SELECT auth.uid() AS uid))));

-- policy public.ingredient_library :: ingredient_library_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ingredient_library"'::regclass
     AND polname = 'ingredient_library_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'ingredient_library_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'ingredient_library_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "ingredient_library_admin_all" ON "public"."ingredient_library"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.ingredient_library :: ingredient_library_read_enrolled
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ingredient_library"'::regclass
     AND polname = 'ingredient_library_read_enrolled';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'ingredient_library_read_enrolled';
  END IF;
  IF qual_hash IS DISTINCT FROM 'e4d1a3a2cc551fe866a41d988486fd4b' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'ingredient_library_read_enrolled', qual_hash, 'e4d1a3a2cc551fe866a41d988486fd4b', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "ingredient_library_read_enrolled" ON "public"."ingredient_library"
  USING (((is_available_for_custom_formulation = true) AND (regulatory_status = ANY (ARRAY['pre_1994_dietary_ingredient'::text, 'gras_affirmed'::text])) AND (EXISTS ( SELECT 1
   FROM (level_4_enrollments le
     JOIN practitioners p ON ((p.id = le.practitioner_id)))
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (le.status = ANY (ARRAY['active'::text, 'formulation_development'::text, 'eligibility_verified'::text])))))));

-- policy public.ingredient_library_interactions :: ingredient_interactions_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ingredient_library_interactions"'::regclass
     AND polname = 'ingredient_interactions_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'ingredient_interactions_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'ingredient_interactions_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "ingredient_interactions_admin_all" ON "public"."ingredient_library_interactions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.ingredient_library_interactions :: ingredient_interactions_read_enrolled
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ingredient_library_interactions"'::regclass
     AND polname = 'ingredient_interactions_read_enrolled';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'ingredient_interactions_read_enrolled';
  END IF;
  IF qual_hash IS DISTINCT FROM '4e08214e560f4899eaac174d63179a5a' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'ingredient_interactions_read_enrolled', qual_hash, '4e08214e560f4899eaac174d63179a5a', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "ingredient_interactions_read_enrolled" ON "public"."ingredient_library_interactions"
  USING ((EXISTS ( SELECT 1
   FROM (level_4_enrollments le
     JOIN practitioners p ON ((p.id = le.practitioner_id)))
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (le.status = ANY (ARRAY['active'::text, 'formulation_development'::text, 'eligibility_verified'::text]))))));

-- policy public.interaction_notifications :: own_interaction_notifications
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."interaction_notifications"'::regclass
     AND polname = 'own_interaction_notifications';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'own_interaction_notifications';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'own_interaction_notifications', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "own_interaction_notifications" ON "public"."interaction_notifications"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.interaction_overrides :: interaction_overrides_access
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."interaction_overrides"'::regclass
     AND polname = 'interaction_overrides_access';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'interaction_overrides_access';
  END IF;
  IF qual_hash IS DISTINCT FROM '8b6df7493f02057d23a0313a6e907d30' OR check_hash IS DISTINCT FROM '763bbdc08d3719077e073d16917240b6' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'interaction_overrides_access', qual_hash, '8b6df7493f02057d23a0313a6e907d30', check_hash, '763bbdc08d3719077e073d16917240b6';
  END IF;
END
$guard$;
ALTER POLICY "interaction_overrides_access" ON "public"."interaction_overrides"
  USING (((( SELECT auth.uid() AS uid) = practitioner_user_id) OR (( SELECT auth.uid() AS uid) = patient_user_id)))
  WITH CHECK ((( SELECT auth.uid() AS uid) = practitioner_user_id));

-- policy public.international_audit_log :: intl_audit_insert_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_audit_log"'::regclass
     AND polname = 'intl_audit_insert_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'intl_audit_insert_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'intl_audit_insert_admin', qual_hash, NULL, check_hash, '85946ae3dc4ada21492e6d76d6cf35f8';
  END IF;
END
$guard$;
ALTER POLICY "intl_audit_insert_admin" ON "public"."international_audit_log"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.international_audit_log :: intl_audit_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_audit_log"'::regclass
     AND polname = 'intl_audit_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'intl_audit_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'intl_audit_read_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "intl_audit_read_admin" ON "public"."international_audit_log"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.international_country_to_market :: ictm_write_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_country_to_market"'::regclass
     AND polname = 'ictm_write_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'ictm_write_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '8ab1537bca60e14c3a4e3ba199e9e6ba' OR check_hash IS DISTINCT FROM '8ab1537bca60e14c3a4e3ba199e9e6ba' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'ictm_write_admin', qual_hash, '8ab1537bca60e14c3a4e3ba199e9e6ba', check_hash, '8ab1537bca60e14c3a4e3ba199e9e6ba';
  END IF;
END
$guard$;
ALTER POLICY "ictm_write_admin" ON "public"."international_country_to_market"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.international_fx_drift_findings :: fx_drift_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_fx_drift_findings"'::regclass
     AND polname = 'fx_drift_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'fx_drift_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '3216835d7689fd10d0a6edac76d85d85' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'fx_drift_read_admin', qual_hash, '3216835d7689fd10d0a6edac76d85d85', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "fx_drift_read_admin" ON "public"."international_fx_drift_findings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text]))))));

-- policy public.international_fx_drift_findings :: fx_drift_update_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_fx_drift_findings"'::regclass
     AND polname = 'fx_drift_update_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'fx_drift_update_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '3216835d7689fd10d0a6edac76d85d85' OR check_hash IS DISTINCT FROM '3216835d7689fd10d0a6edac76d85d85' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'fx_drift_update_admin', qual_hash, '3216835d7689fd10d0a6edac76d85d85', check_hash, '3216835d7689fd10d0a6edac76d85d85';
  END IF;
END
$guard$;
ALTER POLICY "fx_drift_update_admin" ON "public"."international_fx_drift_findings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text]))))));

-- policy public.international_fx_rate_history :: fx_hist_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_fx_rate_history"'::regclass
     AND polname = 'fx_hist_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'fx_hist_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '3216835d7689fd10d0a6edac76d85d85' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'fx_hist_read_admin', qual_hash, '3216835d7689fd10d0a6edac76d85d85', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "fx_hist_read_admin" ON "public"."international_fx_rate_history"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text]))))));

-- policy public.international_market_config :: imc_write_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_market_config"'::regclass
     AND polname = 'imc_write_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'imc_write_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'imc_write_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, '85946ae3dc4ada21492e6d76d6cf35f8';
  END IF;
END
$guard$;
ALTER POLICY "imc_write_admin" ON "public"."international_market_config"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.international_refunds :: intl_refund_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_refunds"'::regclass
     AND polname = 'intl_refund_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'intl_refund_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'intl_refund_read_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "intl_refund_read_admin" ON "public"."international_refunds"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.international_settlement_daily_reports :: settle_report_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_settlement_daily_reports"'::regclass
     AND polname = 'settle_report_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'settle_report_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '3216835d7689fd10d0a6edac76d85d85' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'settle_report_read_admin', qual_hash, '3216835d7689fd10d0a6edac76d85d85', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "settle_report_read_admin" ON "public"."international_settlement_daily_reports"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text]))))));

-- policy public.international_tax_registrations :: tax_reg_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_tax_registrations"'::regclass
     AND polname = 'tax_reg_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'tax_reg_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'tax_reg_read_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "tax_reg_read_admin" ON "public"."international_tax_registrations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.international_tax_registrations :: tax_reg_write_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_tax_registrations"'::regclass
     AND polname = 'tax_reg_write_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'tax_reg_write_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'tax_reg_write_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, '85946ae3dc4ada21492e6d76d6cf35f8';
  END IF;
END
$guard$;
ALTER POLICY "tax_reg_write_admin" ON "public"."international_tax_registrations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.international_vat_invoice_sequences :: vat_seq_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_vat_invoice_sequences"'::regclass
     AND polname = 'vat_seq_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'vat_seq_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '3216835d7689fd10d0a6edac76d85d85' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'vat_seq_read_admin', qual_hash, '3216835d7689fd10d0a6edac76d85d85', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "vat_seq_read_admin" ON "public"."international_vat_invoice_sequences"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text]))))));

-- policy public.international_vat_invoices :: vat_inv_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_vat_invoices"'::regclass
     AND polname = 'vat_inv_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'vat_inv_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'vat_inv_read_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "vat_inv_read_admin" ON "public"."international_vat_invoices"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.international_vat_number_validations :: vat_val_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."international_vat_number_validations"'::regclass
     AND polname = 'vat_val_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'vat_val_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'vat_val_read_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "vat_val_read_admin" ON "public"."international_vat_number_validations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.iprs_scan_config :: iprs_scan_config_admin_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."iprs_scan_config"'::regclass
     AND polname = 'iprs_scan_config_admin_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'iprs_scan_config_admin_write';
  END IF;
  IF qual_hash IS DISTINCT FROM '11ba347f6894b1b40ddae0aeb44793c2' OR check_hash IS DISTINCT FROM '11ba347f6894b1b40ddae0aeb44793c2' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'iprs_scan_config_admin_write', qual_hash, '11ba347f6894b1b40ddae0aeb44793c2', check_hash, '11ba347f6894b1b40ddae0aeb44793c2';
  END IF;
END
$guard$;
ALTER POLICY "iprs_scan_config_admin_write" ON "public"."iprs_scan_config"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.iprs_scan_config :: iprs_scan_config_legal_ops_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."iprs_scan_config"'::regclass
     AND polname = 'iprs_scan_config_legal_ops_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'iprs_scan_config_legal_ops_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'e46897a90e5790105adc0169ee5b0410' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'iprs_scan_config_legal_ops_read', qual_hash, 'e46897a90e5790105adc0169ee5b0410', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "iprs_scan_config_legal_ops_read" ON "public"."iprs_scan_config"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text, 'cfo'::text, 'ceo'::text]))))));

-- policy public.iso_internal_audits :: iso_internal_audits_insert_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."iso_internal_audits"'::regclass
     AND polname = 'iso_internal_audits_insert_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'iso_internal_audits_insert_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b289bc82e79187a031a7b15f63f2b4fe' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'iso_internal_audits_insert_merged', qual_hash, NULL, check_hash, 'b289bc82e79187a031a7b15f63f2b4fe';
  END IF;
END
$guard$;
ALTER POLICY "iso_internal_audits_insert_merged" ON "public"."iso_internal_audits"
  WITH CHECK ((is_iso_admin() OR (is_iso_admin() AND (recorded_by = ( SELECT auth.uid() AS uid)))));

-- policy public.iso_isms_scope_documents :: iso_isms_scope_documents_insert_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."iso_isms_scope_documents"'::regclass
     AND polname = 'iso_isms_scope_documents_insert_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'iso_isms_scope_documents_insert_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b289bc82e79187a031a7b15f63f2b4fe' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'iso_isms_scope_documents_insert_merged', qual_hash, NULL, check_hash, 'b289bc82e79187a031a7b15f63f2b4fe';
  END IF;
END
$guard$;
ALTER POLICY "iso_isms_scope_documents_insert_merged" ON "public"."iso_isms_scope_documents"
  WITH CHECK ((is_iso_admin() OR (is_iso_admin() AND (recorded_by = ( SELECT auth.uid() AS uid)))));

-- policy public.iso_management_reviews :: iso_management_reviews_insert_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."iso_management_reviews"'::regclass
     AND polname = 'iso_management_reviews_insert_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'iso_management_reviews_insert_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b289bc82e79187a031a7b15f63f2b4fe' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'iso_management_reviews_insert_merged', qual_hash, NULL, check_hash, 'b289bc82e79187a031a7b15f63f2b4fe';
  END IF;
END
$guard$;
ALTER POLICY "iso_management_reviews_insert_merged" ON "public"."iso_management_reviews"
  WITH CHECK ((is_iso_admin() OR (is_iso_admin() AND (recorded_by = ( SELECT auth.uid() AS uid)))));

-- policy public.iso_nonconformities :: iso_nonconformities_insert_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."iso_nonconformities"'::regclass
     AND polname = 'iso_nonconformities_insert_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'iso_nonconformities_insert_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b289bc82e79187a031a7b15f63f2b4fe' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'iso_nonconformities_insert_merged', qual_hash, NULL, check_hash, 'b289bc82e79187a031a7b15f63f2b4fe';
  END IF;
END
$guard$;
ALTER POLICY "iso_nonconformities_insert_merged" ON "public"."iso_nonconformities"
  WITH CHECK ((is_iso_admin() OR (is_iso_admin() AND (recorded_by = ( SELECT auth.uid() AS uid)))));

-- policy public.iso_risk_register :: iso_risk_register_insert_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."iso_risk_register"'::regclass
     AND polname = 'iso_risk_register_insert_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'iso_risk_register_insert_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b289bc82e79187a031a7b15f63f2b4fe' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'iso_risk_register_insert_merged', qual_hash, NULL, check_hash, 'b289bc82e79187a031a7b15f63f2b4fe';
  END IF;
END
$guard$;
ALTER POLICY "iso_risk_register_insert_merged" ON "public"."iso_risk_register"
  WITH CHECK ((is_iso_admin() OR (is_iso_admin() AND (recorded_by = ( SELECT auth.uid() AS uid)))));

-- policy public.iso_risk_treatments :: iso_risk_treatments_insert_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."iso_risk_treatments"'::regclass
     AND polname = 'iso_risk_treatments_insert_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'iso_risk_treatments_insert_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b289bc82e79187a031a7b15f63f2b4fe' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'iso_risk_treatments_insert_merged', qual_hash, NULL, check_hash, 'b289bc82e79187a031a7b15f63f2b4fe';
  END IF;
END
$guard$;
ALTER POLICY "iso_risk_treatments_insert_merged" ON "public"."iso_risk_treatments"
  WITH CHECK ((is_iso_admin() OR (is_iso_admin() AND (recorded_by = ( SELECT auth.uid() AS uid)))));

-- policy public.iso_statements_of_applicability :: iso_statements_of_applicability_insert_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."iso_statements_of_applicability"'::regclass
     AND polname = 'iso_statements_of_applicability_insert_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'iso_statements_of_applicability_insert_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b289bc82e79187a031a7b15f63f2b4fe' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'iso_statements_of_applicability_insert_merged', qual_hash, NULL, check_hash, 'b289bc82e79187a031a7b15f63f2b4fe';
  END IF;
END
$guard$;
ALTER POLICY "iso_statements_of_applicability_insert_merged" ON "public"."iso_statements_of_applicability"
  WITH CHECK ((is_iso_admin() OR (is_iso_admin() AND (recorded_by = ( SELECT auth.uid() AS uid)))));

-- policy public.jeffery_directives :: jeffery_directives_admin_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_directives"'::regclass
     AND polname = 'jeffery_directives_admin_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_directives_admin_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'c685c7e308ab242ebc4393b4baf17fe8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_directives_admin_insert', qual_hash, NULL, check_hash, 'c685c7e308ab242ebc4393b4baf17fe8';
  END IF;
END
$guard$;
ALTER POLICY "jeffery_directives_admin_insert" ON "public"."jeffery_directives"
  WITH CHECK (((author_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))) AND (length(title) > 0) AND (length(instruction) > 0)));

-- policy public.jeffery_directives :: jeffery_directives_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_directives"'::regclass
     AND polname = 'jeffery_directives_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_directives_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '064b166a25541f19d58acdaee17a9a3c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_directives_admin_read', qual_hash, '064b166a25541f19d58acdaee17a9a3c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "jeffery_directives_admin_read" ON "public"."jeffery_directives"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))));

-- policy public.jeffery_directives :: jeffery_directives_admin_update
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_directives"'::regclass
     AND polname = 'jeffery_directives_admin_update';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_directives_admin_update';
  END IF;
  IF qual_hash IS DISTINCT FROM '064b166a25541f19d58acdaee17a9a3c' OR check_hash IS DISTINCT FROM 'b7ef325588876541728d5d291315104a' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_directives_admin_update', qual_hash, '064b166a25541f19d58acdaee17a9a3c', check_hash, 'b7ef325588876541728d5d291315104a';
  END IF;
END
$guard$;
ALTER POLICY "jeffery_directives_admin_update" ON "public"."jeffery_directives"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))) AND (status = ANY (ARRAY['active'::text, 'completed'::text, 'paused'::text, 'cancelled'::text]))));

-- policy public.jeffery_knowledge_entries :: jeffery_knowledge_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_knowledge_entries"'::regclass
     AND polname = 'jeffery_knowledge_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_knowledge_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '064b166a25541f19d58acdaee17a9a3c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_knowledge_admin_read', qual_hash, '064b166a25541f19d58acdaee17a9a3c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "jeffery_knowledge_admin_read" ON "public"."jeffery_knowledge_entries"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))));

-- policy public.jeffery_knowledge_entries :: jeffery_knowledge_admin_update
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_knowledge_entries"'::regclass
     AND polname = 'jeffery_knowledge_admin_update';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_knowledge_admin_update';
  END IF;
  IF qual_hash IS DISTINCT FROM '064b166a25541f19d58acdaee17a9a3c' OR check_hash IS DISTINCT FROM 'a0946787ab11800281d500fb85f616a4' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_knowledge_admin_update', qual_hash, '064b166a25541f19d58acdaee17a9a3c', check_hash, 'a0946787ab11800281d500fb85f616a4';
  END IF;
END
$guard$;
ALTER POLICY "jeffery_knowledge_admin_update" ON "public"."jeffery_knowledge_entries"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))) AND (admin_verified IS NOT NULL)));

-- policy public.jeffery_learning_log :: jeffery_learning_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_learning_log"'::regclass
     AND polname = 'jeffery_learning_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_learning_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '064b166a25541f19d58acdaee17a9a3c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_learning_admin_read', qual_hash, '064b166a25541f19d58acdaee17a9a3c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "jeffery_learning_admin_read" ON "public"."jeffery_learning_log"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))));

-- policy public.jeffery_message_comments :: jeffery_comments_admin_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_message_comments"'::regclass
     AND polname = 'jeffery_comments_admin_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_comments_admin_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '481fe45a6870f2d71a0a90df2583b5a1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_comments_admin_insert', qual_hash, NULL, check_hash, '481fe45a6870f2d71a0a90df2583b5a1';
  END IF;
END
$guard$;
ALTER POLICY "jeffery_comments_admin_insert" ON "public"."jeffery_message_comments"
  WITH CHECK (((author_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))) AND (length(content) > 0)));

-- policy public.jeffery_message_comments :: jeffery_comments_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_message_comments"'::regclass
     AND polname = 'jeffery_comments_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_comments_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '064b166a25541f19d58acdaee17a9a3c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_comments_admin_read', qual_hash, '064b166a25541f19d58acdaee17a9a3c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "jeffery_comments_admin_read" ON "public"."jeffery_message_comments"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))));

-- policy public.jeffery_messages :: jeffery_msgs_admin_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_messages"'::regclass
     AND polname = 'jeffery_msgs_admin_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_msgs_admin_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '21aed513b5e054a7d4fd604375c78cc7' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_msgs_admin_insert', qual_hash, NULL, check_hash, '21aed513b5e054a7d4fd604375c78cc7';
  END IF;
END
$guard$;
ALTER POLICY "jeffery_msgs_admin_insert" ON "public"."jeffery_messages"
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))) AND (category = ANY (ARRAY['data_ingestion'::text, 'knowledge_update'::text, 'agent_decision'::text, 'self_tune'::text, 'evolution_report'::text, 'advisor_insight'::text, 'interaction_alert'::text, 'population_trend'::text, 'error_escalation'::text, 'research_task'::text]))));

-- policy public.jeffery_messages :: jeffery_msgs_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_messages"'::regclass
     AND polname = 'jeffery_msgs_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_msgs_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '064b166a25541f19d58acdaee17a9a3c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_msgs_admin_read', qual_hash, '064b166a25541f19d58acdaee17a9a3c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "jeffery_msgs_admin_read" ON "public"."jeffery_messages"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))));

-- policy public.jeffery_messages :: jeffery_msgs_admin_update
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."jeffery_messages"'::regclass
     AND polname = 'jeffery_msgs_admin_update';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'jeffery_msgs_admin_update';
  END IF;
  IF qual_hash IS DISTINCT FROM '064b166a25541f19d58acdaee17a9a3c' OR check_hash IS DISTINCT FROM '633fb7b09cc26ba95db6ba67c691a71c' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'jeffery_msgs_admin_update', qual_hash, '064b166a25541f19d58acdaee17a9a3c', check_hash, '633fb7b09cc26ba95db6ba67c691a71c';
  END IF;
END
$guard$;
ALTER POLICY "jeffery_msgs_admin_update" ON "public"."jeffery_messages"
  USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'admin'::text)))) AND (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'applied'::text, 'flagged'::text, 'auto_applied'::text]))));

-- policy public.kit_registrations :: Users can register kits
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."kit_registrations"'::regclass
     AND polname = 'Users can register kits';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can register kits';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can register kits', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can register kits" ON "public"."kit_registrations"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.kit_registrations :: Users can view own kits
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."kit_registrations"'::regclass
     AND polname = 'Users can view own kits';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own kits';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own kits', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own kits" ON "public"."kit_registrations"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.kpi_library :: kpi_library_exec_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."kpi_library"'::regclass
     AND polname = 'kpi_library_exec_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'kpi_library_exec_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' OR check_hash IS DISTINCT FROM 'c8fa24c7ad8356ea00095b8eb6cbf4cb' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'kpi_library_exec_admin_all', qual_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb', check_hash, 'c8fa24c7ad8356ea00095b8eb6cbf4cb';
  END IF;
END
$guard$;
ALTER POLICY "kpi_library_exec_admin_all" ON "public"."kpi_library"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'cfo'::text, 'ceo'::text, 'exec_reporting_admin'::text]))))));

-- policy public.launch_phases :: launch_phases_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."launch_phases"'::regclass
     AND polname = 'launch_phases_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'launch_phases_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'launch_phases_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "launch_phases_admin_all" ON "public"."launch_phases"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.legal_case_settlements :: legal_settlements_admin_chain
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_case_settlements"'::regclass
     AND polname = 'legal_settlements_admin_chain';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_settlements_admin_chain';
  END IF;
  IF qual_hash IS DISTINCT FROM 'a7bc22257402d15dd2935940c146bbed' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_settlements_admin_chain', qual_hash, 'a7bc22257402d15dd2935940c146bbed', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_settlements_admin_chain" ON "public"."legal_case_settlements"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text, 'cfo'::text, 'ceo'::text]))))));

-- policy public.legal_case_timeline :: legal_timeline_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_case_timeline"'::regclass
     AND polname = 'legal_timeline_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_timeline_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_timeline_admin_legal_ops', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_timeline_admin_legal_ops" ON "public"."legal_case_timeline"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_counsel_engagements :: legal_engagements_insert_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_counsel_engagements"'::regclass
     AND polname = 'legal_engagements_insert_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_engagements_insert_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_engagements_insert_legal_ops', qual_hash, NULL, check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "legal_engagements_insert_legal_ops" ON "public"."legal_counsel_engagements"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_counsel_engagements :: legal_engagements_read_authorised
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_counsel_engagements"'::regclass
     AND polname = 'legal_engagements_read_authorised';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_engagements_read_authorised';
  END IF;
  IF qual_hash IS DISTINCT FROM 'a7bc22257402d15dd2935940c146bbed' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_engagements_read_authorised', qual_hash, 'a7bc22257402d15dd2935940c146bbed', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_engagements_read_authorised" ON "public"."legal_counsel_engagements"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text, 'cfo'::text, 'ceo'::text]))))));

-- policy public.legal_counsel_engagements :: legal_engagements_update_authorised
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_counsel_engagements"'::regclass
     AND polname = 'legal_engagements_update_authorised';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_engagements_update_authorised';
  END IF;
  IF qual_hash IS DISTINCT FROM 'a7bc22257402d15dd2935940c146bbed' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_engagements_update_authorised', qual_hash, 'a7bc22257402d15dd2935940c146bbed', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_engagements_update_authorised" ON "public"."legal_counsel_engagements"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text, 'cfo'::text, 'ceo'::text]))))));

-- policy public.legal_counterparties :: legal_counterparties_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_counterparties"'::regclass
     AND polname = 'legal_counterparties_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_counterparties_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_counterparties_admin_legal_ops', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_counterparties_admin_legal_ops" ON "public"."legal_counterparties"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_counterparty_merge_history :: legal_counterparty_merge_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_counterparty_merge_history"'::regclass
     AND polname = 'legal_counterparty_merge_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_counterparty_merge_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_counterparty_merge_admin_legal_ops', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_counterparty_merge_admin_legal_ops" ON "public"."legal_counterparty_merge_history"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_dmca_counter_notices :: legal_dmca_counter_notices_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_dmca_counter_notices"'::regclass
     AND polname = 'legal_dmca_counter_notices_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_dmca_counter_notices_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_dmca_counter_notices_admin_legal_ops', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_dmca_counter_notices_admin_legal_ops" ON "public"."legal_dmca_counter_notices"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_dmca_filings :: legal_dmca_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_dmca_filings"'::regclass
     AND polname = 'legal_dmca_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_dmca_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_dmca_admin_legal_ops', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_dmca_admin_legal_ops" ON "public"."legal_dmca_filings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_enforcement_actions :: legal_actions_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_enforcement_actions"'::regclass
     AND polname = 'legal_actions_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_actions_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_actions_admin_legal_ops', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_actions_admin_legal_ops" ON "public"."legal_enforcement_actions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_investigation_cases :: legal_cases_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_investigation_cases"'::regclass
     AND polname = 'legal_cases_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_cases_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM 'df212f0f70172296b361f84bcce09b69' OR check_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_cases_admin_legal_ops', qual_hash, 'df212f0f70172296b361f84bcce09b69', check_hash, '93caff6a1ef4bf955abdf08d3f870314';
  END IF;
END
$guard$;
ALTER POLICY "legal_cases_admin_legal_ops" ON "public"."legal_investigation_cases"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text, 'medical_director'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_investigation_evidence :: legal_evidence_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_investigation_evidence"'::regclass
     AND polname = 'legal_evidence_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_evidence_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_evidence_admin_legal_ops', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_evidence_admin_legal_ops" ON "public"."legal_investigation_evidence"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_marketplace_complaints :: legal_marketplace_complaints_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_marketplace_complaints"'::regclass
     AND polname = 'legal_marketplace_complaints_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_marketplace_complaints_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_marketplace_complaints_admin_legal_ops', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_marketplace_complaints_admin_legal_ops" ON "public"."legal_marketplace_complaints"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_marketplace_integrations :: legal_marketplace_integrations_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_marketplace_integrations"'::regclass
     AND polname = 'legal_marketplace_integrations_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_marketplace_integrations_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_marketplace_integrations_admin_legal_ops', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_marketplace_integrations_admin_legal_ops" ON "public"."legal_marketplace_integrations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.legal_operations_audit_log :: legal_audit_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_operations_audit_log"'::regclass
     AND polname = 'legal_audit_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_audit_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '1f73658f80f88c53026167886b9b0d78' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_audit_admin_read', qual_hash, '1f73658f80f88c53026167886b9b0d78', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_audit_admin_read" ON "public"."legal_operations_audit_log"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.legal_outside_counsel :: legal_counsel_admin_only
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_outside_counsel"'::regclass
     AND polname = 'legal_counsel_admin_only';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_counsel_admin_only';
  END IF;
  IF qual_hash IS DISTINCT FROM '1f73658f80f88c53026167886b9b0d78' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_counsel_admin_only', qual_hash, '1f73658f80f88c53026167886b9b0d78', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_counsel_admin_only" ON "public"."legal_outside_counsel"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.legal_privilege_grants :: legal_privilege_grants_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_privilege_grants"'::regclass
     AND polname = 'legal_privilege_grants_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_privilege_grants_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'e6fcaf92c6ef89474087c8f347c6b373' OR check_hash IS DISTINCT FROM '1f73658f80f88c53026167886b9b0d78' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_privilege_grants_admin', qual_hash, 'e6fcaf92c6ef89474087c8f347c6b373', check_hash, '1f73658f80f88c53026167886b9b0d78';
  END IF;
END
$guard$;
ALTER POLICY "legal_privilege_grants_admin" ON "public"."legal_privilege_grants"
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))) OR (user_id = ( SELECT auth.uid() AS uid))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.legal_privileged_communications :: legal_privileged_comms_scoped
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_privileged_communications"'::regclass
     AND polname = 'legal_privileged_comms_scoped';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_privileged_comms_scoped';
  END IF;
  IF qual_hash IS DISTINCT FROM '068866260248ccb88a89f3e976e9a4e4' OR check_hash IS DISTINCT FROM '068866260248ccb88a89f3e976e9a4e4' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_privileged_comms_scoped', qual_hash, '068866260248ccb88a89f3e976e9a4e4', check_hash, '068866260248ccb88a89f3e976e9a4e4';
  END IF;
END
$guard$;
ALTER POLICY "legal_privileged_comms_scoped" ON "public"."legal_privileged_communications"
  USING (((EXISTS ( SELECT 1
   FROM legal_privilege_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND (g.case_id = legal_privileged_communications.case_id) AND (g.active = true)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM legal_privilege_grants g
  WHERE ((g.user_id = ( SELECT auth.uid() AS uid)) AND (g.case_id = legal_privileged_communications.case_id) AND (g.active = true)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.legal_templates_library :: legal_templates_admin_legal_ops
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."legal_templates_library"'::regclass
     AND polname = 'legal_templates_admin_legal_ops';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'legal_templates_admin_legal_ops';
  END IF;
  IF qual_hash IS DISTINCT FROM '93caff6a1ef4bf955abdf08d3f870314' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'legal_templates_admin_legal_ops', qual_hash, '93caff6a1ef4bf955abdf08d3f870314', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "legal_templates_admin_legal_ops" ON "public"."legal_templates_library"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text, 'legal_ops'::text]))))));

-- policy public.level_4_enrollments :: l4_enroll_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."level_4_enrollments"'::regclass
     AND polname = 'l4_enroll_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'l4_enroll_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'l4_enroll_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "l4_enroll_admin_all" ON "public"."level_4_enrollments"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.level_4_enrollments :: l4_enroll_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."level_4_enrollments"'::regclass
     AND polname = 'l4_enroll_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'l4_enroll_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'f0cb856b2e6538fe39818649c674a276' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'l4_enroll_self_read', qual_hash, 'f0cb856b2e6538fe39818649c674a276', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "l4_enroll_self_read" ON "public"."level_4_enrollments"
  USING ((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))));

-- policy public.level_4_parameters :: l4_params_admin_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."level_4_parameters"'::regclass
     AND polname = 'l4_params_admin_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'l4_params_admin_write';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'l4_params_admin_write', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "l4_params_admin_write" ON "public"."level_4_parameters"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.manual_customers :: manual_customers_self_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."manual_customers"'::regclass
     AND polname = 'manual_customers_self_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'manual_customers_self_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM '2e8a6d7300017a6ac66daedc906f0f08' OR check_hash IS DISTINCT FROM '2e8a6d7300017a6ac66daedc906f0f08' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'manual_customers_self_rw', qual_hash, '2e8a6d7300017a6ac66daedc906f0f08', check_hash, '2e8a6d7300017a6ac66daedc906f0f08';
  END IF;
END
$guard$;
ALTER POLICY "manual_customers_self_rw" ON "public"."manual_customers"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.map_compliance_scores :: map_compliance_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_compliance_scores"'::regclass
     AND polname = 'map_compliance_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_compliance_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'e9e98c0efa0f62746e2142d8d0513a92' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_compliance_self_read', qual_hash, 'e9e98c0efa0f62746e2142d8d0513a92', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "map_compliance_self_read" ON "public"."map_compliance_scores"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.map_policies :: map_policies_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_policies"'::regclass
     AND polname = 'map_policies_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_policies_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'db1719cacfc1624eb4e57ded02b7ccfa' OR check_hash IS DISTINCT FROM 'db1719cacfc1624eb4e57ded02b7ccfa' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_policies_admin_all', qual_hash, 'db1719cacfc1624eb4e57ded02b7ccfa', check_hash, 'db1719cacfc1624eb4e57ded02b7ccfa';
  END IF;
END
$guard$;
ALTER POLICY "map_policies_admin_all" ON "public"."map_policies"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.map_policies :: map_policies_read_for_practitioners_admins
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_policies"'::regclass
     AND polname = 'map_policies_read_for_practitioners_admins';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_policies_read_for_practitioners_admins';
  END IF;
  IF qual_hash IS DISTINCT FROM '300df5bfe174c3a719b7d799318f1553' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_policies_read_for_practitioners_admins', qual_hash, '300df5bfe174c3a719b7d799318f1553', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "map_policies_read_for_practitioners_admins" ON "public"."map_policies"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['practitioner'::text, 'admin'::text]))))));

-- policy public.map_policy_change_log :: map_policy_log_admin_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_policy_change_log"'::regclass
     AND polname = 'map_policy_log_admin_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_policy_log_admin_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'db1719cacfc1624eb4e57ded02b7ccfa' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_policy_log_admin_insert', qual_hash, NULL, check_hash, 'db1719cacfc1624eb4e57ded02b7ccfa';
  END IF;
END
$guard$;
ALTER POLICY "map_policy_log_admin_insert" ON "public"."map_policy_change_log"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.map_policy_change_log :: map_policy_log_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_policy_change_log"'::regclass
     AND polname = 'map_policy_log_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_policy_log_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'db1719cacfc1624eb4e57ded02b7ccfa' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_policy_log_admin_read', qual_hash, 'db1719cacfc1624eb4e57ded02b7ccfa', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "map_policy_log_admin_read" ON "public"."map_policy_change_log"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.map_price_observations :: map_observations_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_price_observations"'::regclass
     AND polname = 'map_observations_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_observations_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'db1719cacfc1624eb4e57ded02b7ccfa' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_observations_admin_read', qual_hash, 'db1719cacfc1624eb4e57ded02b7ccfa', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "map_observations_admin_read" ON "public"."map_price_observations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.map_remediation_evidence :: map_evidence_self_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_remediation_evidence"'::regclass
     AND polname = 'map_evidence_self_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_evidence_self_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM 'e9e98c0efa0f62746e2142d8d0513a92' OR check_hash IS DISTINCT FROM 'e9e98c0efa0f62746e2142d8d0513a92' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_evidence_self_rw', qual_hash, 'e9e98c0efa0f62746e2142d8d0513a92', check_hash, 'e9e98c0efa0f62746e2142d8d0513a92';
  END IF;
END
$guard$;
ALTER POLICY "map_evidence_self_rw" ON "public"."map_remediation_evidence"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.map_violations :: map_violations_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_violations"'::regclass
     AND polname = 'map_violations_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_violations_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'db1719cacfc1624eb4e57ded02b7ccfa' OR check_hash IS DISTINCT FROM 'db1719cacfc1624eb4e57ded02b7ccfa' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_violations_admin_all', qual_hash, 'db1719cacfc1624eb4e57ded02b7ccfa', check_hash, 'db1719cacfc1624eb4e57ded02b7ccfa';
  END IF;
END
$guard$;
ALTER POLICY "map_violations_admin_all" ON "public"."map_violations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.map_violations :: map_violations_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_violations"'::regclass
     AND polname = 'map_violations_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_violations_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'e9e98c0efa0f62746e2142d8d0513a92' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_violations_self_read', qual_hash, 'e9e98c0efa0f62746e2142d8d0513a92', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "map_violations_self_read" ON "public"."map_violations"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.map_vip_exemption_sensitive_notes :: map_vip_sensitive_notes_restricted_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_vip_exemption_sensitive_notes"'::regclass
     AND polname = 'map_vip_sensitive_notes_restricted_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_vip_sensitive_notes_restricted_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '439f6be52fcb16da72a2aae5f84da219' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_vip_sensitive_notes_restricted_read', qual_hash, '439f6be52fcb16da72a2aae5f84da219', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "map_vip_sensitive_notes_restricted_read" ON "public"."map_vip_exemption_sensitive_notes"
  USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text]))))) OR (EXISTS ( SELECT 1
   FROM (map_vip_exemptions ve
     JOIN practitioners pr ON ((pr.id = ve.practitioner_id)))
  WHERE ((ve.vip_exemption_id = map_vip_exemption_sensitive_notes.vip_exemption_id) AND (pr.user_id = ( SELECT auth.uid() AS uid)))))));

-- policy public.map_vip_exemptions :: map_vip_exemptions_self_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_vip_exemptions"'::regclass
     AND polname = 'map_vip_exemptions_self_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_vip_exemptions_self_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM '62962af6d52a0f32b56f6195178ed34f' OR check_hash IS DISTINCT FROM '2e8a6d7300017a6ac66daedc906f0f08' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_vip_exemptions_self_rw', qual_hash, '62962af6d52a0f32b56f6195178ed34f', check_hash, '2e8a6d7300017a6ac66daedc906f0f08';
  END IF;
END
$guard$;
ALTER POLICY "map_vip_exemptions_self_rw" ON "public"."map_vip_exemptions"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text])))))))
  WITH CHECK (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.map_waiver_evidence :: map_waiver_evidence_inherit
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_waiver_evidence"'::regclass
     AND polname = 'map_waiver_evidence_inherit';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_waiver_evidence_inherit';
  END IF;
  IF qual_hash IS DISTINCT FROM 'ced61f83b7e1e17037322ec45764cae9' OR check_hash IS DISTINCT FROM '17df93b9f41a8be3e987428be294f42b' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_waiver_evidence_inherit', qual_hash, 'ced61f83b7e1e17037322ec45764cae9', check_hash, '17df93b9f41a8be3e987428be294f42b';
  END IF;
END
$guard$;
ALTER POLICY "map_waiver_evidence_inherit" ON "public"."map_waiver_evidence"
  USING (((waiver_id IN ( SELECT w.waiver_id
   FROM map_waivers w
  WHERE (w.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text])))))))
  WITH CHECK (((waiver_id IN ( SELECT w.waiver_id
   FROM map_waivers w
  WHERE (w.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.map_waiver_skus :: map_waiver_skus_inherit
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_waiver_skus"'::regclass
     AND polname = 'map_waiver_skus_inherit';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_waiver_skus_inherit';
  END IF;
  IF qual_hash IS DISTINCT FROM '17df93b9f41a8be3e987428be294f42b' OR check_hash IS DISTINCT FROM '17df93b9f41a8be3e987428be294f42b' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_waiver_skus_inherit', qual_hash, '17df93b9f41a8be3e987428be294f42b', check_hash, '17df93b9f41a8be3e987428be294f42b';
  END IF;
END
$guard$;
ALTER POLICY "map_waiver_skus_inherit" ON "public"."map_waiver_skus"
  USING (((waiver_id IN ( SELECT w.waiver_id
   FROM map_waivers w
  WHERE (w.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((waiver_id IN ( SELECT w.waiver_id
   FROM map_waivers w
  WHERE (w.practitioner_id IN ( SELECT practitioners.id
           FROM practitioners
          WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.map_waivers :: map_waivers_self_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."map_waivers"'::regclass
     AND polname = 'map_waivers_self_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'map_waivers_self_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM '62962af6d52a0f32b56f6195178ed34f' OR check_hash IS DISTINCT FROM '2e8a6d7300017a6ac66daedc906f0f08' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'map_waivers_self_rw', qual_hash, '62962af6d52a0f32b56f6195178ed34f', check_hash, '2e8a6d7300017a6ac66daedc906f0f08';
  END IF;
END
$guard$;
ALTER POLICY "map_waivers_self_rw" ON "public"."map_waivers"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text])))))))
  WITH CHECK (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.marketing_copy_conversions :: conversions_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."marketing_copy_conversions"'::regclass
     AND polname = 'conversions_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'conversions_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '166d1ca209b05a9b0a100dda81187c1a' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'conversions_admin_read', qual_hash, '166d1ca209b05a9b0a100dda81187c1a', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "conversions_admin_read" ON "public"."marketing_copy_conversions"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.marketing_copy_impressions :: impressions_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."marketing_copy_impressions"'::regclass
     AND polname = 'impressions_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'impressions_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '166d1ca209b05a9b0a100dda81187c1a' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'impressions_admin_read', qual_hash, '166d1ca209b05a9b0a100dda81187c1a', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "impressions_admin_read" ON "public"."marketing_copy_impressions"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.marketing_copy_test_rounds :: test_rounds_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."marketing_copy_test_rounds"'::regclass
     AND polname = 'test_rounds_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'test_rounds_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '166d1ca209b05a9b0a100dda81187c1a' OR check_hash IS DISTINCT FROM '166d1ca209b05a9b0a100dda81187c1a' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'test_rounds_admin', qual_hash, '166d1ca209b05a9b0a100dda81187c1a', check_hash, '166d1ca209b05a9b0a100dda81187c1a';
  END IF;
END
$guard$;
ALTER POLICY "test_rounds_admin" ON "public"."marketing_copy_test_rounds"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.marketing_copy_variant_events :: variant_events_admin_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."marketing_copy_variant_events"'::regclass
     AND polname = 'variant_events_admin_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'variant_events_admin_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '166d1ca209b05a9b0a100dda81187c1a' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'variant_events_admin_insert', qual_hash, NULL, check_hash, '166d1ca209b05a9b0a100dda81187c1a';
  END IF;
END
$guard$;
ALTER POLICY "variant_events_admin_insert" ON "public"."marketing_copy_variant_events"
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.marketing_copy_variant_events :: variant_events_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."marketing_copy_variant_events"'::regclass
     AND polname = 'variant_events_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'variant_events_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '166d1ca209b05a9b0a100dda81187c1a' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'variant_events_admin_read', qual_hash, '166d1ca209b05a9b0a100dda81187c1a', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "variant_events_admin_read" ON "public"."marketing_copy_variant_events"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.marketing_copy_variants :: variants_admin_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."marketing_copy_variants"'::regclass
     AND polname = 'variants_admin_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'variants_admin_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c5ab9f49dc6695255eba4f4079a50643' OR check_hash IS DISTINCT FROM 'c5ab9f49dc6695255eba4f4079a50643' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'variants_admin_rw', qual_hash, 'c5ab9f49dc6695255eba4f4079a50643', check_hash, 'c5ab9f49dc6695255eba4f4079a50643';
  END IF;
END
$guard$;
ALTER POLICY "variants_admin_rw" ON "public"."marketing_copy_variants"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.marshall_vision_config :: mvc_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."marshall_vision_config"'::regclass
     AND polname = 'mvc_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'mvc_write';
  END IF;
  IF qual_hash IS DISTINCT FROM '133b8f51c5ce5576d67a7b69ca3e4fe7' OR check_hash IS DISTINCT FROM '133b8f51c5ce5576d67a7b69ca3e4fe7' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'mvc_write', qual_hash, '133b8f51c5ce5576d67a7b69ca3e4fe7', check_hash, '133b8f51c5ce5576d67a7b69ca3e4fe7';
  END IF;
END
$guard$;
ALTER POLICY "mvc_write" ON "public"."marshall_vision_config"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));

-- policy public.master_skus_market_pricing :: mskumkt_read_all_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."master_skus_market_pricing"'::regclass
     AND polname = 'mskumkt_read_all_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'mskumkt_read_all_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'mskumkt_read_all_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "mskumkt_read_all_admin" ON "public"."master_skus_market_pricing"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.master_skus_market_pricing :: mskumkt_write_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."master_skus_market_pricing"'::regclass
     AND polname = 'mskumkt_write_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'mskumkt_write_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'mskumkt_write_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, '85946ae3dc4ada21492e6d76d6cf35f8';
  END IF;
END
$guard$;
ALTER POLICY "mskumkt_write_admin" ON "public"."master_skus_market_pricing"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.meal_logs :: Users can manage own meal logs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."meal_logs"'::regclass
     AND polname = 'Users can manage own meal logs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can manage own meal logs';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can manage own meal logs', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can manage own meal logs" ON "public"."meal_logs"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.medication_interactions :: Users view own interactions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."medication_interactions"'::regclass
     AND polname = 'Users view own interactions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users view own interactions';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users view own interactions', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users view own interactions" ON "public"."medication_interactions"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.memberships :: Users can view own membership
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."memberships"'::regclass
     AND polname = 'Users can view own membership';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own membership';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own membership', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own membership" ON "public"."memberships"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.naturopath_profiles :: Naturopaths delete own profile
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."naturopath_profiles"'::regclass
     AND polname = 'Naturopaths delete own profile';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Naturopaths delete own profile';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Naturopaths delete own profile', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Naturopaths delete own profile" ON "public"."naturopath_profiles"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.naturopath_profiles :: Naturopaths insert own profile
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."naturopath_profiles"'::regclass
     AND polname = 'Naturopaths insert own profile';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Naturopaths insert own profile';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Naturopaths insert own profile', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Naturopaths insert own profile" ON "public"."naturopath_profiles"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.naturopath_profiles :: Naturopaths update own profile
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."naturopath_profiles"'::regclass
     AND polname = 'Naturopaths update own profile';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Naturopaths update own profile';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Naturopaths update own profile', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Naturopaths update own profile" ON "public"."naturopath_profiles"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.notification_batch_queue :: nbq_read_scoped
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_batch_queue"'::regclass
     AND polname = 'nbq_read_scoped';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'nbq_read_scoped';
  END IF;
  IF qual_hash IS DISTINCT FROM 'd5bda19a9a6dcffd2614569917be2428' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'nbq_read_scoped', qual_hash, 'd5bda19a9a6dcffd2614569917be2428', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "nbq_read_scoped" ON "public"."notification_batch_queue"
  USING (((practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text])))))));

-- policy public.notification_channel_credentials :: ncc_own_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_channel_credentials"'::regclass
     AND polname = 'ncc_own_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'ncc_own_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'd5bda19a9a6dcffd2614569917be2428' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'ncc_own_read', qual_hash, 'd5bda19a9a6dcffd2614569917be2428', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "ncc_own_read" ON "public"."notification_channel_credentials"
  USING (((practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text])))))));

-- policy public.notification_channel_credentials :: ncc_own_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_channel_credentials"'::regclass
     AND polname = 'ncc_own_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'ncc_own_write';
  END IF;
  IF qual_hash IS DISTINCT FROM '5cf093485673fae29e7818a4756f6fe5' OR check_hash IS DISTINCT FROM '5cf093485673fae29e7818a4756f6fe5' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'ncc_own_write', qual_hash, '5cf093485673fae29e7818a4756f6fe5', check_hash, '5cf093485673fae29e7818a4756f6fe5';
  END IF;
END
$guard$;
ALTER POLICY "ncc_own_write" ON "public"."notification_channel_credentials"
  USING (((practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.notification_event_registry :: nevreg_write_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_event_registry"'::regclass
     AND polname = 'nevreg_write_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'nevreg_write_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '9aaf8f20bf88224545824f1bfa7e626a' OR check_hash IS DISTINCT FROM '9aaf8f20bf88224545824f1bfa7e626a' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'nevreg_write_admin', qual_hash, '9aaf8f20bf88224545824f1bfa7e626a', check_hash, '9aaf8f20bf88224545824f1bfa7e626a';
  END IF;
END
$guard$;
ALTER POLICY "nevreg_write_admin" ON "public"."notification_event_registry"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.notification_events_inbox :: inbox_insert_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_events_inbox"'::regclass
     AND polname = 'inbox_insert_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'inbox_insert_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '282ff563af27ca8451ec70575b2f321c' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'inbox_insert_admin', qual_hash, NULL, check_hash, '282ff563af27ca8451ec70575b2f321c';
  END IF;
END
$guard$;
ALTER POLICY "inbox_insert_admin" ON "public"."notification_events_inbox"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.notification_events_inbox :: inbox_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_events_inbox"'::regclass
     AND polname = 'inbox_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'inbox_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '282ff563af27ca8451ec70575b2f321c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'inbox_read_admin', qual_hash, '282ff563af27ca8451ec70575b2f321c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "inbox_read_admin" ON "public"."notification_events_inbox"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.notification_legal_ops_preferences :: nlop_read_scoped
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_legal_ops_preferences"'::regclass
     AND polname = 'nlop_read_scoped';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'nlop_read_scoped';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b7e10d37bc96adf9eb4c5497676ad2e2' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'nlop_read_scoped', qual_hash, 'b7e10d37bc96adf9eb4c5497676ad2e2', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "nlop_read_scoped" ON "public"."notification_legal_ops_preferences"
  USING (((EXISTS ( SELECT 1
   FROM notification_legal_ops_recipients lr
  WHERE ((lr.recipient_id = notification_legal_ops_preferences.recipient_id) AND ((lr.user_id = ( SELECT auth.uid() AS uid)) OR (lr.designated_alternate_user_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.notification_legal_ops_preferences :: nlop_write_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_legal_ops_preferences"'::regclass
     AND polname = 'nlop_write_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'nlop_write_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'dd36fe621c6459fa26b4df85edb3db3d' OR check_hash IS DISTINCT FROM 'dd36fe621c6459fa26b4df85edb3db3d' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'nlop_write_admin', qual_hash, 'dd36fe621c6459fa26b4df85edb3db3d', check_hash, 'dd36fe621c6459fa26b4df85edb3db3d';
  END IF;
END
$guard$;
ALTER POLICY "nlop_write_admin" ON "public"."notification_legal_ops_preferences"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.notification_legal_ops_recipients :: nlor_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_legal_ops_recipients"'::regclass
     AND polname = 'nlor_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'nlor_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'a85712393a7eb6ea556c0b90b9c067dc' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'nlor_read_admin', qual_hash, 'a85712393a7eb6ea556c0b90b9c067dc', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "nlor_read_admin" ON "public"."notification_legal_ops_recipients"
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR (designated_alternate_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.notification_legal_ops_recipients :: nlor_write_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_legal_ops_recipients"'::regclass
     AND polname = 'nlor_write_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'nlor_write_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'dd36fe621c6459fa26b4df85edb3db3d' OR check_hash IS DISTINCT FROM 'dd36fe621c6459fa26b4df85edb3db3d' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'nlor_write_admin', qual_hash, 'dd36fe621c6459fa26b4df85edb3db3d', check_hash, 'dd36fe621c6459fa26b4df85edb3db3d';
  END IF;
END
$guard$;
ALTER POLICY "nlor_write_admin" ON "public"."notification_legal_ops_recipients"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.notification_phi_redaction_failures :: phifail_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_phi_redaction_failures"'::regclass
     AND polname = 'phifail_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'phifail_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '282ff563af27ca8451ec70575b2f321c' OR check_hash IS DISTINCT FROM '282ff563af27ca8451ec70575b2f321c' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'phifail_admin_all', qual_hash, '282ff563af27ca8451ec70575b2f321c', check_hash, '282ff563af27ca8451ec70575b2f321c';
  END IF;
END
$guard$;
ALTER POLICY "phifail_admin_all" ON "public"."notification_phi_redaction_failures"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.notification_preferences :: npref_own_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_preferences"'::regclass
     AND polname = 'npref_own_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'npref_own_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'd5bda19a9a6dcffd2614569917be2428' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'npref_own_read', qual_hash, 'd5bda19a9a6dcffd2614569917be2428', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "npref_own_read" ON "public"."notification_preferences"
  USING (((practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text])))))));

-- policy public.notification_preferences :: npref_own_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_preferences"'::regclass
     AND polname = 'npref_own_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'npref_own_write';
  END IF;
  IF qual_hash IS DISTINCT FROM '5cf093485673fae29e7818a4756f6fe5' OR check_hash IS DISTINCT FROM '5cf093485673fae29e7818a4756f6fe5' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'npref_own_write', qual_hash, '5cf093485673fae29e7818a4756f6fe5', check_hash, '5cf093485673fae29e7818a4756f6fe5';
  END IF;
END
$guard$;
ALTER POLICY "npref_own_write" ON "public"."notification_preferences"
  USING (((practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.notification_quiet_hours :: nqh_own_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_quiet_hours"'::regclass
     AND polname = 'nqh_own_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'nqh_own_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '5cf093485673fae29e7818a4756f6fe5' OR check_hash IS DISTINCT FROM '5cf093485673fae29e7818a4756f6fe5' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'nqh_own_all', qual_hash, '5cf093485673fae29e7818a4756f6fe5', check_hash, '5cf093485673fae29e7818a4756f6fe5';
  END IF;
END
$guard$;
ALTER POLICY "nqh_own_all" ON "public"."notification_quiet_hours"
  USING (((practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.notification_sms_opt_in_log :: optin_insert_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_sms_opt_in_log"'::regclass
     AND polname = 'optin_insert_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'optin_insert_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '282ff563af27ca8451ec70575b2f321c' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'optin_insert_admin', qual_hash, NULL, check_hash, '282ff563af27ca8451ec70575b2f321c';
  END IF;
END
$guard$;
ALTER POLICY "optin_insert_admin" ON "public"."notification_sms_opt_in_log"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.notification_sms_opt_in_log :: optin_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notification_sms_opt_in_log"'::regclass
     AND polname = 'optin_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'optin_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'd5bda19a9a6dcffd2614569917be2428' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'optin_read_admin', qual_hash, 'd5bda19a9a6dcffd2614569917be2428', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "optin_read_admin" ON "public"."notification_sms_opt_in_log"
  USING (((practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text])))))));

-- policy public.notifications :: Users can insert own notifications
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notifications"'::regclass
     AND polname = 'Users can insert own notifications';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own notifications';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own notifications', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own notifications" ON "public"."notifications"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.notifications :: Users can update own notifications
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notifications"'::regclass
     AND polname = 'Users can update own notifications';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own notifications';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own notifications', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own notifications" ON "public"."notifications"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.notifications :: Users can view own notifications
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notifications"'::regclass
     AND polname = 'Users can view own notifications';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own notifications';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own notifications', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own notifications" ON "public"."notifications"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.notifications_dispatched :: nd_insert_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notifications_dispatched"'::regclass
     AND polname = 'nd_insert_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'nd_insert_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '282ff563af27ca8451ec70575b2f321c' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'nd_insert_admin', qual_hash, NULL, check_hash, '282ff563af27ca8451ec70575b2f321c';
  END IF;
END
$guard$;
ALTER POLICY "nd_insert_admin" ON "public"."notifications_dispatched"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.notifications_dispatched :: nd_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."notifications_dispatched"'::regclass
     AND polname = 'nd_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'nd_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'af77068e1042ede6a702ec71e01e0f5e' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'nd_read_admin', qual_hash, 'af77068e1042ede6a702ec71e01e0f5e', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "nd_read_admin" ON "public"."notifications_dispatched"
  USING (((recipient_practitioner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text])))))));

-- policy public.nutrition_logs :: Users delete own nutrition logs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."nutrition_logs"'::regclass
     AND polname = 'Users delete own nutrition logs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users delete own nutrition logs';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users delete own nutrition logs', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users delete own nutrition logs" ON "public"."nutrition_logs"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.nutrition_logs :: Users insert own nutrition logs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."nutrition_logs"'::regclass
     AND polname = 'Users insert own nutrition logs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users insert own nutrition logs';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users insert own nutrition logs', qual_hash, NULL, check_hash, '9ad14b2b86b8b04fa98c04698e3e99b1';
  END IF;
END
$guard$;
ALTER POLICY "Users insert own nutrition logs" ON "public"."nutrition_logs"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.nutrition_logs :: Users select own nutrition logs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."nutrition_logs"'::regclass
     AND polname = 'Users select own nutrition logs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users select own nutrition logs';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users select own nutrition logs', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users select own nutrition logs" ON "public"."nutrition_logs"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.nutrition_logs :: Users update own nutrition logs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."nutrition_logs"'::regclass
     AND polname = 'Users update own nutrition logs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users update own nutrition logs';
  END IF;
  IF qual_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' OR check_hash IS DISTINCT FROM '9ad14b2b86b8b04fa98c04698e3e99b1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users update own nutrition logs', qual_hash, '9ad14b2b86b8b04fa98c04698e3e99b1', check_hash, '9ad14b2b86b8b04fa98c04698e3e99b1';
  END IF;
END
$guard$;
ALTER POLICY "Users update own nutrition logs" ON "public"."nutrition_logs"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.order_currency_details :: ocd_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."order_currency_details"'::regclass
     AND polname = 'ocd_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'ocd_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '85946ae3dc4ada21492e6d76d6cf35f8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'ocd_read_admin', qual_hash, '85946ae3dc4ada21492e6d76d6cf35f8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "ocd_read_admin" ON "public"."order_currency_details"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'finance_admin'::text, 'compliance_admin'::text]))))));

-- policy public.order_items :: Users can view own order items
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."order_items"'::regclass
     AND polname = 'Users can view own order items';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own order items';
  END IF;
  IF qual_hash IS DISTINCT FROM 'fbde0f5d3a94c2556a90e58d77fcfa61' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own order items', qual_hash, 'fbde0f5d3a94c2556a90e58d77fcfa61', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own order items" ON "public"."order_items"
  USING ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = ( SELECT auth.uid() AS uid))))));

-- policy public.orders :: Users can insert own orders
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."orders"'::regclass
     AND polname = 'Users can insert own orders';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own orders';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own orders', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own orders" ON "public"."orders"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.orders :: Users can view own orders
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."orders"'::regclass
     AND polname = 'Users can view own orders';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own orders';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own orders', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own orders" ON "public"."orders"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.outcome_timeline_cta :: outcome_cta_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."outcome_timeline_cta"'::regclass
     AND polname = 'outcome_cta_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'outcome_cta_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'outcome_cta_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "outcome_cta_admin" ON "public"."outcome_timeline_cta"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.outcome_timeline_events :: outcome_events_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."outcome_timeline_events"'::regclass
     AND polname = 'outcome_events_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'outcome_events_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'outcome_events_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "outcome_events_admin" ON "public"."outcome_timeline_events"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.outcome_timeline_phases :: outcome_phases_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."outcome_timeline_phases"'::regclass
     AND polname = 'outcome_phases_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'outcome_phases_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'outcome_phases_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "outcome_phases_admin" ON "public"."outcome_timeline_phases"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.outcome_timeline_qualifier :: outcome_qualifier_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."outcome_timeline_qualifier"'::regclass
     AND polname = 'outcome_qualifier_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'outcome_qualifier_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'outcome_qualifier_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "outcome_qualifier_admin" ON "public"."outcome_timeline_qualifier"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.outcome_timeline_section_blocks :: outcome_section_blocks_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."outcome_timeline_section_blocks"'::regclass
     AND polname = 'outcome_section_blocks_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'outcome_section_blocks_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'outcome_section_blocks_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "outcome_section_blocks_admin" ON "public"."outcome_timeline_section_blocks"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.outcome_timeline_variant_sets :: outcome_variant_sets_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."outcome_timeline_variant_sets"'::regclass
     AND polname = 'outcome_variant_sets_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'outcome_variant_sets_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'outcome_variant_sets_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "outcome_variant_sets_admin" ON "public"."outcome_timeline_variant_sets"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.patient_practitioner_relationships :: ppr_patient_full_access
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."patient_practitioner_relationships"'::regclass
     AND polname = 'ppr_patient_full_access';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'ppr_patient_full_access';
  END IF;
  IF qual_hash IS DISTINCT FROM '0d7f4b72c2dd078b418837a0e98b54ed' OR check_hash IS DISTINCT FROM '0d7f4b72c2dd078b418837a0e98b54ed' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'ppr_patient_full_access', qual_hash, '0d7f4b72c2dd078b418837a0e98b54ed', check_hash, '0d7f4b72c2dd078b418837a0e98b54ed';
  END IF;
END
$guard$;
ALTER POLICY "ppr_patient_full_access" ON "public"."patient_practitioner_relationships"
  USING ((patient_user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((patient_user_id = ( SELECT auth.uid() AS uid)));

-- policy public.patient_practitioner_relationships :: ppr_practitioner_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."patient_practitioner_relationships"'::regclass
     AND polname = 'ppr_practitioner_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'ppr_practitioner_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'f0cb856b2e6538fe39818649c674a276' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'ppr_practitioner_read', qual_hash, 'f0cb856b2e6538fe39818649c674a276', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "ppr_practitioner_read" ON "public"."patient_practitioner_relationships"
  USING ((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))));

-- policy public.payout_batch_lines :: pbl_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."payout_batch_lines"'::regclass
     AND polname = 'pbl_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'pbl_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '4f05a0d165cc89c12538311a08cc9145' OR check_hash IS DISTINCT FROM '4f05a0d165cc89c12538311a08cc9145' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'pbl_admin_all', qual_hash, '4f05a0d165cc89c12538311a08cc9145', check_hash, '4f05a0d165cc89c12538311a08cc9145';
  END IF;
END
$guard$;
ALTER POLICY "pbl_admin_all" ON "public"."payout_batch_lines"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.payout_batch_lines :: pbl_practitioner_read_admin_full
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."payout_batch_lines"'::regclass
     AND polname = 'pbl_practitioner_read_admin_full';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'pbl_practitioner_read_admin_full';
  END IF;
  IF qual_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'pbl_practitioner_read_admin_full', qual_hash, '5d732ce63416021ad0328c12dc5fde80', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "pbl_practitioner_read_admin_full" ON "public"."payout_batch_lines"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.payout_batches :: payout_batches_admin_only
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."payout_batches"'::regclass
     AND polname = 'payout_batches_admin_only';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'payout_batches_admin_only';
  END IF;
  IF qual_hash IS DISTINCT FROM '4f05a0d165cc89c12538311a08cc9145' OR check_hash IS DISTINCT FROM '4f05a0d165cc89c12538311a08cc9145' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'payout_batches_admin_only', qual_hash, '4f05a0d165cc89c12538311a08cc9145', check_hash, '4f05a0d165cc89c12538311a08cc9145';
  END IF;
END
$guard$;
ALTER POLICY "payout_batches_admin_only" ON "public"."payout_batches"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.payout_disputes :: disputes_self_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."payout_disputes"'::regclass
     AND polname = 'disputes_self_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'disputes_self_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' OR check_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'disputes_self_rw', qual_hash, '5d732ce63416021ad0328c12dc5fde80', check_hash, '5d732ce63416021ad0328c12dc5fde80';
  END IF;
END
$guard$;
ALTER POLICY "disputes_self_rw" ON "public"."payout_disputes"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.payout_transactions :: pt_admin_only
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."payout_transactions"'::regclass
     AND polname = 'pt_admin_only';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'pt_admin_only';
  END IF;
  IF qual_hash IS DISTINCT FROM '4f05a0d165cc89c12538311a08cc9145' OR check_hash IS DISTINCT FROM '4f05a0d165cc89c12538311a08cc9145' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'pt_admin_only', qual_hash, '4f05a0d165cc89c12538311a08cc9145', check_hash, '4f05a0d165cc89c12538311a08cc9145';
  END IF;
END
$guard$;
ALTER POLICY "pt_admin_only" ON "public"."payout_transactions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.peptide_detected_patterns :: own_pep_patterns
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."peptide_detected_patterns"'::regclass
     AND polname = 'own_pep_patterns';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'own_pep_patterns';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'own_pep_patterns', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "own_pep_patterns" ON "public"."peptide_detected_patterns"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.peptide_stack_protocols :: own_pep_protocols
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."peptide_stack_protocols"'::regclass
     AND polname = 'own_pep_protocols';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'own_pep_protocols';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'own_pep_protocols', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "own_pep_protocols" ON "public"."peptide_stack_protocols"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.peptide_stack_recommendations :: own_pep_recs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."peptide_stack_recommendations"'::regclass
     AND polname = 'own_pep_recs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'own_pep_recs';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'own_pep_recs', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "own_pep_recs" ON "public"."peptide_stack_recommendations"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.photo_share_permissions :: photo_share_permissions_delete_owner
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."photo_share_permissions"'::regclass
     AND polname = 'photo_share_permissions_delete_owner';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'photo_share_permissions_delete_owner';
  END IF;
  IF qual_hash IS DISTINCT FROM '9158950b215dc25cdce0f76630d93ff3' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'photo_share_permissions_delete_owner', qual_hash, '9158950b215dc25cdce0f76630d93ff3', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "photo_share_permissions_delete_owner" ON "public"."photo_share_permissions"
  USING ((( SELECT auth.uid() AS uid) = photo_session_user_id));

-- policy public.photo_share_permissions :: photo_share_permissions_insert_owner
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."photo_share_permissions"'::regclass
     AND polname = 'photo_share_permissions_insert_owner';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'photo_share_permissions_insert_owner';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '9158950b215dc25cdce0f76630d93ff3' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'photo_share_permissions_insert_owner', qual_hash, NULL, check_hash, '9158950b215dc25cdce0f76630d93ff3';
  END IF;
END
$guard$;
ALTER POLICY "photo_share_permissions_insert_owner" ON "public"."photo_share_permissions"
  WITH CHECK ((( SELECT auth.uid() AS uid) = photo_session_user_id));

-- policy public.photo_share_permissions :: photo_share_permissions_select_owner_or_practitioner
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."photo_share_permissions"'::regclass
     AND polname = 'photo_share_permissions_select_owner_or_practitioner';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'photo_share_permissions_select_owner_or_practitioner';
  END IF;
  IF qual_hash IS DISTINCT FROM '86bc3a754307ce2b6bde8c4e6bcfa191' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'photo_share_permissions_select_owner_or_practitioner', qual_hash, '86bc3a754307ce2b6bde8c4e6bcfa191', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "photo_share_permissions_select_owner_or_practitioner" ON "public"."photo_share_permissions"
  USING (((( SELECT auth.uid() AS uid) = photo_session_user_id) OR (( SELECT auth.uid() AS uid) = practitioner_id)));

-- policy public.photo_share_permissions :: photo_share_permissions_update_owner
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."photo_share_permissions"'::regclass
     AND polname = 'photo_share_permissions_update_owner';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'photo_share_permissions_update_owner';
  END IF;
  IF qual_hash IS DISTINCT FROM '9158950b215dc25cdce0f76630d93ff3' OR check_hash IS DISTINCT FROM '9158950b215dc25cdce0f76630d93ff3' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'photo_share_permissions_update_owner', qual_hash, '9158950b215dc25cdce0f76630d93ff3', check_hash, '9158950b215dc25cdce0f76630d93ff3';
  END IF;
END
$guard$;
ALTER POLICY "photo_share_permissions_update_owner" ON "public"."photo_share_permissions"
  USING ((( SELECT auth.uid() AS uid) = photo_session_user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = photo_session_user_id));

-- policy public.practitioner_notice_appeals :: pna_self_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."practitioner_notice_appeals"'::regclass
     AND polname = 'pna_self_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'pna_self_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '9428800de0c7d2f21d4d93a878d5861d' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'pna_self_insert', qual_hash, NULL, check_hash, '9428800de0c7d2f21d4d93a878d5861d';
  END IF;
END
$guard$;
ALTER POLICY "pna_self_insert" ON "public"."practitioner_notice_appeals"
  WITH CHECK (((submitted_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM practitioner_notices pn
  WHERE ((pn.id = practitioner_notice_appeals.notice_id) AND is_practitioner_self(pn.practitioner_id))))));

-- policy public.practitioner_notice_appeals :: pna_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."practitioner_notice_appeals"'::regclass
     AND polname = 'pna_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'pna_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '8bffb6ce8d5a0a899d01b5f49244fd2a' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'pna_self_read', qual_hash, '8bffb6ce8d5a0a899d01b5f49244fd2a', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "pna_self_read" ON "public"."practitioner_notice_appeals"
  USING (((submitted_by = ( SELECT auth.uid() AS uid)) OR is_compliance_reader() OR (EXISTS ( SELECT 1
   FROM practitioner_notices pn
  WHERE ((pn.id = practitioner_notice_appeals.notice_id) AND is_practitioner_self(pn.practitioner_id))))));

-- policy public.practitioner_operations_audit_log :: poal_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."practitioner_operations_audit_log"'::regclass
     AND polname = 'poal_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'poal_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '4f05a0d165cc89c12538311a08cc9145' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'poal_admin_read', qual_hash, '4f05a0d165cc89c12538311a08cc9145', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "poal_admin_read" ON "public"."practitioner_operations_audit_log"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.practitioner_payout_methods :: payout_methods_self_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."practitioner_payout_methods"'::regclass
     AND polname = 'payout_methods_self_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'payout_methods_self_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' OR check_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'payout_methods_self_rw', qual_hash, '5d732ce63416021ad0328c12dc5fde80', check_hash, '5d732ce63416021ad0328c12dc5fde80';
  END IF;
END
$guard$;
ALTER POLICY "payout_methods_self_rw" ON "public"."practitioner_payout_methods"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.practitioner_statements :: statements_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."practitioner_statements"'::regclass
     AND polname = 'statements_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'statements_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'statements_self_read', qual_hash, '5d732ce63416021ad0328c12dc5fde80', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "statements_self_read" ON "public"."practitioner_statements"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.practitioner_tax_documents :: tax_docs_self_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."practitioner_tax_documents"'::regclass
     AND polname = 'tax_docs_self_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'tax_docs_self_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM '6dfeaa6368947655349bc505e56a996e' OR check_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'tax_docs_self_rw', qual_hash, '6dfeaa6368947655349bc505e56a996e', check_hash, '5d732ce63416021ad0328c12dc5fde80';
  END IF;
END
$guard$;
ALTER POLICY "tax_docs_self_rw" ON "public"."practitioner_tax_documents"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_officer'::text])))))))
  WITH CHECK (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.practitioner_verified_channels :: channels_self_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."practitioner_verified_channels"'::regclass
     AND polname = 'channels_self_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'channels_self_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' OR check_hash IS DISTINCT FROM '5d732ce63416021ad0328c12dc5fde80' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'channels_self_rw', qual_hash, '5d732ce63416021ad0328c12dc5fde80', check_hash, '5d732ce63416021ad0328c12dc5fde80';
  END IF;
END
$guard$;
ALTER POLICY "channels_self_rw" ON "public"."practitioner_verified_channels"
  USING (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))))
  WITH CHECK (((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text))))));

-- policy public.practitioners :: practitioners_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."practitioners"'::regclass
     AND polname = 'practitioners_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'practitioners_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '2b32bec13250b91c96f5712dba3b7f47' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'practitioners_self_read', qual_hash, '2b32bec13250b91c96f5712dba3b7f47', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "practitioners_self_read" ON "public"."practitioners"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.prescription_consume_failures :: prescription_consume_failures_insert_own_order
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."prescription_consume_failures"'::regclass
     AND polname = 'prescription_consume_failures_insert_own_order';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'prescription_consume_failures_insert_own_order';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '31396277640f426c57ac967692ebdb96' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'prescription_consume_failures_insert_own_order', qual_hash, NULL, check_hash, '31396277640f426c57ac967692ebdb96';
  END IF;
END
$guard$;
ALTER POLICY "prescription_consume_failures_insert_own_order" ON "public"."prescription_consume_failures"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM shop_orders
  WHERE ((shop_orders.id = prescription_consume_failures.order_id) AND (shop_orders.user_id = ( SELECT auth.uid() AS uid))))));

-- policy public.prescription_tokens :: prescription_tokens_select_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."prescription_tokens"'::regclass
     AND polname = 'prescription_tokens_select_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'prescription_tokens_select_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM 'ac4efa9e3538c982c5a3aa2b071ed81f' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'prescription_tokens_select_merged', qual_hash, 'ac4efa9e3538c982c5a3aa2b071ed81f', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "prescription_tokens_select_merged" ON "public"."prescription_tokens"
  USING (((patient_user_id = ( SELECT auth.uid() AS uid)) OR (practitioner_user_id = ( SELECT auth.uid() AS uid))));

-- policy public.price_change_history :: price_history_insert_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."price_change_history"'::regclass
     AND polname = 'price_history_insert_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'price_history_insert_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'price_history_insert_admin', qual_hash, NULL, check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "price_history_insert_admin" ON "public"."price_change_history"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.price_change_history :: price_history_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."price_change_history"'::regclass
     AND polname = 'price_history_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'price_history_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'price_history_read_admin', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "price_history_read_admin" ON "public"."price_change_history"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.pricing_domains :: pricing_domains_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."pricing_domains"'::regclass
     AND polname = 'pricing_domains_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'pricing_domains_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'pricing_domains_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "pricing_domains_admin_all" ON "public"."pricing_domains"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.pricing_proposals :: pricing_proposals_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."pricing_proposals"'::regclass
     AND polname = 'pricing_proposals_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'pricing_proposals_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'pricing_proposals_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "pricing_proposals_admin_all" ON "public"."pricing_proposals"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.products_image_audit :: products_image_audit_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."products_image_audit"'::regclass
     AND polname = 'products_image_audit_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'products_image_audit_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'd5acf282b8cfb99ee4eae814a1c155f6' OR check_hash IS DISTINCT FROM 'd5acf282b8cfb99ee4eae814a1c155f6' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'products_image_audit_admin_all', qual_hash, 'd5acf282b8cfb99ee4eae814a1c155f6', check_hash, 'd5acf282b8cfb99ee4eae814a1c155f6';
  END IF;
END
$guard$;
ALTER POLICY "products_image_audit_admin_all" ON "public"."products_image_audit"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.profiles :: Users can insert own profile
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."profiles"'::regclass
     AND polname = 'Users can insert own profile';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own profile';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '8f9fa3fbd8e5c06659bc4eac408d747b' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own profile', qual_hash, NULL, check_hash, '8f9fa3fbd8e5c06659bc4eac408d747b';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own profile" ON "public"."profiles"
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

-- policy public.profiles :: Users can update own profile
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."profiles"'::regclass
     AND polname = 'Users can update own profile';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own profile';
  END IF;
  IF qual_hash IS DISTINCT FROM '8f9fa3fbd8e5c06659bc4eac408d747b' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own profile', qual_hash, '8f9fa3fbd8e5c06659bc4eac408d747b', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own profile" ON "public"."profiles"
  USING ((( SELECT auth.uid() AS uid) = id));

-- policy public.profiles :: Users can view own profile
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."profiles"'::regclass
     AND polname = 'Users can view own profile';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own profile';
  END IF;
  IF qual_hash IS DISTINCT FROM '8f9fa3fbd8e5c06659bc4eac408d747b' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own profile', qual_hash, '8f9fa3fbd8e5c06659bc4eac408d747b', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own profile" ON "public"."profiles"
  USING ((( SELECT auth.uid() AS uid) = id));

-- policy public.promotion_roi :: Authenticated read promotion_roi
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."promotion_roi"'::regclass
     AND polname = 'Authenticated read promotion_roi';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Authenticated read promotion_roi';
  END IF;
  IF qual_hash IS DISTINCT FROM 'fe6be3363cff74e318b02a2651158dac' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Authenticated read promotion_roi', qual_hash, 'fe6be3363cff74e318b02a2651158dac', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Authenticated read promotion_roi" ON "public"."promotion_roi"
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

-- policy public.proposal_approvals :: proposal_approvals_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."proposal_approvals"'::regclass
     AND polname = 'proposal_approvals_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'proposal_approvals_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'proposal_approvals_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "proposal_approvals_admin_all" ON "public"."proposal_approvals"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.proposal_comments :: proposal_comments_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."proposal_comments"'::regclass
     AND polname = 'proposal_comments_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'proposal_comments_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'proposal_comments_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "proposal_comments_admin_all" ON "public"."proposal_comments"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.protocol_ingredients :: Users can delete protocol ingredients
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocol_ingredients"'::regclass
     AND polname = 'Users can delete protocol ingredients';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can delete protocol ingredients';
  END IF;
  IF qual_hash IS DISTINCT FROM '85fed6f2482e3c2f43783d73a8956454' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can delete protocol ingredients', qual_hash, '85fed6f2482e3c2f43783d73a8956454', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can delete protocol ingredients" ON "public"."protocol_ingredients"
  USING ((EXISTS ( SELECT 1
   FROM protocols
  WHERE ((protocols.id = protocol_ingredients.protocol_id) AND (protocols.user_id = ( SELECT auth.uid() AS uid))))));

-- policy public.protocol_ingredients :: Users can insert protocol ingredients
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocol_ingredients"'::regclass
     AND polname = 'Users can insert protocol ingredients';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert protocol ingredients';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '85fed6f2482e3c2f43783d73a8956454' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert protocol ingredients', qual_hash, NULL, check_hash, '85fed6f2482e3c2f43783d73a8956454';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert protocol ingredients" ON "public"."protocol_ingredients"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM protocols
  WHERE ((protocols.id = protocol_ingredients.protocol_id) AND (protocols.user_id = ( SELECT auth.uid() AS uid))))));

-- policy public.protocol_ingredients :: Users can update protocol ingredients
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocol_ingredients"'::regclass
     AND polname = 'Users can update protocol ingredients';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update protocol ingredients';
  END IF;
  IF qual_hash IS DISTINCT FROM '85fed6f2482e3c2f43783d73a8956454' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update protocol ingredients', qual_hash, '85fed6f2482e3c2f43783d73a8956454', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update protocol ingredients" ON "public"."protocol_ingredients"
  USING ((EXISTS ( SELECT 1
   FROM protocols
  WHERE ((protocols.id = protocol_ingredients.protocol_id) AND (protocols.user_id = ( SELECT auth.uid() AS uid))))));

-- policy public.protocol_ingredients :: Users can view protocol ingredients
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocol_ingredients"'::regclass
     AND polname = 'Users can view protocol ingredients';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view protocol ingredients';
  END IF;
  IF qual_hash IS DISTINCT FROM '6c7588b07f0abe94ce28b9d46d5b6826' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view protocol ingredients', qual_hash, '6c7588b07f0abe94ce28b9d46d5b6826', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view protocol ingredients" ON "public"."protocol_ingredients"
  USING ((EXISTS ( SELECT 1
   FROM protocols
  WHERE ((protocols.id = protocol_ingredients.protocol_id) AND ((protocols.user_id = ( SELECT auth.uid() AS uid)) OR (protocols.patient_id = ( SELECT auth.uid() AS uid)))))));

-- policy public.protocol_share_activity :: Share parties read activity
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocol_share_activity"'::regclass
     AND polname = 'Share parties read activity';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Share parties read activity';
  END IF;
  IF qual_hash IS DISTINCT FROM '8ef23aa6402b52b4a55bc5c1128f5c78' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Share parties read activity', qual_hash, '8ef23aa6402b52b4a55bc5c1128f5c78', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Share parties read activity" ON "public"."protocol_share_activity"
  USING ((share_id IN ( SELECT protocol_shares.id
   FROM protocol_shares
  WHERE ((protocol_shares.patient_id = ( SELECT auth.uid() AS uid)) OR (protocol_shares.provider_id = ( SELECT auth.uid() AS uid))))));

-- policy public.protocol_share_activity :: Share parties write activity
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocol_share_activity"'::regclass
     AND polname = 'Share parties write activity';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Share parties write activity';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'cdde06d45b0c34f77a424d329c818f05' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Share parties write activity', qual_hash, NULL, check_hash, 'cdde06d45b0c34f77a424d329c818f05';
  END IF;
END
$guard$;
ALTER POLICY "Share parties write activity" ON "public"."protocol_share_activity"
  WITH CHECK (((actor_id = ( SELECT auth.uid() AS uid)) AND (share_id IN ( SELECT protocol_shares.id
   FROM protocol_shares
  WHERE ((protocol_shares.patient_id = ( SELECT auth.uid() AS uid)) OR (protocol_shares.provider_id = ( SELECT auth.uid() AS uid)))))));

-- policy public.protocol_shares :: Patients delete own shares
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocol_shares"'::regclass
     AND polname = 'Patients delete own shares';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Patients delete own shares';
  END IF;
  IF qual_hash IS DISTINCT FROM '15a1082ff6aa2b331d11e12485a1451f' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Patients delete own shares', qual_hash, '15a1082ff6aa2b331d11e12485a1451f', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Patients delete own shares" ON "public"."protocol_shares"
  USING ((( SELECT auth.uid() AS uid) = patient_id));

-- policy public.protocol_shares :: Patients insert own shares
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocol_shares"'::regclass
     AND polname = 'Patients insert own shares';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Patients insert own shares';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '15a1082ff6aa2b331d11e12485a1451f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Patients insert own shares', qual_hash, NULL, check_hash, '15a1082ff6aa2b331d11e12485a1451f';
  END IF;
END
$guard$;
ALTER POLICY "Patients insert own shares" ON "public"."protocol_shares"
  WITH CHECK ((( SELECT auth.uid() AS uid) = patient_id));

-- policy public.protocol_shares :: Patients update own shares
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocol_shares"'::regclass
     AND polname = 'Patients update own shares';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Patients update own shares';
  END IF;
  IF qual_hash IS DISTINCT FROM '15a1082ff6aa2b331d11e12485a1451f' OR check_hash IS DISTINCT FROM '15a1082ff6aa2b331d11e12485a1451f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Patients update own shares', qual_hash, '15a1082ff6aa2b331d11e12485a1451f', check_hash, '15a1082ff6aa2b331d11e12485a1451f';
  END IF;
END
$guard$;
ALTER POLICY "Patients update own shares" ON "public"."protocol_shares"
  USING ((( SELECT auth.uid() AS uid) = patient_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = patient_id));

-- policy public.protocol_shares :: Share parties read shares
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocol_shares"'::regclass
     AND polname = 'Share parties read shares';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Share parties read shares';
  END IF;
  IF qual_hash IS DISTINCT FROM 'e8f65edd45d052bef3a349b2a54b322a' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Share parties read shares', qual_hash, 'e8f65edd45d052bef3a349b2a54b322a', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Share parties read shares" ON "public"."protocol_shares"
  USING (((( SELECT auth.uid() AS uid) = patient_id) OR ((( SELECT auth.uid() AS uid) = provider_id) AND (status = 'active'::text))));

-- policy public.protocols :: Users can insert own protocols
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocols"'::regclass
     AND polname = 'Users can insert own protocols';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own protocols';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own protocols', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own protocols" ON "public"."protocols"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.protocols :: Users can update own protocols
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocols"'::regclass
     AND polname = 'Users can update own protocols';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own protocols';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own protocols', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own protocols" ON "public"."protocols"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.protocols :: Users can view own protocols
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."protocols"'::regclass
     AND polname = 'Users can view own protocols';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own protocols';
  END IF;
  IF qual_hash IS DISTINCT FROM 'dc16d721a952e6f3db6004ddf96d76e6' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own protocols', qual_hash, 'dc16d721a952e6f3db6004ddf96d76e6', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own protocols" ON "public"."protocols"
  USING (((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT auth.uid() AS uid) = patient_id)));

-- policy public.rebuttal_templates :: templates_admin_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."rebuttal_templates"'::regclass
     AND polname = 'templates_admin_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'templates_admin_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM '9e9a4880ec685dd546e3ce492fe2e128' OR check_hash IS DISTINCT FROM '9e9a4880ec685dd546e3ce492fe2e128' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'templates_admin_rw', qual_hash, '9e9a4880ec685dd546e3ce492fe2e128', check_hash, '9e9a4880ec685dd546e3ce492fe2e128';
  END IF;
END
$guard$;
ALTER POLICY "templates_admin_rw" ON "public"."rebuttal_templates"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['compliance_admin'::text, 'admin'::text, 'superadmin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['compliance_admin'::text, 'admin'::text, 'superadmin'::text])));

-- policy public.recommendations :: System can insert recommendations
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."recommendations"'::regclass
     AND polname = 'System can insert recommendations';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'System can insert recommendations';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'System can insert recommendations', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "System can insert recommendations" ON "public"."recommendations"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.recommendations :: Users can delete own recommendations
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."recommendations"'::regclass
     AND polname = 'Users can delete own recommendations';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can delete own recommendations';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can delete own recommendations', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can delete own recommendations" ON "public"."recommendations"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.recommendations :: Users can update own recommendations
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."recommendations"'::regclass
     AND polname = 'Users can update own recommendations';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own recommendations';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own recommendations', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own recommendations" ON "public"."recommendations"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.recommendations :: Users view own recommendations
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."recommendations"'::regclass
     AND polname = 'Users view own recommendations';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users view own recommendations';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users view own recommendations', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users view own recommendations" ON "public"."recommendations"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.regulatory_alerts :: regalert_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_alerts"'::regclass
     AND polname = 'regalert_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regalert_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'a43de47febfcb275168a2e010654e934' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regalert_read_admin', qual_hash, 'a43de47febfcb275168a2e010654e934', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "regalert_read_admin" ON "public"."regulatory_alerts"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text, 'medical'::text]))))));

-- policy public.regulatory_alerts :: regalert_write_compliance
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_alerts"'::regclass
     AND polname = 'regalert_write_compliance';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regalert_write_compliance';
  END IF;
  IF qual_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' OR check_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regalert_write_compliance', qual_hash, 'df00211e01b64cd8df203ddbf51c9c41', check_hash, 'df00211e01b64cd8df203ddbf51c9c41';
  END IF;
END
$guard$;
ALTER POLICY "regalert_write_compliance" ON "public"."regulatory_alerts"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_audit_log :: regaudit_insert_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_audit_log"'::regclass
     AND polname = 'regaudit_insert_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regaudit_insert_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regaudit_insert_admin', qual_hash, NULL, check_hash, 'df00211e01b64cd8df203ddbf51c9c41';
  END IF;
END
$guard$;
ALTER POLICY "regaudit_insert_admin" ON "public"."regulatory_audit_log"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_audit_log :: regaudit_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_audit_log"'::regclass
     AND polname = 'regaudit_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regaudit_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regaudit_read_admin', qual_hash, 'df00211e01b64cd8df203ddbf51c9c41', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "regaudit_read_admin" ON "public"."regulatory_audit_log"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_claim_library :: regclaim_read_all_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_claim_library"'::regclass
     AND polname = 'regclaim_read_all_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regclaim_read_all_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '1741ecea6a7d0ab742346902d8d1c597' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regclaim_read_all_admin', qual_hash, '1741ecea6a7d0ab742346902d8d1c597', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "regclaim_read_all_admin" ON "public"."regulatory_claim_library"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text, 'medical'::text]))))));

-- policy public.regulatory_claim_library :: regclaim_write_compliance
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_claim_library"'::regclass
     AND polname = 'regclaim_write_compliance';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regclaim_write_compliance';
  END IF;
  IF qual_hash IS DISTINCT FROM 'db700adfff5069424140fa05ca59c6ef' OR check_hash IS DISTINCT FROM 'db700adfff5069424140fa05ca59c6ef' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regclaim_write_compliance', qual_hash, 'db700adfff5069424140fa05ca59c6ef', check_hash, 'db700adfff5069424140fa05ca59c6ef';
  END IF;
END
$guard$;
ALTER POLICY "regclaim_write_compliance" ON "public"."regulatory_claim_library"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_disclaimer_events :: regdisc_insert_authenticated
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_disclaimer_events"'::regclass
     AND polname = 'regdisc_insert_authenticated';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regdisc_insert_authenticated';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'cb6be2a2e3595533c9485afce4a1433e' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regdisc_insert_authenticated', qual_hash, NULL, check_hash, 'cb6be2a2e3595533c9485afce4a1433e';
  END IF;
END
$guard$;
ALTER POLICY "regdisc_insert_authenticated" ON "public"."regulatory_disclaimer_events"
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) OR (user_id IS NULL)));

-- policy public.regulatory_disclaimer_events :: regdisc_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_disclaimer_events"'::regclass
     AND polname = 'regdisc_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regdisc_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regdisc_read_admin', qual_hash, 'df00211e01b64cd8df203ddbf51c9c41', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "regdisc_read_admin" ON "public"."regulatory_disclaimer_events"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_disease_dictionary :: regdd_write_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_disease_dictionary"'::regclass
     AND polname = 'regdd_write_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regdd_write_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' OR check_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regdd_write_admin', qual_hash, 'df00211e01b64cd8df203ddbf51c9c41', check_hash, 'df00211e01b64cd8df203ddbf51c9c41';
  END IF;
END
$guard$;
ALTER POLICY "regdd_write_admin" ON "public"."regulatory_disease_dictionary"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_ingredients :: regingr_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_ingredients"'::regclass
     AND polname = 'regingr_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regingr_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '1741ecea6a7d0ab742346902d8d1c597' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regingr_read_admin', qual_hash, '1741ecea6a7d0ab742346902d8d1c597', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "regingr_read_admin" ON "public"."regulatory_ingredients"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text, 'medical'::text]))))));

-- policy public.regulatory_ingredients :: regingr_write_compliance
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_ingredients"'::regclass
     AND polname = 'regingr_write_compliance';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regingr_write_compliance';
  END IF;
  IF qual_hash IS DISTINCT FROM 'db700adfff5069424140fa05ca59c6ef' OR check_hash IS DISTINCT FROM 'db700adfff5069424140fa05ca59c6ef' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regingr_write_compliance', qual_hash, 'db700adfff5069424140fa05ca59c6ef', check_hash, 'db700adfff5069424140fa05ca59c6ef';
  END IF;
END
$guard$;
ALTER POLICY "regingr_write_compliance" ON "public"."regulatory_ingredients"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_jurisdictions :: regj_write_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_jurisdictions"'::regclass
     AND polname = 'regj_write_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regj_write_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'db700adfff5069424140fa05ca59c6ef' OR check_hash IS DISTINCT FROM 'db700adfff5069424140fa05ca59c6ef' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regj_write_admin', qual_hash, 'db700adfff5069424140fa05ca59c6ef', check_hash, 'db700adfff5069424140fa05ca59c6ef';
  END IF;
END
$guard$;
ALTER POLICY "regj_write_admin" ON "public"."regulatory_jurisdictions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_kelsey_reviews :: regkr_insert_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_kelsey_reviews"'::regclass
     AND polname = 'regkr_insert_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regkr_insert_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regkr_insert_admin', qual_hash, NULL, check_hash, 'df00211e01b64cd8df203ddbf51c9c41';
  END IF;
END
$guard$;
ALTER POLICY "regkr_insert_admin" ON "public"."regulatory_kelsey_reviews"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_kelsey_reviews :: regkr_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_kelsey_reviews"'::regclass
     AND polname = 'regkr_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regkr_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'a43de47febfcb275168a2e010654e934' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regkr_read_admin', qual_hash, 'a43de47febfcb275168a2e010654e934', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "regkr_read_admin" ON "public"."regulatory_kelsey_reviews"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text, 'medical'::text]))))));

-- policy public.regulatory_peptide_classifications :: regpep_write_compliance
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_peptide_classifications"'::regclass
     AND polname = 'regpep_write_compliance';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regpep_write_compliance';
  END IF;
  IF qual_hash IS DISTINCT FROM 'a43de47febfcb275168a2e010654e934' OR check_hash IS DISTINCT FROM 'a43de47febfcb275168a2e010654e934' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regpep_write_compliance', qual_hash, 'a43de47febfcb275168a2e010654e934', check_hash, 'a43de47febfcb275168a2e010654e934';
  END IF;
END
$guard$;
ALTER POLICY "regpep_write_compliance" ON "public"."regulatory_peptide_classifications"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text, 'medical'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text, 'medical'::text]))))));

-- policy public.regulatory_sku_jurisdiction_status :: skujs_read_all_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_sku_jurisdiction_status"'::regclass
     AND polname = 'skujs_read_all_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'skujs_read_all_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'skujs_read_all_admin', qual_hash, 'df00211e01b64cd8df203ddbf51c9c41', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "skujs_read_all_admin" ON "public"."regulatory_sku_jurisdiction_status"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_sku_jurisdiction_status :: skujs_write_compliance
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_sku_jurisdiction_status"'::regclass
     AND polname = 'skujs_write_compliance';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'skujs_write_compliance';
  END IF;
  IF qual_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' OR check_hash IS DISTINCT FROM 'df00211e01b64cd8df203ddbf51c9c41' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'skujs_write_compliance', qual_hash, 'df00211e01b64cd8df203ddbf51c9c41', check_hash, 'df00211e01b64cd8df203ddbf51c9c41';
  END IF;
END
$guard$;
ALTER POLICY "skujs_write_compliance" ON "public"."regulatory_sku_jurisdiction_status"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.regulatory_substantiation :: regsub_read_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_substantiation"'::regclass
     AND polname = 'regsub_read_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regsub_read_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '1741ecea6a7d0ab742346902d8d1c597' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regsub_read_admin', qual_hash, '1741ecea6a7d0ab742346902d8d1c597', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "regsub_read_admin" ON "public"."regulatory_substantiation"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text, 'medical'::text]))))));

-- policy public.regulatory_substantiation :: regsub_write_compliance
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."regulatory_substantiation"'::regclass
     AND polname = 'regsub_write_compliance';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'regsub_write_compliance';
  END IF;
  IF qual_hash IS DISTINCT FROM 'db700adfff5069424140fa05ca59c6ef' OR check_hash IS DISTINCT FROM 'db700adfff5069424140fa05ca59c6ef' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'regsub_write_compliance', qual_hash, 'db700adfff5069424140fa05ca59c6ef', check_hash, 'db700adfff5069424140fa05ca59c6ef';
  END IF;
END
$guard$;
ALTER POLICY "regsub_write_compliance" ON "public"."regulatory_substantiation"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'compliance_admin'::text]))))));

-- policy public.research_hub_alerts :: Users manage own alerts
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."research_hub_alerts"'::regclass
     AND polname = 'Users manage own alerts';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own alerts';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own alerts', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own alerts" ON "public"."research_hub_alerts"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.research_hub_user_items :: Users manage own items
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."research_hub_user_items"'::regclass
     AND polname = 'Users manage own items';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own items';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own items', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own items" ON "public"."research_hub_user_items"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.research_hub_user_sources :: Users manage own sources
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."research_hub_user_sources"'::regclass
     AND polname = 'Users manage own sources';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own sources';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own sources', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own sources" ON "public"."research_hub_user_sources"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.research_hub_user_tabs :: Users manage own tabs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."research_hub_user_tabs"'::regclass
     AND polname = 'Users manage own tabs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own tabs';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own tabs', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own tabs" ON "public"."research_hub_user_tabs"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.reward_redemptions :: Users can insert own reward_redemptions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."reward_redemptions"'::regclass
     AND polname = 'Users can insert own reward_redemptions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own reward_redemptions';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own reward_redemptions', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own reward_redemptions" ON "public"."reward_redemptions"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.reward_redemptions :: Users can update own reward_redemptions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."reward_redemptions"'::regclass
     AND polname = 'Users can update own reward_redemptions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own reward_redemptions';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own reward_redemptions', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own reward_redemptions" ON "public"."reward_redemptions"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.reward_redemptions :: Users can view own reward_redemptions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."reward_redemptions"'::regclass
     AND polname = 'Users can view own reward_redemptions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own reward_redemptions';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own reward_redemptions', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own reward_redemptions" ON "public"."reward_redemptions"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.rewards :: Authenticated users can view rewards
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."rewards"'::regclass
     AND polname = 'Authenticated users can view rewards';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Authenticated users can view rewards';
  END IF;
  IF qual_hash IS DISTINCT FROM 'fe6be3363cff74e318b02a2651158dac' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Authenticated users can view rewards', qual_hash, 'fe6be3363cff74e318b02a2651158dac', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Authenticated users can view rewards" ON "public"."rewards"
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

-- policy public.rollout_cohorts :: rollout_cohorts_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."rollout_cohorts"'::regclass
     AND polname = 'rollout_cohorts_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'rollout_cohorts_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'rollout_cohorts_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "rollout_cohorts_admin_all" ON "public"."rollout_cohorts"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.safety_alerts :: Users can view safety alerts
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."safety_alerts"'::regclass
     AND polname = 'Users can view safety alerts';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view safety alerts';
  END IF;
  IF qual_hash IS DISTINCT FROM '1470acd5763a3c766d7e8e4a8026642e' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view safety alerts', qual_hash, '1470acd5763a3c766d7e8e4a8026642e', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view safety alerts" ON "public"."safety_alerts"
  USING ((EXISTS ( SELECT 1
   FROM protocols
  WHERE ((protocols.id = safety_alerts.protocol_id) AND ((protocols.user_id = ( SELECT auth.uid() AS uid)) OR (protocols.patient_id = ( SELECT auth.uid() AS uid)))))));

-- policy public.scan_calibration_nudges :: Users manage own calibration nudges
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scan_calibration_nudges"'::regclass
     AND polname = 'Users manage own calibration nudges';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own calibration nudges';
  END IF;
  IF qual_hash IS DISTINCT FROM '6cc48c8ae117c32c8307e7e8a1ce8553' OR check_hash IS DISTINCT FROM '6cc48c8ae117c32c8307e7e8a1ce8553' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own calibration nudges', qual_hash, '6cc48c8ae117c32c8307e7e8a1ce8553', check_hash, '6cc48c8ae117c32c8307e7e8a1ce8553';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own calibration nudges" ON "public"."scan_calibration_nudges"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.scenario_categories :: scenario_categories_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scenario_categories"'::regclass
     AND polname = 'scenario_categories_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scenario_categories_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scenario_categories_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "scenario_categories_admin" ON "public"."scenario_categories"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.scenario_copy_blocks :: scenario_copy_blocks_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scenario_copy_blocks"'::regclass
     AND polname = 'scenario_copy_blocks_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scenario_copy_blocks_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scenario_copy_blocks_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "scenario_copy_blocks_admin" ON "public"."scenario_copy_blocks"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.scenario_disclosures :: scenario_disclosures_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scenario_disclosures"'::regclass
     AND polname = 'scenario_disclosures_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scenario_disclosures_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scenario_disclosures_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "scenario_disclosures_admin" ON "public"."scenario_disclosures"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.scenario_events :: scenario_events_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scenario_events"'::regclass
     AND polname = 'scenario_events_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scenario_events_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scenario_events_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "scenario_events_admin" ON "public"."scenario_events"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.scenario_personas :: scenario_personas_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scenario_personas"'::regclass
     AND polname = 'scenario_personas_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scenario_personas_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' OR check_hash IS DISTINCT FROM '78c0f856926bc012fd8211452c3ec18f' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scenario_personas_admin', qual_hash, '78c0f856926bc012fd8211452c3ec18f', check_hash, '78c0f856926bc012fd8211452c3ec18f';
  END IF;
END
$guard$;
ALTER POLICY "scenario_personas_admin" ON "public"."scenario_personas"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.scheduled_flag_activations :: scheduled_activations_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduled_flag_activations"'::regclass
     AND polname = 'scheduled_activations_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scheduled_activations_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scheduled_activations_admin_all', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, '44de3f6ae529f05ae7f99ac18abc62c9';
  END IF;
END
$guard$;
ALTER POLICY "scheduled_activations_admin_all" ON "public"."scheduled_flag_activations"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.scheduler_connections :: scheduler_conns_self_rw
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_connections"'::regclass
     AND polname = 'scheduler_conns_self_rw';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scheduler_conns_self_rw';
  END IF;
  IF qual_hash IS DISTINCT FROM '2f441538e0314e9e687ca7ff01845acd' OR check_hash IS DISTINCT FROM '2f441538e0314e9e687ca7ff01845acd' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scheduler_conns_self_rw', qual_hash, '2f441538e0314e9e687ca7ff01845acd', check_hash, '2f441538e0314e9e687ca7ff01845acd';
  END IF;
END
$guard$;
ALTER POLICY "scheduler_conns_self_rw" ON "public"."scheduler_connections"
  USING (((( SELECT auth.uid() AS uid) = practitioner_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text])))))))
  WITH CHECK (((( SELECT auth.uid() AS uid) = practitioner_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text])))))));

-- policy public.scheduler_events :: scheduler_events_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_events"'::regclass
     AND polname = 'scheduler_events_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scheduler_events_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c60ce75a02b37510299d0a5b59bc96e7' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scheduler_events_admin', qual_hash, 'c60ce75a02b37510299d0a5b59bc96e7', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "scheduler_events_admin" ON "public"."scheduler_events"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))));

-- policy public.scheduler_interceptions :: scheduler_interceptions_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_interceptions"'::regclass
     AND polname = 'scheduler_interceptions_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scheduler_interceptions_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c60ce75a02b37510299d0a5b59bc96e7' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scheduler_interceptions_admin', qual_hash, 'c60ce75a02b37510299d0a5b59bc96e7', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "scheduler_interceptions_admin" ON "public"."scheduler_interceptions"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))));

-- policy public.scheduler_overrides :: scheduler_overrides_self_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_overrides"'::regclass
     AND polname = 'scheduler_overrides_self_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scheduler_overrides_self_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'e94ce85dbcf3940ae464e6ef455af5de' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scheduler_overrides_self_insert', qual_hash, NULL, check_hash, 'e94ce85dbcf3940ae464e6ef455af5de';
  END IF;
END
$guard$;
ALTER POLICY "scheduler_overrides_self_insert" ON "public"."scheduler_overrides"
  WITH CHECK ((( SELECT auth.uid() AS uid) = practitioner_id));

-- policy public.scheduler_overrides :: scheduler_overrides_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_overrides"'::regclass
     AND polname = 'scheduler_overrides_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scheduler_overrides_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '2f441538e0314e9e687ca7ff01845acd' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scheduler_overrides_self_read', qual_hash, '2f441538e0314e9e687ca7ff01845acd', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "scheduler_overrides_self_read" ON "public"."scheduler_overrides"
  USING (((( SELECT auth.uid() AS uid) = practitioner_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text])))))));

-- policy public.scheduler_platform_state_changes :: spc_admin_approve
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_platform_state_changes"'::regclass
     AND polname = 'spc_admin_approve';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'spc_admin_approve';
  END IF;
  IF qual_hash IS DISTINCT FROM '37db383e925c1c337c7b6031fc3c5bb7' OR check_hash IS DISTINCT FROM '37db383e925c1c337c7b6031fc3c5bb7' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'spc_admin_approve', qual_hash, '37db383e925c1c337c7b6031fc3c5bb7', check_hash, '37db383e925c1c337c7b6031fc3c5bb7';
  END IF;
END
$guard$;
ALTER POLICY "spc_admin_approve" ON "public"."scheduler_platform_state_changes"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))));

-- policy public.scheduler_platform_state_changes :: spc_admin_propose
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_platform_state_changes"'::regclass
     AND polname = 'spc_admin_propose';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'spc_admin_propose';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '5838a4cb8965ed291b356861b15a07af' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'spc_admin_propose', qual_hash, NULL, check_hash, '5838a4cb8965ed291b356861b15a07af';
  END IF;
END
$guard$;
ALTER POLICY "spc_admin_propose" ON "public"."scheduler_platform_state_changes"
  WITH CHECK (((proposed_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text])))))));

-- policy public.scheduler_platform_state_changes :: spc_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_platform_state_changes"'::regclass
     AND polname = 'spc_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'spc_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '37db383e925c1c337c7b6031fc3c5bb7' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'spc_admin_read', qual_hash, '37db383e925c1c337c7b6031fc3c5bb7', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "spc_admin_read" ON "public"."scheduler_platform_state_changes"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))));

-- policy public.scheduler_platform_states :: sps_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_platform_states"'::regclass
     AND polname = 'sps_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'sps_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '37db383e925c1c337c7b6031fc3c5bb7' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'sps_admin_read', qual_hash, '37db383e925c1c337c7b6031fc3c5bb7', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "sps_admin_read" ON "public"."scheduler_platform_states"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))));

-- policy public.scheduler_poll_state :: scheduler_poll_state_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_poll_state"'::regclass
     AND polname = 'scheduler_poll_state_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scheduler_poll_state_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c60ce75a02b37510299d0a5b59bc96e7' OR check_hash IS DISTINCT FROM 'c60ce75a02b37510299d0a5b59bc96e7' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scheduler_poll_state_admin', qual_hash, 'c60ce75a02b37510299d0a5b59bc96e7', check_hash, 'c60ce75a02b37510299d0a5b59bc96e7';
  END IF;
END
$guard$;
ALTER POLICY "scheduler_poll_state_admin" ON "public"."scheduler_poll_state"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))));

-- policy public.scheduler_scans :: scheduler_scans_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scheduler_scans"'::regclass
     AND polname = 'scheduler_scans_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'scheduler_scans_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '2f441538e0314e9e687ca7ff01845acd' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'scheduler_scans_self_read', qual_hash, '2f441538e0314e9e687ca7ff01845acd', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "scheduler_scans_self_read" ON "public"."scheduler_scans"
  USING (((( SELECT auth.uid() AS uid) = practitioner_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text])))))));

-- policy public.scoring_audit_log :: audit_log_user_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."scoring_audit_log"'::regclass
     AND polname = 'audit_log_user_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'audit_log_user_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'audit_log_user_read', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "audit_log_user_read" ON "public"."scoring_audit_log"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.sherlock_activity_log :: sherlock_activity_log_user_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."sherlock_activity_log"'::regclass
     AND polname = 'sherlock_activity_log_user_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'sherlock_activity_log_user_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'd0359741db29103d0a69c7a603066cfe' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'sherlock_activity_log_user_read', qual_hash, 'd0359741db29103d0a69c7a603066cfe', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "sherlock_activity_log_user_read" ON "public"."sherlock_activity_log"
  USING (((user_id IS NULL) OR (( SELECT auth.uid() AS uid) = user_id)));

-- policy public.sherlock_escalations :: sherlock_escalations_user_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."sherlock_escalations"'::regclass
     AND polname = 'sherlock_escalations_user_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'sherlock_escalations_user_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'sherlock_escalations_user_read', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "sherlock_escalations_user_read" ON "public"."sherlock_escalations"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.sherlock_insights_cache :: sherlock_insights_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."sherlock_insights_cache"'::regclass
     AND polname = 'sherlock_insights_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'sherlock_insights_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b6806f9afc118c7c21ab9d7150632f21' OR check_hash IS DISTINCT FROM 'b6806f9afc118c7c21ab9d7150632f21' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'sherlock_insights_admin_all', qual_hash, 'b6806f9afc118c7c21ab9d7150632f21', check_hash, 'b6806f9afc118c7c21ab9d7150632f21';
  END IF;
END
$guard$;
ALTER POLICY "sherlock_insights_admin_all" ON "public"."sherlock_insights_cache"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.sherlock_insights_cache :: sherlock_insights_self_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."sherlock_insights_cache"'::regclass
     AND polname = 'sherlock_insights_self_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'sherlock_insights_self_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '75168d83e494dc70d4d7db96c2327b56' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'sherlock_insights_self_read', qual_hash, '75168d83e494dc70d4d7db96c2327b56', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "sherlock_insights_self_read" ON "public"."sherlock_insights_cache"
  USING ((practitioner_id IN ( SELECT practitioners.id
   FROM practitioners
  WHERE (practitioners.user_id = ( SELECT auth.uid() AS uid)))));

-- policy public.sherlock_task_queue :: sherlock_task_queue_user_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."sherlock_task_queue"'::regclass
     AND polname = 'sherlock_task_queue_user_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'sherlock_task_queue_user_read';
  END IF;
  IF qual_hash IS DISTINCT FROM 'd0359741db29103d0a69c7a603066cfe' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'sherlock_task_queue_user_read', qual_hash, 'd0359741db29103d0a69c7a603066cfe', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "sherlock_task_queue_user_read" ON "public"."sherlock_task_queue"
  USING (((user_id IS NULL) OR (( SELECT auth.uid() AS uid) = user_id)));

-- policy public.shop_cart_items :: Users manage own cart
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."shop_cart_items"'::regclass
     AND polname = 'Users manage own cart';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own cart';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own cart', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own cart" ON "public"."shop_cart_items"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.shop_order_items :: Users create own order items
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."shop_order_items"'::regclass
     AND polname = 'Users create own order items';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users create own order items';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '14b18c301ac5b96cf8d6e91b3e74ae4d' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users create own order items', qual_hash, NULL, check_hash, '14b18c301ac5b96cf8d6e91b3e74ae4d';
  END IF;
END
$guard$;
ALTER POLICY "Users create own order items" ON "public"."shop_order_items"
  WITH CHECK ((order_id IN ( SELECT shop_orders.id
   FROM shop_orders
  WHERE (shop_orders.user_id = ( SELECT auth.uid() AS uid)))));

-- policy public.shop_order_items :: Users view own order items
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."shop_order_items"'::regclass
     AND polname = 'Users view own order items';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users view own order items';
  END IF;
  IF qual_hash IS DISTINCT FROM '14b18c301ac5b96cf8d6e91b3e74ae4d' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users view own order items', qual_hash, '14b18c301ac5b96cf8d6e91b3e74ae4d', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users view own order items" ON "public"."shop_order_items"
  USING ((order_id IN ( SELECT shop_orders.id
   FROM shop_orders
  WHERE (shop_orders.user_id = ( SELECT auth.uid() AS uid)))));

-- policy public.shop_order_status_history :: Users insert own order history
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."shop_order_status_history"'::regclass
     AND polname = 'Users insert own order history';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users insert own order history';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '14b18c301ac5b96cf8d6e91b3e74ae4d' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users insert own order history', qual_hash, NULL, check_hash, '14b18c301ac5b96cf8d6e91b3e74ae4d';
  END IF;
END
$guard$;
ALTER POLICY "Users insert own order history" ON "public"."shop_order_status_history"
  WITH CHECK ((order_id IN ( SELECT shop_orders.id
   FROM shop_orders
  WHERE (shop_orders.user_id = ( SELECT auth.uid() AS uid)))));

-- policy public.shop_order_status_history :: Users view own order history
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."shop_order_status_history"'::regclass
     AND polname = 'Users view own order history';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users view own order history';
  END IF;
  IF qual_hash IS DISTINCT FROM '14b18c301ac5b96cf8d6e91b3e74ae4d' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users view own order history', qual_hash, '14b18c301ac5b96cf8d6e91b3e74ae4d', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users view own order history" ON "public"."shop_order_status_history"
  USING ((order_id IN ( SELECT shop_orders.id
   FROM shop_orders
  WHERE (shop_orders.user_id = ( SELECT auth.uid() AS uid)))));

-- policy public.shop_orders :: Users create own orders
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."shop_orders"'::regclass
     AND polname = 'Users create own orders';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users create own orders';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users create own orders', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users create own orders" ON "public"."shop_orders"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.shop_orders :: Users view own orders
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."shop_orders"'::regclass
     AND polname = 'Users view own orders';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users view own orders';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users view own orders', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users view own orders" ON "public"."shop_orders"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.shop_refresh_audit_log :: srl_admin_select
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."shop_refresh_audit_log"'::regclass
     AND polname = 'srl_admin_select';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'srl_admin_select';
  END IF;
  IF qual_hash IS DISTINCT FROM '11e7808797b5eb3926eec235000ef9d1' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'srl_admin_select', qual_hash, '11e7808797b5eb3926eec235000ef9d1', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "srl_admin_select" ON "public"."shop_refresh_audit_log"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.shop_refresh_reconciliation_findings :: srrf_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."shop_refresh_reconciliation_findings"'::regclass
     AND polname = 'srrf_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'srrf_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '11e7808797b5eb3926eec235000ef9d1' OR check_hash IS DISTINCT FROM '11e7808797b5eb3926eec235000ef9d1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'srrf_admin_all', qual_hash, '11e7808797b5eb3926eec235000ef9d1', check_hash, '11e7808797b5eb3926eec235000ef9d1';
  END IF;
END
$guard$;
ALTER POLICY "srrf_admin_all" ON "public"."shop_refresh_reconciliation_findings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.sku_rationalization :: Authenticated read sku_rationalization
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."sku_rationalization"'::regclass
     AND polname = 'Authenticated read sku_rationalization';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Authenticated read sku_rationalization';
  END IF;
  IF qual_hash IS DISTINCT FROM 'fe6be3363cff74e318b02a2651158dac' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Authenticated read sku_rationalization', qual_hash, 'fe6be3363cff74e318b02a2651158dac', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Authenticated read sku_rationalization" ON "public"."sku_rationalization"
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

-- policy public.soc2_auditor_access_log :: soc2_auditor_access_log_select_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."soc2_auditor_access_log"'::regclass
     AND polname = 'soc2_auditor_access_log_select_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'soc2_auditor_access_log_select_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c9bffa7cef90d574f644abd39a0a7d2c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'soc2_auditor_access_log_select_merged', qual_hash, 'c9bffa7cef90d574f644abd39a0a7d2c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "soc2_auditor_access_log_select_merged" ON "public"."soc2_auditor_access_log"
  USING (((EXISTS ( SELECT 1
   FROM soc2_auditor_grants g
  WHERE ((g.id = soc2_auditor_access_log.grant_id) AND (g.auditor_email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))))) OR is_compliance_reader()));

-- policy public.soc2_auditor_grants :: soc2_auditor_grants_compliance_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."soc2_auditor_grants"'::regclass
     AND polname = 'soc2_auditor_grants_compliance_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'soc2_auditor_grants_compliance_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '3bcd57c90326e4490ee1a35d9191dad8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'soc2_auditor_grants_compliance_insert', qual_hash, NULL, check_hash, '3bcd57c90326e4490ee1a35d9191dad8';
  END IF;
END
$guard$;
ALTER POLICY "soc2_auditor_grants_compliance_insert" ON "public"."soc2_auditor_grants"
  WITH CHECK ((is_compliance_reader() AND (granted_by = ( SELECT auth.uid() AS uid))));

-- policy public.soc2_auditor_grants :: soc2_auditor_grants_select_merged
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."soc2_auditor_grants"'::regclass
     AND polname = 'soc2_auditor_grants_select_merged';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'soc2_auditor_grants_select_merged';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b67d1d295a83e72fbb5628e900f5ed6d' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'soc2_auditor_grants_select_merged', qual_hash, 'b67d1d295a83e72fbb5628e900f5ed6d', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "soc2_auditor_grants_select_merged" ON "public"."soc2_auditor_grants"
  USING ((((auditor_email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text)) AND (revoked = false)) OR is_compliance_reader()));

-- policy public.soc2_collector_config :: soc2_collector_config_admin_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."soc2_collector_config"'::regclass
     AND polname = 'soc2_collector_config_admin_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'soc2_collector_config_admin_write';
  END IF;
  IF qual_hash IS DISTINCT FROM '5e9da840df62bf49f5fac7c19bf23612' OR check_hash IS DISTINCT FROM '5e9da840df62bf49f5fac7c19bf23612' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'soc2_collector_config_admin_write', qual_hash, '5e9da840df62bf49f5fac7c19bf23612', check_hash, '5e9da840df62bf49f5fac7c19bf23612';
  END IF;
END
$guard$;
ALTER POLICY "soc2_collector_config_admin_write" ON "public"."soc2_collector_config"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));

-- policy public.soc2_distribution_targets :: sdt_admin_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."soc2_distribution_targets"'::regclass
     AND polname = 'sdt_admin_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'sdt_admin_write';
  END IF;
  IF qual_hash IS DISTINCT FROM 'c5297c8bac80a35c5b4338cc77d42c53' OR check_hash IS DISTINCT FROM 'c5297c8bac80a35c5b4338cc77d42c53' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'sdt_admin_write', qual_hash, 'c5297c8bac80a35c5b4338cc77d42c53', check_hash, 'c5297c8bac80a35c5b4338cc77d42c53';
  END IF;
END
$guard$;
ALTER POLICY "sdt_admin_write" ON "public"."soc2_distribution_targets"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));

-- policy public.soc2_manual_evidence :: soc2_manual_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."soc2_manual_evidence"'::regclass
     AND polname = 'soc2_manual_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'soc2_manual_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '370663f101efb27f39ecc6a33e7c5404' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'soc2_manual_insert', qual_hash, NULL, check_hash, '370663f101efb27f39ecc6a33e7c5404';
  END IF;
END
$guard$;
ALTER POLICY "soc2_manual_insert" ON "public"."soc2_manual_evidence"
  WITH CHECK ((is_compliance_reader() AND (uploaded_by = ( SELECT auth.uid() AS uid))));

-- policy public.subscription_sku_economics :: Authenticated read subscription_sku_economics
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."subscription_sku_economics"'::regclass
     AND polname = 'Authenticated read subscription_sku_economics';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Authenticated read subscription_sku_economics';
  END IF;
  IF qual_hash IS DISTINCT FROM 'fe6be3363cff74e318b02a2651158dac' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Authenticated read subscription_sku_economics', qual_hash, 'fe6be3363cff74e318b02a2651158dac', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Authenticated read subscription_sku_economics" ON "public"."subscription_sku_economics"
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

-- policy public.supplement_adherence :: Users manage own supplement adherence
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."supplement_adherence"'::regclass
     AND polname = 'Users manage own supplement adherence';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own supplement adherence';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own supplement adherence', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own supplement adherence" ON "public"."supplement_adherence"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.supplement_photo_bindings :: spb_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."supplement_photo_bindings"'::regclass
     AND polname = 'spb_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'spb_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '11e7808797b5eb3926eec235000ef9d1' OR check_hash IS DISTINCT FROM '11e7808797b5eb3926eec235000ef9d1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'spb_admin_all', qual_hash, '11e7808797b5eb3926eec235000ef9d1', check_hash, '11e7808797b5eb3926eec235000ef9d1';
  END IF;
END
$guard$;
ALTER POLICY "spb_admin_all" ON "public"."supplement_photo_bindings"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.supplement_photo_inventory :: spi_admin_all
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."supplement_photo_inventory"'::regclass
     AND polname = 'spi_admin_all';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'spi_admin_all';
  END IF;
  IF qual_hash IS DISTINCT FROM '11e7808797b5eb3926eec235000ef9d1' OR check_hash IS DISTINCT FROM '11e7808797b5eb3926eec235000ef9d1' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'spi_admin_all', qual_hash, '11e7808797b5eb3926eec235000ef9d1', check_hash, '11e7808797b5eb3926eec235000ef9d1';
  END IF;
END
$guard$;
ALTER POLICY "spi_admin_all" ON "public"."supplement_photo_inventory"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.supplier_scorecard :: Authenticated read supplier_scorecard
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."supplier_scorecard"'::regclass
     AND polname = 'Authenticated read supplier_scorecard';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Authenticated read supplier_scorecard';
  END IF;
  IF qual_hash IS DISTINCT FROM 'fe6be3363cff74e318b02a2651158dac' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Authenticated read supplier_scorecard', qual_hash, 'fe6be3363cff74e318b02a2651158dac', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Authenticated read supplier_scorecard" ON "public"."supplier_scorecard"
  USING ((( SELECT auth.role() AS role) = 'authenticated'::text));

-- policy public.takedown_templates :: templates_write
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."takedown_templates"'::regclass
     AND polname = 'templates_write';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'templates_write';
  END IF;
  IF qual_hash IS DISTINCT FROM '8d8508b74d20352b2ef5b1a2fb19c145' OR check_hash IS DISTINCT FROM '8d8508b74d20352b2ef5b1a2fb19c145' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'templates_write', qual_hash, '8d8508b74d20352b2ef5b1a2fb19c145', check_hash, '8d8508b74d20352b2ef5b1a2fb19c145';
  END IF;
END
$guard$;
ALTER POLICY "templates_write" ON "public"."takedown_templates"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'superadmin'::text, 'compliance_admin'::text]))))));

-- policy public.token_transactions :: Users can insert own token_transactions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."token_transactions"'::regclass
     AND polname = 'Users can insert own token_transactions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own token_transactions';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own token_transactions', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own token_transactions" ON "public"."token_transactions"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.token_transactions :: Users can update own token_transactions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."token_transactions"'::regclass
     AND polname = 'Users can update own token_transactions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own token_transactions';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own token_transactions', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own token_transactions" ON "public"."token_transactions"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.token_transactions :: Users can view own token_transactions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."token_transactions"'::regclass
     AND polname = 'Users can view own token_transactions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own token_transactions';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own token_transactions', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own token_transactions" ON "public"."token_transactions"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.trust_band_chips :: trust_chips_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."trust_band_chips"'::regclass
     AND polname = 'trust_chips_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'trust_chips_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' OR check_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'trust_chips_admin', qual_hash, '274f06af1a732781491ab4f2f9bce46e', check_hash, '274f06af1a732781491ab4f2f9bce46e';
  END IF;
END
$guard$;
ALTER POLICY "trust_chips_admin" ON "public"."trust_band_chips"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.trust_band_clinician_cards :: trust_clinician_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."trust_band_clinician_cards"'::regclass
     AND polname = 'trust_clinician_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'trust_clinician_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' OR check_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'trust_clinician_admin', qual_hash, '274f06af1a732781491ab4f2f9bce46e', check_hash, '274f06af1a732781491ab4f2f9bce46e';
  END IF;
END
$guard$;
ALTER POLICY "trust_clinician_admin" ON "public"."trust_band_clinician_cards"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.trust_band_events :: trust_events_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."trust_band_events"'::regclass
     AND polname = 'trust_events_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'trust_events_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' OR check_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'trust_events_admin', qual_hash, '274f06af1a732781491ab4f2f9bce46e', check_hash, '274f06af1a732781491ab4f2f9bce46e';
  END IF;
END
$guard$;
ALTER POLICY "trust_events_admin" ON "public"."trust_band_events"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.trust_band_regulatory_paragraphs :: trust_regulatory_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."trust_band_regulatory_paragraphs"'::regclass
     AND polname = 'trust_regulatory_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'trust_regulatory_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' OR check_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'trust_regulatory_admin', qual_hash, '274f06af1a732781491ab4f2f9bce46e', check_hash, '274f06af1a732781491ab4f2f9bce46e';
  END IF;
END
$guard$;
ALTER POLICY "trust_regulatory_admin" ON "public"."trust_band_regulatory_paragraphs"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.trust_band_scale_measurements :: trust_scale_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."trust_band_scale_measurements"'::regclass
     AND polname = 'trust_scale_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'trust_scale_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' OR check_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'trust_scale_admin', qual_hash, '274f06af1a732781491ab4f2f9bce46e', check_hash, '274f06af1a732781491ab4f2f9bce46e';
  END IF;
END
$guard$;
ALTER POLICY "trust_scale_admin" ON "public"."trust_band_scale_measurements"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.trust_band_testimonials :: trust_testimonials_admin
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."trust_band_testimonials"'::regclass
     AND polname = 'trust_testimonials_admin';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'trust_testimonials_admin';
  END IF;
  IF qual_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' OR check_hash IS DISTINCT FROM '274f06af1a732781491ab4f2f9bce46e' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'trust_testimonials_admin', qual_hash, '274f06af1a732781491ab4f2f9bce46e', check_hash, '274f06af1a732781491ab4f2f9bce46e';
  END IF;
END
$guard$;
ALTER POLICY "trust_testimonials_admin" ON "public"."trust_band_testimonials"
  USING (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])))
  WITH CHECK (((( SELECT auth.jwt() AS jwt) ->> 'role'::text) = ANY (ARRAY['marketing_admin'::text, 'admin'::text, 'superadmin'::text, 'compliance_admin'::text])));

-- policy public.ultrathink_advisor_conversations :: advisor_conv_insert_own
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ultrathink_advisor_conversations"'::regclass
     AND polname = 'advisor_conv_insert_own';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'advisor_conv_insert_own';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '6a100224b78cd608b95b9ecabf459a63' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'advisor_conv_insert_own', qual_hash, NULL, check_hash, '6a100224b78cd608b95b9ecabf459a63';
  END IF;
END
$guard$;
ALTER POLICY "advisor_conv_insert_own" ON "public"."ultrathink_advisor_conversations"
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (advisor_role = ANY (ARRAY['consumer'::text, 'practitioner'::text, 'naturopath'::text]))));

-- policy public.ultrathink_advisor_conversations :: advisor_conv_select
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ultrathink_advisor_conversations"'::regclass
     AND polname = 'advisor_conv_select';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'advisor_conv_select';
  END IF;
  IF qual_hash IS DISTINCT FROM '3968ccc2e8017d7b7fc5951334a2ae6f' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'advisor_conv_select', qual_hash, '3968ccc2e8017d7b7fc5951334a2ae6f', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "advisor_conv_select" ON "public"."ultrathink_advisor_conversations"
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((patient_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM protocol_shares ps
  WHERE ((ps.patient_id = ultrathink_advisor_conversations.patient_id) AND (ps.provider_id = ( SELECT auth.uid() AS uid)) AND (ps.status = 'accepted'::text)))))));

-- policy public.ultrathink_advisor_query_log :: advisor_query_log_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ultrathink_advisor_query_log"'::regclass
     AND polname = 'advisor_query_log_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'advisor_query_log_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '1def5555d74495b1dc7b1df4c359701c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'advisor_query_log_read', qual_hash, '1def5555d74495b1dc7b1df4c359701c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "advisor_query_log_read" ON "public"."ultrathink_advisor_query_log"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.ultrathink_advisor_ratings :: advisor_ratings_insert
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ultrathink_advisor_ratings"'::regclass
     AND polname = 'advisor_ratings_insert';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'advisor_ratings_insert';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '9fc31a4e6bedc4b422e6a49f81fbf8ac' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'advisor_ratings_insert', qual_hash, NULL, check_hash, '9fc31a4e6bedc4b422e6a49f81fbf8ac';
  END IF;
END
$guard$;
ALTER POLICY "advisor_ratings_insert" ON "public"."ultrathink_advisor_ratings"
  WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND ((rating >= 1) AND (rating <= 5)) AND (EXISTS ( SELECT 1
   FROM ultrathink_advisor_conversations c
  WHERE ((c.id = ultrathink_advisor_ratings.conversation_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))));

-- policy public.ultrathink_advisor_ratings :: advisor_ratings_select
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ultrathink_advisor_ratings"'::regclass
     AND polname = 'advisor_ratings_select';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'advisor_ratings_select';
  END IF;
  IF qual_hash IS DISTINCT FROM '1def5555d74495b1dc7b1df4c359701c' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'advisor_ratings_select', qual_hash, '1def5555d74495b1dc7b1df4c359701c', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "advisor_ratings_select" ON "public"."ultrathink_advisor_ratings"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.ultrathink_protocols :: user_own_protocols
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ultrathink_protocols"'::regclass
     AND polname = 'user_own_protocols';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'user_own_protocols';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'user_own_protocols', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "user_own_protocols" ON "public"."ultrathink_protocols"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.ultrathink_recommendations :: user_own_recs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."ultrathink_recommendations"'::regclass
     AND polname = 'user_own_recs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'user_own_recs';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'user_own_recs', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "user_own_recs" ON "public"."ultrathink_recommendations"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_addresses :: Users manage own addresses
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_addresses"'::regclass
     AND polname = 'Users manage own addresses';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own addresses';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own addresses', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own addresses" ON "public"."user_addresses"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_current_supplements :: Users manage own current supplements
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_current_supplements"'::regclass
     AND polname = 'Users manage own current supplements';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own current supplements';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own current supplements', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own current supplements" ON "public"."user_current_supplements"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_feature_opt_ins :: user_opt_ins_admin_read
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_feature_opt_ins"'::regclass
     AND polname = 'user_opt_ins_admin_read';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'user_opt_ins_admin_read';
  END IF;
  IF qual_hash IS DISTINCT FROM '44de3f6ae529f05ae7f99ac18abc62c9' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'user_opt_ins_admin_read', qual_hash, '44de3f6ae529f05ae7f99ac18abc62c9', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "user_opt_ins_admin_read" ON "public"."user_feature_opt_ins"
  USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'admin'::text)))));

-- policy public.user_feature_opt_ins :: user_opt_ins_self_manage
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_feature_opt_ins"'::regclass
     AND polname = 'user_opt_ins_self_manage';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'user_opt_ins_self_manage';
  END IF;
  IF qual_hash IS DISTINCT FROM '2b32bec13250b91c96f5712dba3b7f47' OR check_hash IS DISTINCT FROM '2b32bec13250b91c96f5712dba3b7f47' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'user_opt_ins_self_manage', qual_hash, '2b32bec13250b91c96f5712dba3b7f47', check_hash, '2b32bec13250b91c96f5712dba3b7f47';
  END IF;
END
$guard$;
ALTER POLICY "user_opt_ins_self_manage" ON "public"."user_feature_opt_ins"
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

-- policy public.user_interaction_cache :: own_interaction_cache
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_interaction_cache"'::regclass
     AND polname = 'own_interaction_cache';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'own_interaction_cache';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'own_interaction_cache', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "own_interaction_cache" ON "public"."user_interaction_cache"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_interactions :: own_user_interactions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_interactions"'::regclass
     AND polname = 'own_user_interactions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'own_user_interactions';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'own_user_interactions', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "own_user_interactions" ON "public"."user_interactions"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_notification_preferences :: Users manage own notification prefs
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_notification_preferences"'::regclass
     AND polname = 'Users manage own notification prefs';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users manage own notification prefs';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users manage own notification prefs', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users manage own notification prefs" ON "public"."user_notification_preferences"
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_notifications :: Users view own notifications
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_notifications"'::regclass
     AND polname = 'Users view own notifications';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users view own notifications';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users view own notifications', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users view own notifications" ON "public"."user_notifications"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_peptide_prescriptions :: Users read own prescriptions
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_peptide_prescriptions"'::regclass
     AND polname = 'Users read own prescriptions';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users read own prescriptions';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users read own prescriptions', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users read own prescriptions" ON "public"."user_peptide_prescriptions"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_protocols :: Users can view own protocols
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_protocols"'::regclass
     AND polname = 'Users can view own protocols';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own protocols';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own protocols', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own protocols" ON "public"."user_protocols"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_streaks :: Users can insert own user_streaks
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_streaks"'::regclass
     AND polname = 'Users can insert own user_streaks';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own user_streaks';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own user_streaks', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own user_streaks" ON "public"."user_streaks"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_streaks :: Users can update own user_streaks
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_streaks"'::regclass
     AND polname = 'Users can update own user_streaks';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own user_streaks';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own user_streaks', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own user_streaks" ON "public"."user_streaks"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_streaks :: Users can view own user_streaks
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_streaks"'::regclass
     AND polname = 'Users can view own user_streaks';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own user_streaks';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own user_streaks', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own user_streaks" ON "public"."user_streaks"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_supplements :: Users can manage own supplements
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_supplements"'::regclass
     AND polname = 'Users can manage own supplements';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can manage own supplements';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can manage own supplements', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can manage own supplements" ON "public"."user_supplements"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_tiers :: Users can insert own user_tiers
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_tiers"'::regclass
     AND polname = 'Users can insert own user_tiers';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own user_tiers';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own user_tiers', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own user_tiers" ON "public"."user_tiers"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_tiers :: Users can update own user_tiers
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_tiers"'::regclass
     AND polname = 'Users can update own user_tiers';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own user_tiers';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own user_tiers', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own user_tiers" ON "public"."user_tiers"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.user_tiers :: Users can view own user_tiers
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."user_tiers"'::regclass
     AND polname = 'Users can view own user_tiers';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own user_tiers';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own user_tiers', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own user_tiers" ON "public"."user_tiers"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.verification_codes :: Users can delete own codes
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."verification_codes"'::regclass
     AND polname = 'Users can delete own codes';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can delete own codes';
  END IF;
  IF qual_hash IS DISTINCT FROM '05b674cccf89728ae23f784d6502e810' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can delete own codes', qual_hash, '05b674cccf89728ae23f784d6502e810', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can delete own codes" ON "public"."verification_codes"
  USING ((((( SELECT auth.jwt() AS jwt) ->> 'email'::text) IS NOT NULL) AND (email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))));

-- policy public.verification_codes :: Users can insert own codes
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."verification_codes"'::regclass
     AND polname = 'Users can insert own codes';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own codes';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM '05b674cccf89728ae23f784d6502e810' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own codes', qual_hash, NULL, check_hash, '05b674cccf89728ae23f784d6502e810';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own codes" ON "public"."verification_codes"
  WITH CHECK ((((( SELECT auth.jwt() AS jwt) ->> 'email'::text) IS NOT NULL) AND (email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))));

-- policy public.verification_codes :: Users can read own codes
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."verification_codes"'::regclass
     AND polname = 'Users can read own codes';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can read own codes';
  END IF;
  IF qual_hash IS DISTINCT FROM '05b674cccf89728ae23f784d6502e810' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can read own codes', qual_hash, '05b674cccf89728ae23f784d6502e810', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can read own codes" ON "public"."verification_codes"
  USING ((((( SELECT auth.jwt() AS jwt) ->> 'email'::text) IS NOT NULL) AND (email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))));

-- policy public.verification_codes :: Users can update own codes
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."verification_codes"'::regclass
     AND polname = 'Users can update own codes';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own codes';
  END IF;
  IF qual_hash IS DISTINCT FROM '05b674cccf89728ae23f784d6502e810' OR check_hash IS DISTINCT FROM '05b674cccf89728ae23f784d6502e810' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own codes', qual_hash, '05b674cccf89728ae23f784d6502e810', check_hash, '05b674cccf89728ae23f784d6502e810';
  END IF;
END
$guard$;
ALTER POLICY "Users can update own codes" ON "public"."verification_codes"
  USING ((((( SELECT auth.jwt() AS jwt) ->> 'email'::text) IS NOT NULL) AND (email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))))
  WITH CHECK ((((( SELECT auth.jwt() AS jwt) ->> 'email'::text) IS NOT NULL) AND (email = (( SELECT auth.jwt() AS jwt) ->> 'email'::text))));

-- policy public.wearable_integrations :: Users can insert own wearable_integrations
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."wearable_integrations"'::regclass
     AND polname = 'Users can insert own wearable_integrations';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can insert own wearable_integrations';
  END IF;
  IF qual_hash IS DISTINCT FROM NULL OR check_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can insert own wearable_integrations', qual_hash, NULL, check_hash, 'b0376a90c9437693aca4cce683c677b8';
  END IF;
END
$guard$;
ALTER POLICY "Users can insert own wearable_integrations" ON "public"."wearable_integrations"
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.wearable_integrations :: Users can update own wearable_integrations
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."wearable_integrations"'::regclass
     AND polname = 'Users can update own wearable_integrations';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can update own wearable_integrations';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can update own wearable_integrations', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can update own wearable_integrations" ON "public"."wearable_integrations"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.wearable_integrations :: Users can view own wearable_integrations
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."wearable_integrations"'::regclass
     AND polname = 'Users can view own wearable_integrations';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users can view own wearable_integrations';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users can view own wearable_integrations', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users can view own wearable_integrations" ON "public"."wearable_integrations"
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- policy public.wellness_analytics :: Users view own analytics
DO $guard$
DECLARE
  qual_hash text;
  check_hash text;
BEGIN
  SELECT md5(pg_get_expr(polqual, polrelid)), md5(pg_get_expr(polwithcheck, polrelid))
    INTO qual_hash, check_hash
    FROM pg_policy
   WHERE polrelid = '"public"."wellness_analytics"'::regclass
     AND polname = 'Users view own analytics';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'missing policy %', 'Users view own analytics';
  END IF;
  IF qual_hash IS DISTINCT FROM 'b0376a90c9437693aca4cce683c677b8' OR check_hash IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'policy drift % qual % expected % check % expected %', 'Users view own analytics', qual_hash, 'b0376a90c9437693aca4cce683c677b8', check_hash, NULL;
  END IF;
END
$guard$;
ALTER POLICY "Users view own analytics" ON "public"."wellness_analytics"
  USING ((( SELECT auth.uid() AS uid) = user_id));

COMMIT;
