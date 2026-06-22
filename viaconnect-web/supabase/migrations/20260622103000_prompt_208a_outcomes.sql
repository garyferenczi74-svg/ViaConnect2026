-- Prompt 208a Module H: outcome feedback + intelligence flywheel. Append-only.
-- outcome_events + adverse_events are owner-scoped (per-user). cohort_signals are
-- aggregate-only (no PII; authenticated read). practitioner_feedback is service-role only.

CREATE TABLE IF NOT EXISTS public.outcome_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol_ref text,
  adherence numeric,
  subjective_outcome text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outcome_events_user_idx ON public.outcome_events (user_id, recorded_at DESC);
ALTER TABLE public.outcome_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outcome_events_select_own ON public.outcome_events;
CREATE POLICY outcome_events_select_own ON public.outcome_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS outcome_events_insert_own ON public.outcome_events;
CREATE POLICY outcome_events_insert_own ON public.outcome_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.adverse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_ref text,
  description text,
  severity text CHECK (severity IN ('mild','moderate','severe','unknown')),
  implicated_rule_id uuid,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS adverse_events_user_idx ON public.adverse_events (user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS adverse_events_rule_idx ON public.adverse_events (implicated_rule_id);
ALTER TABLE public.adverse_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS adverse_events_select_own ON public.adverse_events;
CREATE POLICY adverse_events_select_own ON public.adverse_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS adverse_events_insert_own ON public.adverse_events;
CREATE POLICY adverse_events_insert_own ON public.adverse_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.cohort_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_ref text,
  biomarker text,
  aggregate_delta numeric,
  n integer NOT NULL DEFAULT 0,
  signal_strength text,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cohort_signals_computed_idx ON public.cohort_signals (computed_at DESC);
ALTER TABLE public.cohort_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cohort_signals_select ON public.cohort_signals;
CREATE POLICY cohort_signals_select ON public.cohort_signals
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.practitioner_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_ref text,
  rule_id uuid,
  correction text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS practitioner_feedback_rule_idx ON public.practitioner_feedback (rule_id);
ALTER TABLE public.practitioner_feedback ENABLE ROW LEVEL SECURITY;
