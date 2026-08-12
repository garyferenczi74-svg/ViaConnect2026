-- Prompt 215: structured product tab content + ingredient SNP relevance.
-- Append-only. Peptides excluded from consumer product_content seeds.

CREATE TABLE IF NOT EXISTS public.product_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_slug text NOT NULL,
  tab_key text NOT NULL
    CHECK (tab_key IN (
      'full_description',
      'ingredient_breakdown',
      'who_benefits',
      'formulation',
      'genetic_compatibility'
    )),
  body_md text NOT NULL DEFAULT '',
  gate_status text NOT NULL DEFAULT 'pending'
    CHECK (gate_status IN ('pending', 'approved', 'blocked', 'escalated')),
  gate_notes text,
  last_verified_at timestamptz,
  provenance jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'migration',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_slug, tab_key)
);

CREATE INDEX IF NOT EXISTS idx_product_content_slug
  ON public.product_content (product_slug);

ALTER TABLE public.product_content ENABLE ROW LEVEL SECURITY;

-- Approved consumer content is public-readable; pending never renders live
DROP POLICY IF EXISTS product_content_select_approved ON public.product_content;
CREATE POLICY product_content_select_approved
  ON public.product_content FOR SELECT TO authenticated, anon
  USING (gate_status = 'approved' AND tab_key <> 'genetic_compatibility');

-- Genetic compatibility body is personalized; never shared as static public content
-- (scores computed server-side; this tab_key row is optional shell only)

CREATE TABLE IF NOT EXISTS public.ingredient_snp_relevance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_key text NOT NULL,
  ingredient_label text NOT NULL,
  rsid text NOT NULL,
  gene_symbol text,
  relevance text NOT NULL
    CHECK (relevance IN ('positive', 'mixed', 'caution', 'coverage')),
  evidence_grade text NOT NULL DEFAULT 'unknown'
    CHECK (evidence_grade IN ('strong', 'moderate', 'emerging', 'unknown')),
  framing_key text NOT NULL DEFAULT 'relevance_positive',
  notes text,
  provenance jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ingredient_key, rsid, relevance)
);

CREATE INDEX IF NOT EXISTS idx_ing_snp_rsid
  ON public.ingredient_snp_relevance (rsid)
  WHERE is_active = true;

ALTER TABLE public.ingredient_snp_relevance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ingredient_snp_select ON public.ingredient_snp_relevance;
CREATE POLICY ingredient_snp_select
  ON public.ingredient_snp_relevance FOR SELECT TO authenticated
  USING (is_active = true);

-- Per-user score cache (optional; recompute on demand also fine)
CREATE TABLE IF NOT EXISTS public.product_genetic_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  band text NOT NULL CHECK (band IN ('green', 'yellow', 'red', 'pending', 'empty', 'signed_out')),
  score_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_slug)
);

CREATE INDEX IF NOT EXISTS idx_product_genetic_scores_user
  ON public.product_genetic_scores (user_id);

ALTER TABLE public.product_genetic_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_genetic_scores_own ON public.product_genetic_scores;
CREATE POLICY product_genetic_scores_own
  ON public.product_genetic_scores FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS product_genetic_scores_own_write ON public.product_genetic_scores;
CREATE POLICY product_genetic_scores_own_write
  ON public.product_genetic_scores FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS product_genetic_scores_own_update ON public.product_genetic_scores;
CREATE POLICY product_genetic_scores_own_update
  ON public.product_genetic_scores FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Seed core ingredient SNP relevance (Elysium mapping, Marshall framing keys)
