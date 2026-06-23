-- Prompt 208a/208b advisor remediation: auth_rls_initplan.
-- The owner-scoped policies created across 208a + 208b used bare auth.uid(), which
-- Postgres re-evaluates once PER ROW. Wrapping it in (select auth.uid()) hoists it to a
-- single evaluation per query (the project's established fix_rls_initplan pattern).
-- IDENTICAL security semantics; performance-only. Idempotent (DROP IF EXISTS + CREATE).

-- ---- genotype_uploads ----
DROP POLICY IF EXISTS genotype_uploads_select_own ON public.genotype_uploads;
CREATE POLICY genotype_uploads_select_own ON public.genotype_uploads FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS genotype_uploads_insert_own ON public.genotype_uploads;
CREATE POLICY genotype_uploads_insert_own ON public.genotype_uploads FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- variant_calls ----
DROP POLICY IF EXISTS variant_calls_select_own ON public.variant_calls;
CREATE POLICY variant_calls_select_own ON public.variant_calls FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS variant_calls_insert_own ON public.variant_calls;
CREATE POLICY variant_calls_insert_own ON public.variant_calls FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- pathway_scores ----
DROP POLICY IF EXISTS pathway_scores_select_own ON public.pathway_scores;
CREATE POLICY pathway_scores_select_own ON public.pathway_scores FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS pathway_scores_insert_own ON public.pathway_scores;
CREATE POLICY pathway_scores_insert_own ON public.pathway_scores FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- lab_results_normalized ----
DROP POLICY IF EXISTS lab_results_normalized_select_own ON public.lab_results_normalized;
CREATE POLICY lab_results_normalized_select_own ON public.lab_results_normalized FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS lab_results_normalized_insert_own ON public.lab_results_normalized;
CREATE POLICY lab_results_normalized_insert_own ON public.lab_results_normalized FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- biomarker_trends ----
DROP POLICY IF EXISTS biomarker_trends_select_own ON public.biomarker_trends;
CREATE POLICY biomarker_trends_select_own ON public.biomarker_trends FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS biomarker_trends_insert_own ON public.biomarker_trends;
CREATE POLICY biomarker_trends_insert_own ON public.biomarker_trends FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- genotype_phenotype_concordance ----
DROP POLICY IF EXISTS gp_concordance_select_own ON public.genotype_phenotype_concordance;
CREATE POLICY gp_concordance_select_own ON public.genotype_phenotype_concordance FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS gp_concordance_insert_own ON public.genotype_phenotype_concordance;
CREATE POLICY gp_concordance_insert_own ON public.genotype_phenotype_concordance FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- user_health_context ----
DROP POLICY IF EXISTS user_health_context_select_own ON public.user_health_context;
CREATE POLICY user_health_context_select_own ON public.user_health_context FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS user_health_context_insert_own ON public.user_health_context;
CREATE POLICY user_health_context_insert_own ON public.user_health_context FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- diplotype_calls ----
DROP POLICY IF EXISTS diplotype_calls_select_own ON public.diplotype_calls;
CREATE POLICY diplotype_calls_select_own ON public.diplotype_calls FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS diplotype_calls_insert_own ON public.diplotype_calls;
CREATE POLICY diplotype_calls_insert_own ON public.diplotype_calls FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- ancestry_context ----
DROP POLICY IF EXISTS ancestry_context_select_own ON public.ancestry_context;
CREATE POLICY ancestry_context_select_own ON public.ancestry_context FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS ancestry_context_insert_own ON public.ancestry_context;
CREATE POLICY ancestry_context_insert_own ON public.ancestry_context FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- outcome_events ----
DROP POLICY IF EXISTS outcome_events_select_own ON public.outcome_events;
CREATE POLICY outcome_events_select_own ON public.outcome_events FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS outcome_events_insert_own ON public.outcome_events;
CREATE POLICY outcome_events_insert_own ON public.outcome_events FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- adverse_events ----
DROP POLICY IF EXISTS adverse_events_select_own ON public.adverse_events;
CREATE POLICY adverse_events_select_own ON public.adverse_events FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS adverse_events_insert_own ON public.adverse_events;
CREATE POLICY adverse_events_insert_own ON public.adverse_events FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- recommendation_audit (select-only) ----
DROP POLICY IF EXISTS recommendation_audit_select_own ON public.recommendation_audit;
CREATE POLICY recommendation_audit_select_own ON public.recommendation_audit FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- ---- user_context_canonical (select-only) ----
DROP POLICY IF EXISTS user_context_canonical_select_own ON public.user_context_canonical;
CREATE POLICY user_context_canonical_select_own ON public.user_context_canonical FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- ---- agent_conflict_log (select-only) ----
DROP POLICY IF EXISTS agent_conflict_log_select_own ON public.agent_conflict_log;
CREATE POLICY agent_conflict_log_select_own ON public.agent_conflict_log FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- ---- nutrient_intake_ledger ----
DROP POLICY IF EXISTS nutrient_intake_ledger_select_own ON public.nutrient_intake_ledger;
CREATE POLICY nutrient_intake_ledger_select_own ON public.nutrient_intake_ledger FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS nutrient_intake_ledger_insert_own ON public.nutrient_intake_ledger;
CREATE POLICY nutrient_intake_ledger_insert_own ON public.nutrient_intake_ledger FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- energy_balance_signals ----
DROP POLICY IF EXISTS energy_balance_signals_select_own ON public.energy_balance_signals;
CREATE POLICY energy_balance_signals_select_own ON public.energy_balance_signals FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS energy_balance_signals_insert_own ON public.energy_balance_signals;
CREATE POLICY energy_balance_signals_insert_own ON public.energy_balance_signals FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- active_compound_load ----
DROP POLICY IF EXISTS active_compound_load_select_own ON public.active_compound_load;
CREATE POLICY active_compound_load_select_own ON public.active_compound_load FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS active_compound_load_insert_own ON public.active_compound_load;
CREATE POLICY active_compound_load_insert_own ON public.active_compound_load FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- hydration_reconciliation ----
DROP POLICY IF EXISTS hydration_reconciliation_select_own ON public.hydration_reconciliation;
CREATE POLICY hydration_reconciliation_select_own ON public.hydration_reconciliation FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS hydration_reconciliation_insert_own ON public.hydration_reconciliation;
CREATE POLICY hydration_reconciliation_insert_own ON public.hydration_reconciliation FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);

-- ---- retest_schedule ----
DROP POLICY IF EXISTS retest_schedule_select_own ON public.retest_schedule;
CREATE POLICY retest_schedule_select_own ON public.retest_schedule FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS retest_schedule_insert_own ON public.retest_schedule;
CREATE POLICY retest_schedule_insert_own ON public.retest_schedule FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
