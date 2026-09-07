-- clinical_assessments RLS initplan cleanup (debt only).
-- Live pg_policies expressions are recursively nested SELECT wrappers around
-- auth.uid() (using_len≈15458, ~908 nested SELECTs) from an automated initplan
-- repair loop applied to its own output. Semantics stay owner-scoped; this
-- DROP + CREATE restores the single-wrapper form from Supabase initplan guidance.
--
-- Scope lock: these three public.clinical_assessments policies ONLY.
-- Does NOT touch assessment_results or body_photo_sessions.
-- Does NOT change table schema, grants, or other tables.
-- Idempotent (DROP IF EXISTS + CREATE). Not applied in this PR.

-- ---- SELECT ----
DROP POLICY IF EXISTS "Users can view own assessment" ON public.clinical_assessments;
CREATE POLICY "Users can view own assessment"
  ON public.clinical_assessments
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ---- INSERT ----
DROP POLICY IF EXISTS "Users can insert own assessment" ON public.clinical_assessments;
CREATE POLICY "Users can insert own assessment"
  ON public.clinical_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ---- UPDATE ----
DROP POLICY IF EXISTS "Users can update own assessment" ON public.clinical_assessments;
CREATE POLICY "Users can update own assessment"
  ON public.clinical_assessments
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
