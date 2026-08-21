-- Prompt 226d Wave A: suggestion_sessions (user-owned match briefing history).
-- Joins absolute isolation set with converter_sessions / user_prescribed_peptides /
-- hormone_reports / practitioner de-id protocols. Never a RAG or grading source.
-- Append-only.

CREATE TABLE IF NOT EXISTS public.suggestion_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goals_selected text[] NOT NULL DEFAULT '{}',
  inputs_used jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_snapshot_at timestamptz NOT NULL DEFAULT now(),
  disclaimer_version text NOT NULL DEFAULT '226d-v1',
  screening_cascade jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suggestion_sessions_user_idx
  ON public.suggestion_sessions (user_id, created_at DESC);

COMMENT ON TABLE public.suggestion_sessions IS
  'Prompt 226d: user suggestion briefing sessions. Absolute isolation. Never feed Thanos/Hannah RAG/evidence grading.';

ALTER TABLE public.suggestion_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suggestion_sessions_select_own ON public.suggestion_sessions;
CREATE POLICY suggestion_sessions_select_own
  ON public.suggestion_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS suggestion_sessions_insert_own ON public.suggestion_sessions;
CREATE POLICY suggestion_sessions_insert_own
  ON public.suggestion_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS suggestion_sessions_delete_own ON public.suggestion_sessions;
CREATE POLICY suggestion_sessions_delete_own
  ON public.suggestion_sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
