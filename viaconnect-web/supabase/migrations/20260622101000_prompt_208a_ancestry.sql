-- Prompt 208a Module C: ancestry-aware / population-aware rule application. Append-only.
-- ancestry_context = per-user ancestry (owner-scoped). snp_protocol_rules gains
-- append-only columns for the population a rule was validated in + a cross-population caveat.
CREATE TABLE IF NOT EXISTS public.ancestry_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text,
  populations jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ancestry_context_user_idx ON public.ancestry_context (user_id, created_at DESC);
ALTER TABLE public.ancestry_context ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ancestry_context_select_own ON public.ancestry_context;
CREATE POLICY ancestry_context_select_own ON public.ancestry_context
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS ancestry_context_insert_own ON public.ancestry_context;
CREATE POLICY ancestry_context_insert_own ON public.ancestry_context
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Append-only columns on snp_protocol_rules (honest "validated in" context).
ALTER TABLE public.snp_protocol_rules
  ADD COLUMN IF NOT EXISTS validated_populations text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.snp_protocol_rules
  ADD COLUMN IF NOT EXISTS cross_population_caveat text;
