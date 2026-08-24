-- Prompt 214d Gap 5: seed practitioner-depth peptide education rows.
-- Append-only. Consumer RLS already excludes is_practitioner_depth = true.

INSERT INTO public.peptide_education_entries (
  entry_key, title, summary, mechanism, evidence_grade, regulatory_status, safety_context,
  topic_keys, provenance, source_url, is_practitioner_depth, is_active
) VALUES
  (
    'depth-bpc157-framework',
    'BPC-157 practitioner protocol framework (educational)',
    'Structured educational framework for discussing BPC-157 research context with patients. Not a prescription. Dosing research ranges belong in clinical judgment with a qualified practitioner; this entry is guidance material only.',
    'Angiogenic and cytoprotective pathway literature; gut-barrier and soft-tissue research signals.',
    'moderate',
    'Research compound framing; not a ViaConnect commercial product',
    'Review contraindications, concurrent medications, and jurisdiction before any clinical discussion. Educational only.',
    ARRAY['peptide-bpc157'],
    '[{"source":"system-seed","agent":"thanos","gate":"marshall"}]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/?term=BPC-157',
    true,
    true
  ),
  (
    'depth-ss31-framework',
    'SS-31 / elamipretide practitioner framework (educational)',
    'Indication-aware educational framework. Barth syndrome approval context is distinct from off-label discussion. No consumer purchase path.',
    'Cardiolipin stabilization and mitochondrial energetics literature.',
    'strong',
    'FDA-approved for Barth syndrome (elamipretide); other uses specialist context only',
    'Separate approved indication from educational wellness discussion. Document informed consent pathways in the clinical record.',
    ARRAY['peptide-ss31'],
    '[{"source":"system-seed","agent":"thanos","gate":"marshall"}]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/?term=elamipretide',
    true,
    true
  )
ON CONFLICT (entry_key) DO NOTHING;

COMMENT ON TABLE public.peptide_education_entries IS 'Thanos peptide education; is_practitioner_depth=true is practitioner portal only (214d).';
