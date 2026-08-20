-- Prompt 225 Section 6.3: Via Cura adjacency (practitioner-facing jsonb).
-- Related nutritional support only. Never equivalent/substitute/alternative.
-- No vendor, URL, currency, or acquisition route. Marshall-gated wording.

UPDATE public.kb_peptides
SET
  via_cura_adjacency = jsonb_build_object(
    'framing', 'related_nutritional_support',
    'not', ARRAY['equivalent', 'substitute', 'alternative', 'natural_version_of'],
    'supports', ARRAY['Vitamin C', 'zinc', 'glycine and collagen precursors', 'silica'],
    'bioavailability_note', 'Where delivery technology is referenced, standing language remains 10x to 28x.',
    'marshall_status', 'approved',
    'lex_lane', true
  ),
  updated_at = now()
WHERE category ILIKE '%Tissue Repair%'
   OR category ILIKE '%Dermatologic%'
   OR slug IN ('edu-bpc157', 'bpc-157-arginate', 'thymosin-beta-4', 'ghk-cu-injectable', 'ghk-cu-topical', 'regenbpc', 'tb500-oral');

UPDATE public.kb_peptides
SET
  via_cura_adjacency = jsonb_build_object(
    'framing', 'related_nutritional_support',
    'not', ARRAY['equivalent', 'substitute', 'alternative', 'natural_version_of'],
    'supports', ARRAY['Sleep support formulation', 'glycine', 'magnesium'],
    'bioavailability_note', 'Where delivery technology is referenced, standing language remains 10x to 28x.',
    'marshall_status', 'approved',
    'lex_lane', true
  ),
  updated_at = now()
WHERE category ILIKE '%GH Axis%'
   OR slug IN ('ipamorelin-standalone', 'cjc-1295-no-dac', 'sermorelin', 'mk-677');

UPDATE public.kb_peptides
SET
  via_cura_adjacency = jsonb_build_object(
    'framing', 'related_nutritional_support',
    'not', ARRAY['equivalent', 'substitute', 'alternative', 'natural_version_of'],
    'supports', ARRAY['Fibre', 'chromium', 'protein adequacy guidance through Gordon'],
    'bioavailability_note', 'Where delivery technology is referenced, standing language remains 10x to 28x.',
    'marshall_status', 'approved',
    'lex_lane', true
  ),
  updated_at = now()
WHERE category ILIKE '%Metabolic%'
   OR slug IN ('liraglutide', 'exenatide', 'dulaglutide', 'pramlintide', 'retatrutide');

UPDATE public.kb_peptides
SET
  via_cura_adjacency = jsonb_build_object(
    'framing', 'related_nutritional_support',
    'not', ARRAY['equivalent', 'substitute', 'alternative', 'natural_version_of'],
    'supports', ARRAY['NAC', 'glycine', 'selenium', 'sulforaphane precursors'],
    'bioavailability_note', 'Where delivery technology is referenced, standing language remains 10x to 28x.',
    'marshall_status', 'approved',
    'lex_lane', true
  ),
  updated_at = now()
WHERE slug IN ('glutathione', 'detoxpeptide', 'gutrepair')
   OR category ILIKE '%Gut%';

UPDATE public.kb_peptides
SET
  via_cura_adjacency = jsonb_build_object(
    'framing', 'related_nutritional_support',
    'not', ARRAY['equivalent', 'substitute', 'alternative', 'natural_version_of'],
    'supports', ARRAY['Niacinamide and NAD+ precursor support'],
    'bioavailability_note', 'Where delivery technology is referenced, standing language remains 10x to 28x.',
    'marshall_status', 'approved',
    'lex_lane', true
  ),
  updated_at = now()
WHERE slug IN ('nmn', 'nr', 'nad', 'energycore', 'atp-regen')
   OR (category ILIKE '%Mitochondrial%' AND molecular_class IN ('cofactor', 'small_molecule'));

UPDATE public.kb_peptides
SET
  via_cura_adjacency = jsonb_build_object(
    'framing', 'related_nutritional_support',
    'not', ARRAY['equivalent', 'substitute', 'alternative', 'natural_version_of'],
    'supports', ARRAY['CoQ10', 'PQQ', 'alpha-lipoic acid'],
    'bioavailability_note', 'Where delivery technology is referenced, standing language remains 10x to 28x.',
    'marshall_status', 'approved',
    'lex_lane', true
  ),
  updated_at = now()
WHERE category ILIKE '%Mitochondrial%'
   OR slug IN ('edu-ss31', 'mots-c', 'humanin', 'mitopeptide', 'coq10-peptide');

UPDATE public.kb_peptides
SET
  via_cura_adjacency = jsonb_build_object(
    'framing', 'related_nutritional_support',
    'not', ARRAY['equivalent', 'substitute', 'alternative', 'natural_version_of'],
    'supports', ARRAY['DHA', 'citicoline', 'B-complex'],
    'bioavailability_note', 'Where delivery technology is referenced, standing language remains 10x to 28x.',
    'marshall_status', 'approved',
    'lex_lane', true
  ),
  updated_at = now()
WHERE category ILIKE '%Cognitive%'
   OR slug IN ('semax', 'selank', 'pinealon', 'noopept');

UPDATE public.kb_peptides
SET
  via_cura_adjacency = jsonb_build_object(
    'framing', 'related_nutritional_support',
    'not', ARRAY['equivalent', 'substitute', 'alternative', 'natural_version_of'],
    'supports', ARRAY['L-glutamine', 'zinc carnosine'],
    'bioavailability_note', 'Where delivery technology is referenced, standing language remains 10x to 28x.',
    'marshall_status', 'approved',
    'lex_lane', true
  ),
  updated_at = now()
WHERE category ILIKE '%Gastrointestinal%'
   OR slug IN ('larazotide', 'teduglutide', 'linaclotide', 'plecanatide', 'l-glutamine', 'kpv-tripeptide');

UPDATE public.kb_peptides
SET
  via_cura_adjacency = jsonb_build_object(
    'framing', 'related_nutritional_support',
    'not', ARRAY['equivalent', 'substitute', 'alternative', 'natural_version_of'],
    'supports', ARRAY['Topical and oral antioxidant support'],
    'bioavailability_note', 'Where delivery technology is referenced, standing language remains 10x to 28x.',
    'marshall_status', 'approved',
    'lex_lane', true
  ),
  updated_at = now()
WHERE category ILIKE '%Dermatologic%'
   OR slug IN ('argireline', 'matrixyl', 'matrixyl-3000', 'ghk-cu-topical', 'snap-8');
