-- Prompt 208a Module D: pathway aggregation. Append-only.
-- Per-user composite pathway loads (methylation, detox/antioxidant, vitamin D axis,
-- etc.) aggregated from qualified variants. Owner-scoped RLS.
CREATE TABLE IF NOT EXISTS public.pathway_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pathway text NOT NULL,
  component_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  composite_score numeric,
  severity_band text CHECK (severity_band IN ('low','moderate','high')),
  evidence_tier smallint CHECK (evidence_tier IN (1,2,3)),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pathway_scores_user_idx ON public.pathway_scores (user_id, pathway, created_at DESC);
ALTER TABLE public.pathway_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pathway_scores_select_own ON public.pathway_scores;
CREATE POLICY pathway_scores_select_own ON public.pathway_scores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS pathway_scores_insert_own ON public.pathway_scores;
CREATE POLICY pathway_scores_insert_own ON public.pathway_scores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
