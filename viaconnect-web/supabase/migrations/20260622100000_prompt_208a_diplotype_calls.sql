-- Prompt 208a Module B: pharmacogenomics star-allele diplotyping. Append-only.
-- Owner-scoped per-user diplotype calls -> metabolizer phenotype. Drug-related output
-- is practitioner-only on the consumer side (enforced in the engine/UI, not here).
CREATE TABLE IF NOT EXISTS public.diplotype_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gene text NOT NULL,
  diplotype text,
  metabolizer_phenotype text CHECK (metabolizer_phenotype IN ('poor','intermediate','normal','rapid','ultrarapid','indeterminate')),
  confidence text,
  evidence_tier smallint CHECK (evidence_tier IN (1,2,3)),
  source_atom_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS diplotype_calls_user_gene_idx ON public.diplotype_calls (user_id, gene, created_at DESC);
ALTER TABLE public.diplotype_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS diplotype_calls_select_own ON public.diplotype_calls;
CREATE POLICY diplotype_calls_select_own ON public.diplotype_calls
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS diplotype_calls_insert_own ON public.diplotype_calls;
CREATE POLICY diplotype_calls_insert_own ON public.diplotype_calls
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
