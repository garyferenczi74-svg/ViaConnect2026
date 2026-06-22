-- Prompt 208a Module K: agent orchestration + shared canonical context. Append-only.
-- user_context_canonical = the single source the agents read (owner-scoped).
-- agent_conflict_log = cross-agent conflicts + their resolution (owner-scoped).

CREATE TABLE IF NOT EXISTS public.user_context_canonical (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_context_canonical_user_idx ON public.user_context_canonical (user_id, computed_at DESC);
ALTER TABLE public.user_context_canonical ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_context_canonical_select_own ON public.user_context_canonical;
CREATE POLICY user_context_canonical_select_own ON public.user_context_canonical
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.agent_conflict_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_a text,
  agent_b text,
  topic text,
  conflict_detail text,
  resolution text,
  resolved_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_conflict_log_user_idx ON public.agent_conflict_log (user_id, created_at DESC);
ALTER TABLE public.agent_conflict_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_conflict_log_select_own ON public.agent_conflict_log;
CREATE POLICY agent_conflict_log_select_own ON public.agent_conflict_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
