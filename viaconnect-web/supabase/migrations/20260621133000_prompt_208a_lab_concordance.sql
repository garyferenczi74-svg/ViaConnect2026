-- Prompt 208a Module E: lab normalization, trends, genotype-phenotype concordance.
-- Append-only. Owner-scoped RLS (consumer-derived lab/genetic data).
CREATE TABLE IF NOT EXISTS public.lab_results_normalized (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biomarker text NOT NULL,
  value numeric,
  unit_normalized text,
  reference_low numeric,
  reference_high numeric,
  age_sex_adjusted boolean NOT NULL DEFAULT false,
  measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lab_results_normalized_user_idx ON public.lab_results_normalized (user_id, biomarker, measured_at DESC);
ALTER TABLE public.lab_results_normalized ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lab_results_normalized_select_own ON public.lab_results_normalized;
CREATE POLICY lab_results_normalized_select_own ON public.lab_results_normalized
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS lab_results_normalized_insert_own ON public.lab_results_normalized;
CREATE POLICY lab_results_normalized_insert_own ON public.lab_results_normalized
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.biomarker_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  biomarker text NOT NULL,
  direction text CHECK (direction IN ('rising','falling','flat')),
  slope numeric,
  trend_window text,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS biomarker_trends_user_idx ON public.biomarker_trends (user_id, biomarker, computed_at DESC);
ALTER TABLE public.biomarker_trends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS biomarker_trends_select_own ON public.biomarker_trends;
CREATE POLICY biomarker_trends_select_own ON public.biomarker_trends
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS biomarker_trends_insert_own ON public.biomarker_trends;
CREATE POLICY biomarker_trends_insert_own ON public.biomarker_trends
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.genotype_phenotype_concordance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gene text,
  variant text,
  biomarker text,
  concordance_state text CHECK (concordance_state IN ('concordant','discordant','predisposition_only')),
  confidence text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gp_concordance_user_idx ON public.genotype_phenotype_concordance (user_id, created_at DESC);
ALTER TABLE public.genotype_phenotype_concordance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gp_concordance_select_own ON public.genotype_phenotype_concordance;
CREATE POLICY gp_concordance_select_own ON public.genotype_phenotype_concordance
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS gp_concordance_insert_own ON public.genotype_phenotype_concordance;
CREATE POLICY gp_concordance_insert_own ON public.genotype_phenotype_concordance
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
