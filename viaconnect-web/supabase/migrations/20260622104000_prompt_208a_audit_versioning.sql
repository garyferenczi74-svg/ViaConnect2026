-- Prompt 208a Module J: reproducibility, audit, versioning. Append-only.
-- corpus_snapshots + embedding_versions are reference (authenticated read).
-- recommendation_audit is owner-scoped (a user can read their own audit trail).

CREATE TABLE IF NOT EXISTS public.corpus_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atom_count integer NOT NULL DEFAULT 0,
  rule_count integer NOT NULL DEFAULT 0,
  snapshot_hash text,
  taken_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS corpus_snapshots_taken_idx ON public.corpus_snapshots (taken_at DESC);
ALTER TABLE public.corpus_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS corpus_snapshots_select ON public.corpus_snapshots;
CREATE POLICY corpus_snapshots_select ON public.corpus_snapshots
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.recommendation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inputs_hash text,
  rule_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  snapshot_ref uuid,
  disclaimer_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recommendation_audit_user_idx ON public.recommendation_audit (user_id, created_at DESC);
ALTER TABLE public.recommendation_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recommendation_audit_select_own ON public.recommendation_audit;
CREATE POLICY recommendation_audit_select_own ON public.recommendation_audit
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.embedding_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL,
  version text,
  dimension integer,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.embedding_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS embedding_versions_select ON public.embedding_versions;
CREATE POLICY embedding_versions_select ON public.embedding_versions
  FOR SELECT TO authenticated USING (true);
