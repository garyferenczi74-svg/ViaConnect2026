-- Prompt 225a Section 8: honesty layer fields on kb_peptides.
-- Append-only. Computed from evidence links; never invents trials.

ALTER TABLE public.kb_peptides
  ADD COLUMN IF NOT EXISTS honesty_layer jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.kb_peptides.honesty_layer IS
  'Prompt 225a: trials_registered/completed/terminated/results_posted, publications_human/animal, systematic_reviews, terminated_for_safety, evidence_gap_statement. Computed; thin compounds stay clearly thin.';

CREATE INDEX IF NOT EXISTS kb_peptides_honesty_gin
  ON public.kb_peptides USING gin (honesty_layer);
