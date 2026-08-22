-- Prompt 227e: retraction and trial-status watch columns (Collection 14).

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS is_retracted boolean NOT NULL DEFAULT false;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS retraction_kind text
    CHECK (
      retraction_kind IS NULL
      OR retraction_kind IN (
        'retracted',
        'retraction_of',
        'expression_of_concern',
        'erratum'
      )
    );

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS retraction_notice_pmid text;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS retracted_detected_at timestamptz;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS last_retraction_check_at timestamptz;

CREATE INDEX IF NOT EXISTS kb_publications_retracted_idx
  ON public.kb_publications (is_retracted)
  WHERE is_retracted = true;

ALTER TABLE public.kb_trials
  ADD COLUMN IF NOT EXISTS prior_status text;

ALTER TABLE public.kb_trials
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

ALTER TABLE public.kb_trials
  ADD COLUMN IF NOT EXISTS last_status_check_at timestamptz;

ALTER TABLE public.kb_peptide_evidence_links
  ADD COLUMN IF NOT EXISTS support_flagged boolean NOT NULL DEFAULT false;

ALTER TABLE public.kb_peptide_evidence_links
  ADD COLUMN IF NOT EXISTS support_flag_reason text;

INSERT INTO public.curation_field_class_map (target_table, target_field, change_class, notes)
VALUES
  ('kb_publications', 'is_retracted', 1, 'Retraction flag; Thanos writes, Class 1 cascade'),
  ('kb_trials', 'status', 1, 'Trial status transitions; Thanos watch upsert')
ON CONFLICT (target_table, target_field) DO UPDATE SET
  change_class = EXCLUDED.change_class,
  notes = EXCLUDED.notes;

COMMENT ON COLUMN public.kb_publications.is_retracted IS
  'Prompt 227e: true when PubMed marks retracted or expression of concern.';
COMMENT ON COLUMN public.kb_peptide_evidence_links.support_flagged IS
  'Prompt 227e: evidence link flagged when supporting pub/trial is retracted or safety-terminated.';
