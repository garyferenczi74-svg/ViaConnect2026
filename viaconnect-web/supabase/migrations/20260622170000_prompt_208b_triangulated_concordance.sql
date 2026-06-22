-- Prompt 208b 4.3: triangulated (three-way) concordance. Append-only columns on the
-- 208a genotype_phenotype_concordance table. symptom_ref carries the CAQ symptom that
-- corroborates the genotype + biomarker; concordance_dimensions = how many of the three
-- sources agree (1, 2, or 3) and drives the recomputed confidence.
ALTER TABLE public.genotype_phenotype_concordance
  ADD COLUMN IF NOT EXISTS symptom_ref text;
ALTER TABLE public.genotype_phenotype_concordance
  ADD COLUMN IF NOT EXISTS concordance_dimensions smallint CHECK (concordance_dimensions IN (1,2,3));
