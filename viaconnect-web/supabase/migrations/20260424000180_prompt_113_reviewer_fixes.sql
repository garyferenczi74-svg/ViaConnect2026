-- =============================================================================
-- Prompt #113 Phase 1.4 — Reviewer fixes applied post-audit:
--   1. DSHEA disclaimer text corrected to 21 CFR 101.93(d) canonical PLURAL
--      form ("These statements ..."). Singular is permitted only for
--      single-claim surfaces; multi-claim surfaces require plural.
--   2. Deduplicate the adhd entry in regulatory_disease_dictionary (seeded
--      twice via an ordering mistake). Add UNIQUE (term, variant_group) so
--      future seeds cannot reintroduce duplicates.
-- =============================================================================

UPDATE public.regulatory_jurisdictions
   SET disclaimer_text = 'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.'
 WHERE code = 'US';

-- Deduplicate adhd. Keep the first-inserted row via aggregate + DELETE.
DELETE FROM public.regulatory_disease_dictionary a
 USING public.regulatory_disease_dictionary b
 WHERE a.id > b.id
   AND a.term = b.term
   AND COALESCE(a.variant_group, '') = COALESCE(b.variant_group, '');

-- Prevent future duplicates. Use NULL-tolerant partial uniques.
CREATE UNIQUE INDEX IF NOT EXISTS regdd_unique_term_group
  ON public.regulatory_disease_dictionary (term, variant_group)
  WHERE variant_group IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS regdd_unique_term_no_group
  ON public.regulatory_disease_dictionary (term)
  WHERE variant_group IS NULL;
