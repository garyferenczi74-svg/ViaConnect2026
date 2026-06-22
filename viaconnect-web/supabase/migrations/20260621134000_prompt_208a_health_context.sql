-- Prompt 208a Module F: full-phenotype context + drug-nutrient depletions.
-- Append-only. user_health_context is owner-scoped (per-user). drug_nutrient_depletions
-- is reference content (service-role write, authenticated read).

CREATE TABLE IF NOT EXISTS public.user_health_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  demographics jsonb NOT NULL DEFAULT '{}'::jsonb,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  allergies jsonb NOT NULL DEFAULT '[]'::jsonb,
  pregnancy_status text,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_health_context_user_idx ON public.user_health_context (user_id, updated_at DESC);
ALTER TABLE public.user_health_context ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_health_context_select_own ON public.user_health_context;
CREATE POLICY user_health_context_select_own ON public.user_health_context
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_health_context_insert_own ON public.user_health_context;
CREATE POLICY user_health_context_insert_own ON public.user_health_context
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.drug_nutrient_depletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication text NOT NULL,
  depleted_nutrient text NOT NULL,
  mechanism text,
  evidence_tier smallint CHECK (evidence_tier IN (1,2,3)),
  source_atom_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drug_nutrient_depletions_med_idx ON public.drug_nutrient_depletions (medication);
ALTER TABLE public.drug_nutrient_depletions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS drug_nutrient_depletions_select ON public.drug_nutrient_depletions;
CREATE POLICY drug_nutrient_depletions_select ON public.drug_nutrient_depletions
  FOR SELECT TO authenticated USING (true);
