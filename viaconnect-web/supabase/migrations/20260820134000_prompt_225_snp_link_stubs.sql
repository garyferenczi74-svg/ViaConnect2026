-- Prompt 225: kb_peptide_snp_links stubs (Elysium co-owned).
-- Relevance framing only. consumer_safe false until Marshall.
-- snp_association_id left null until Collection 11 rows are matched.

INSERT INTO public.kb_peptide_snp_links (
  peptide_id, snp_association_id, relationship_type, direction,
  evidence_grade, citation_ids, consumer_safe
)
SELECT p.id, NULL, v.relationship_type, v.direction, v.evidence_grade, '{}'::text[], false
FROM (VALUES
  ('ipamorelin-standalone', 'receptor_variant', 'insufficient_evidence', 'D'),
  ('cjc-1295-no-dac', 'receptor_variant', 'insufficient_evidence', 'D'),
  ('sermorelin', 'receptor_variant', 'insufficient_evidence', 'D'),
  ('mk-677', 'receptor_variant', 'insufficient_evidence', 'D'),
  ('liraglutide', 'receptor_variant', 'insufficient_evidence', 'C'),
  ('exenatide', 'receptor_variant', 'insufficient_evidence', 'C'),
  ('dulaglutide', 'receptor_variant', 'insufficient_evidence', 'C'),
  ('setmelanotide', 'receptor_variant', 'may_increase_response', 'B'),
  ('afamelanotide', 'safety_relevant', 'safety_consideration', 'C'),
  ('melanotan-2', 'safety_relevant', 'safety_consideration', 'C'),
  ('semax', 'pathway_variant', 'insufficient_evidence', 'D'),
  ('selank', 'pathway_variant', 'insufficient_evidence', 'D'),
  ('5-amino-1mq', 'pathway_variant', 'insufficient_evidence', 'D'),
  ('ac-sdkp', 'clearance_variant', 'insufficient_evidence', 'D'),
  ('epitalon', 'commonly_overclaimed', 'insufficient_evidence', 'E'),
  ('edu-bpc157', 'commonly_overclaimed', 'insufficient_evidence', 'E')
) AS v(slug, relationship_type, direction, evidence_grade)
JOIN public.kb_peptides p ON p.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.kb_peptide_snp_links l
  WHERE l.peptide_id = p.id
    AND l.relationship_type = v.relationship_type
    AND l.direction = v.direction
);
