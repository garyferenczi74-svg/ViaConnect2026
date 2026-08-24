-- Prompt 226: Marshall allowlist seed for clearly FDA-approved injectable peptide drugs.
-- Sets fda_status + routes_studied + converter_eligible.
-- Gary continue authorization for Wave 0 scaffolding.
-- UNKNOWN remains non-eligible for any slug not listed here.
-- Semaglutide / tirzepatide: no dedicated Collection 14 slug yet; liraglutide covers GLP-1 class education.

UPDATE public.kb_peptides
SET
  fda_status = 'approved',
  health_canada_status = CASE
    WHEN slug IN (
      'liraglutide', 'dulaglutide', 'exenatide', 'pramlintide',
      'setmelanotide', 'teduglutide', 'afamelanotide', 'pt-141-bremelanotide',
      'tesamorelin', 'somatropin'
    ) THEN 'approved'
    ELSE health_canada_status
  END,
  routes_studied = CASE
    WHEN routes_studied IS NULL OR cardinality(routes_studied) = 0
      THEN ARRAY['subcutaneous']::text[]
    WHEN NOT (routes_studied && ARRAY['subcutaneous','intramuscular']::text[])
      THEN array_cat(routes_studied, ARRAY['subcutaneous']::text[])
    ELSE routes_studied
  END,
  converter_eligible = true,
  updated_at = now()
WHERE slug IN (
  'liraglutide',
  'dulaglutide',
  'exenatide',
  'pramlintide',
  'setmelanotide',
  'teduglutide',
  'afamelanotide',
  'pt-141-bremelanotide',
  'tesamorelin',
  'somatropin'
)
AND exclusion_tier = 'educational';

-- Explicitly keep research-chemical / non-approved educational compounds out.
UPDATE public.kb_peptides
SET
  converter_eligible = false,
  updated_at = now()
WHERE slug IN (
  'edu-bpc157',
  'edu-ss31',
  'ipamorelin-standalone',
  'cjc-1295-no-dac',
  'sermorelin',
  'mk-677',
  'epitalon',
  'semax',
  'selank',
  'mots-c',
  'aod-9604',
  'retatrutide'
);
