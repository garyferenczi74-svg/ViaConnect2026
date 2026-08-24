-- Prompt 225 Phase 9 sample: one staged regulatory event through the real table.
-- applied_at remains NULL until Jeffery review (G7). Does not mutate live fields.

INSERT INTO public.kb_peptide_regulatory_events (
  peptide_id,
  jurisdiction,
  previous_status,
  new_status,
  effective_date,
  source_citation_id,
  detected_by,
  jeffery_review_id,
  applied_at
)
SELECT
  p.id,
  'United States',
  'unknown',
  'seed_hint_pending_verification',
  NULL,
  'wada_prohibited_list_annual_review_window',
  'thanos',
  NULL,
  NULL
FROM public.kb_peptides p
WHERE p.slug = 'ipamorelin-standalone'
  AND NOT EXISTS (
    SELECT 1
    FROM public.kb_peptide_regulatory_events e
    WHERE e.peptide_id = p.id
      AND e.jurisdiction = 'United States'
      AND e.new_status = 'seed_hint_pending_verification'
      AND e.detected_by = 'thanos'
  )
LIMIT 1;
