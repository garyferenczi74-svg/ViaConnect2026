-- =============================================================================
-- Prompt 175g (2026-06-05): per-field provenance on the canonical reference.
--
-- Each upsert into supplement_reference_canonical now records which
-- source filled each column (canonical / dsld / openfoodfacts /
-- farmceutica_peptides / go_upc / lnhpd / pubmed / consumer_health /
-- ocr / manual). Lets Hannah surface the source on tap and lets
-- Sherlock rank source reliability over time.
--
-- APPEND-ONLY: new column with default. Existing rows get '{}'.
-- =============================================================================

ALTER TABLE public.supplement_reference_canonical
  ADD COLUMN IF NOT EXISTS field_sources jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.supplement_reference_canonical.field_sources IS
  'Per-field provenance map (Prompt 175g). Keys are column names; values are source slugs.';