INSERT INTO public.ingredient_snp_relevance (
  ingredient_key, ingredient_label, rsid, gene_symbol, relevance, evidence_grade, framing_key, notes, provenance, source_url
) VALUES
  ('methyl-folate', 'Methyl Folate (5-MTHF)', 'rs1801133', 'MTHFR', 'positive', 'strong', 'relevance_positive',
   'C677T reduced enzyme activity increases relevance of bioactive folate forms.',
   '[{"source":"clinical_snps","agent":"elysium"}]'::jsonb, 'https://pubmed.ncbi.nlm.nih.gov/?term=MTHFR+folate'),
  ('methyl-folate', 'Methyl Folate (5-MTHF)', 'rs1801131', 'MTHFR', 'positive', 'moderate', 'relevance_positive',
   'A1298C pathway relevance for folate cofactors.',
   '[{"source":"clinical_snps","agent":"elysium"}]'::jsonb, 'https://pubmed.ncbi.nlm.nih.gov/?term=MTHFR+A1298C'),
  ('methylcobalamin', 'Methylcobalamin B12', 'rs1801133', 'MTHFR', 'positive', 'moderate', 'relevance_positive',
   'Methylation cofactor support alongside folate pathways.',
   '[{"source":"clinical_snps","agent":"elysium"}]'::jsonb, null),
  ('methylcobalamin', 'Methylcobalamin B12', 'rs1801394', 'MTRR', 'positive', 'emerging', 'relevance_positive',
   'B12 regeneration pathway educational relevance.',
   '[{"source":"panel_map","agent":"elysium"}]'::jsonb, null),
  ('magnesium', 'Magnesium forms', 'rs1544410', 'VDR', 'mixed', 'emerging', 'relevance_partial',
   'Vitamin D receptor pathways interact with magnesium status; mixed evidence for prioritization.',
   '[{"source":"clinical_snps","agent":"elysium"}]'::jsonb, null),
  ('omega-3', 'Omega-3 EPA DHA', 'rs174537', 'FADS1', 'positive', 'moderate', 'relevance_positive',
   'Fatty acid desaturase variation can increase relevance of preformed EPA/DHA.',
   '[{"source":"nutrigenomics","agent":"elysium"}]'::jsonb, 'https://pubmed.ncbi.nlm.nih.gov/?term=FADS1+omega-3'),
  ('curcumin', 'Curcumin', 'rs1800795', 'IL6', 'positive', 'emerging', 'relevance_positive',
   'Inflammatory tone variants may increase educational relevance of curcumin research.',
   '[{"source":"clinical_snps","agent":"elysium"}]'::jsonb, null),
  ('curcumin', 'Curcumin', 'rs1800629', 'TNF', 'mixed', 'emerging', 'relevance_partial',
   'TNF promoter variation; mixed prioritization signal only.',
   '[{"source":"clinical_snps","agent":"elysium"}]'::jsonb, null),
  ('glutathione-nac', 'Glutathione / NAC', 'rs1695', 'GSTP1', 'positive', 'moderate', 'relevance_positive',
   'Phase II detox GSTP1 variation increases relevance of glutathione pathway support education.',
   '[{"source":"clinical_snps","agent":"elysium"}]'::jsonb, null),
  ('coq10-nad', 'CoQ10 / NAD support', 'rs762551', 'CYP1A2', 'coverage', 'unknown', 'relevance_partial',
   'Coverage-only link; not a strong prioritization signal alone.',
   '[{"source":"panel_map","agent":"elysium"}]'::jsonb, null),
  ('iron', 'Iron forms', 'rs1800562', 'HFE', 'caution', 'moderate', 'relevance_caution',
   'Marshall-approved caution: iron loading genetics may lower relevance of high-iron formulas. Not a safety verdict.',
   '[{"source":"marshall_framing","agent":"elysium"}]'::jsonb, null),
  ('caffeine-related', 'Caffeine-adjacent botanicals', 'rs762551', 'CYP1A2', 'mixed', 'moderate', 'relevance_partial',
   'Slow vs fast caffeine metabolism; mixed prioritization for stimulating formulas.',
   '[{"source":"clinical_snps","agent":"elysium"}]'::jsonb, null),
  ('comt-support', 'Catechol / stress support nutrients', 'rs4680', 'COMT', 'positive', 'moderate', 'relevance_positive',
   'COMT Val158Met may increase educational relevance of stress and catechol pathway nutrients.',
   '[{"source":"clinical_snps","agent":"elysium"}]'::jsonb, null),
  ('probiotic-gut', 'Probiotic and gut barrier nutrients', 'rs4986790', 'TLR4', 'coverage', 'unknown', 'relevance_partial',
   'Gut immune coverage placeholder; limited graded evidence.',
   '[{"source":"panel_map","agent":"elysium"}]'::jsonb, null),
  ('collagen-joint', 'Collagen / joint matrix', 'rs1800012', 'COL1A1', 'positive', 'emerging', 'relevance_positive',
   'Collagen gene variation educational relevance for joint formulas.',
   '[{"source":"peptide_iq","agent":"elysium"}]'::jsonb, null)
ON CONFLICT (ingredient_key, rsid, relevance) DO NOTHING;

COMMENT ON TABLE public.product_content IS 'Prompt 215 tab content model; Marshall gate_status controls live render.';
COMMENT ON TABLE public.ingredient_snp_relevance IS 'Prompt 215 Elysium ingredient-to-SNP relevance map with Marshall framing keys.';
COMMENT ON TABLE public.product_genetic_scores IS 'Prompt 215 per-user product genetic compatibility scores; owner RLS only.';
