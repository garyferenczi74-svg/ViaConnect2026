-- clinical_assessments RLS cleanup: DROP + recreate owner policies.
-- Replaces bloated nested-SELECT (select auth.uid()) wrappers with a single
-- initplan form. IDENTICAL owner-only security semantics; performance-only.
-- Scope: public.clinical_assessments only. Idempotent (DROP IF EXISTS + CREATE).
-- Do not apply to live until Arnold tip + Gary asks.

DROP POLICY IF EXISTS "Users can view own assessment" ON public.clinical_assessments;
DROP POLICY IF EXISTS "Users can insert own assessment" ON public.clinical_assessments;
DROP POLICY IF EXISTS "Users can update own assessment" ON public.clinical_assessments;
CREATE POLICY "Users can view own assessment" ON public.clinical_assessments FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own assessment" ON public.clinical_assessments FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own assessment" ON public.clinical_assessments FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
