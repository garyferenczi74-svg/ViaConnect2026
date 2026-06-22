-- Prompt 208b 4.8: re-test cadence engine. Append-only. When a protocol targets a
-- biomarker, schedule a sensible re-test window + capture the baseline; the next-cycle
-- re-test is compared to baseline to drive the adjustment. Owner-scoped.
CREATE TABLE IF NOT EXISTS public.retest_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biomarker text NOT NULL,
  intervention_ref text,
  recommended_retest_window text,
  recommended_retest_at timestamptz,
  baseline_value numeric,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','due','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retest_schedule_user_idx ON public.retest_schedule (user_id, status, created_at DESC);
ALTER TABLE public.retest_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS retest_schedule_select_own ON public.retest_schedule;
CREATE POLICY retest_schedule_select_own ON public.retest_schedule
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS retest_schedule_insert_own ON public.retest_schedule;
CREATE POLICY retest_schedule_insert_own ON public.retest_schedule
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
