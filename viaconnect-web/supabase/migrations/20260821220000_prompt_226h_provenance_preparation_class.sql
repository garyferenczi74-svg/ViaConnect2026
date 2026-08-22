-- Prompt 226h Wave A: provenance weighting, preparation class, registry tiers.
-- Implements Gary Unified Retrieval Phase Wave A (doc labeled 226f).
-- Gates G50 grade cap fields, G52 translation fields, G55 cytomax/cytogen separation.
-- ICTRP remains pending_access. Append-only.

-- 1. Preparation class on kb_peptides
ALTER TABLE public.kb_peptides
  ADD COLUMN IF NOT EXISTS preparation_class text NOT NULL DEFAULT 'not_applicable';

ALTER TABLE public.kb_peptides
  DROP CONSTRAINT IF EXISTS kb_peptides_preparation_class_check;

ALTER TABLE public.kb_peptides
  ADD CONSTRAINT kb_peptides_preparation_class_check
  CHECK (preparation_class IN ('tissue_extract', 'synthetic_defined', 'not_applicable'));

ALTER TABLE public.kb_peptides
  ADD COLUMN IF NOT EXISTS derived_from_peptide_id uuid REFERENCES public.kb_peptides(id) ON DELETE SET NULL;

ALTER TABLE public.kb_peptides
  ADD COLUMN IF NOT EXISTS provenance_disclosure text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.kb_peptides.preparation_class IS
  'Prompt 226h G55: tissue_extract (cytomax) vs synthetic_defined (cytogen). Evidence must not cross this boundary.';

COMMENT ON COLUMN public.kb_peptides.derived_from_peptide_id IS
  'Prompt 226h: synthetic derived from an extract row. Not a synonym merge.';

-- 2. Publication provenance + translation + studied subject
ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS author_network_id text;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS primary_institution text;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS is_independent_of_originating_group boolean;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS funding_source text;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS conflict_of_interest_declared boolean;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS journal_indexing text;

ALTER TABLE public.kb_publications
  DROP CONSTRAINT IF EXISTS kb_publications_journal_indexing_check;

ALTER TABLE public.kb_publications
  ADD CONSTRAINT kb_publications_journal_indexing_check
  CHECK (
    journal_indexing IS NULL
    OR journal_indexing IN ('medline', 'scopus', 'rsci_only', 'not_indexed')
  );

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS peer_review_transparency text;

ALTER TABLE public.kb_publications
  DROP CONSTRAINT IF EXISTS kb_publications_peer_review_transparency_check;

ALTER TABLE public.kb_publications
  ADD CONSTRAINT kb_publications_peer_review_transparency_check
  CHECK (
    peer_review_transparency IS NULL
    OR peer_review_transparency IN ('open', 'standard', 'unclear')
  );

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS original_language text;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS translation_method text NOT NULL DEFAULT 'none';

ALTER TABLE public.kb_publications
  DROP CONSTRAINT IF EXISTS kb_publications_translation_method_check;

ALTER TABLE public.kb_publications
  ADD CONSTRAINT kb_publications_translation_method_check
  CHECK (
    translation_method IN (
      'published_translation', 'machine_translation', 'human_translation', 'none'
    )
  );

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS translation_reviewed_by text;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS translation_reviewed_at timestamptz;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS studied_peptide_id uuid REFERENCES public.kb_peptides(id) ON DELETE SET NULL;

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS studied_preparation_class text;

ALTER TABLE public.kb_publications
  DROP CONSTRAINT IF EXISTS kb_publications_studied_preparation_class_check;

ALTER TABLE public.kb_publications
  ADD CONSTRAINT kb_publications_studied_preparation_class_check
  CHECK (
    studied_preparation_class IS NULL
    OR studied_preparation_class IN ('tissue_extract', 'synthetic_defined', 'not_applicable')
  );

ALTER TABLE public.kb_publications
  ADD COLUMN IF NOT EXISTS source_tier integer;

ALTER TABLE public.kb_publications
  DROP CONSTRAINT IF EXISTS kb_publications_source_tier_check;

ALTER TABLE public.kb_publications
  ADD CONSTRAINT kb_publications_source_tier_check
  CHECK (source_tier IS NULL OR source_tier BETWEEN 1 AND 4);

COMMENT ON COLUMN public.kb_publications.translation_method IS
  'Prompt 226h G52: machine_translation is not consumer-retrievable until translation_reviewed_by is set.';

COMMENT ON COLUMN public.kb_publications.source_tier IS
  'Prompt 226h G54: only tiers 1 to 3 may contribute to evidence grades. Tier 4 must never be stored.';

-- 3. Extend authorities_sources into typed registry
ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS source_tier integer;

ALTER TABLE public.authorities_sources
  DROP CONSTRAINT IF EXISTS authorities_sources_source_tier_check;

ALTER TABLE public.authorities_sources
  ADD CONSTRAINT authorities_sources_source_tier_check
  CHECK (source_tier IS NULL OR source_tier BETWEEN 1 AND 4);

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS transport text;

ALTER TABLE public.authorities_sources
  DROP CONSTRAINT IF EXISTS authorities_sources_transport_check;

ALTER TABLE public.authorities_sources
  ADD CONSTRAINT authorities_sources_transport_check
  CHECK (
    transport IS NULL
    OR transport IN ('rest_api', 'eutils', 'bulk_export', 'firecrawl', 'manual')
  );

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS registry_status text;

ALTER TABLE public.authorities_sources
  DROP CONSTRAINT IF EXISTS authorities_sources_registry_status_check;

ALTER TABLE public.authorities_sources
  ADD CONSTRAINT authorities_sources_registry_status_check
  CHECK (
    registry_status IS NULL
    OR registry_status IN ('live', 'pending_access', 'degraded', 'blocked')
  );

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS blocked_reason text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS terms_url text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS lex_review_id text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS robots_compliant boolean;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS rate_limit_policy text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS cadence text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS cursor_field text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS last_successful_run timestamptz;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS coverage_note text NOT NULL DEFAULT '';

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS language text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS institutional_affiliation text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS known_conflicts_of_interest text;

UPDATE public.authorities_sources SET
  source_tier = 1,
  transport = CASE
    WHEN domain IN ('clinicaltrials.gov') THEN 'rest_api'
    ELSE COALESCE(transport, 'manual')
  END,
  registry_status = CASE
    WHEN domain = 'trialsearch.who.int' THEN 'blocked'
    WHEN domain IN ('clinicaltrials.gov', 'pubmed.ncbi.nlm.nih.gov', 'www.fda.gov') THEN 'live'
    ELSE COALESCE(registry_status, 'live')
  END,
  robots_compliant = COALESCE(robots_compliant, true),
  coverage_note = COALESCE(NULLIF(coverage_note, ''), notes, ''),
  updated_at = now()
WHERE domain IN (
  'clinicaltrials.gov', 'www.fda.gov', 'www.who.int', 'www.efsa.europa.eu'
);

UPDATE public.authorities_sources SET
  source_tier = 2,
  transport = CASE
    WHEN domain LIKE '%pubmed%' OR domain LIKE '%ncbi%' THEN 'eutils'
    ELSE COALESCE(transport, 'firecrawl')
  END,
  registry_status = COALESCE(registry_status, 'live'),
  robots_compliant = COALESCE(robots_compliant, true),
  updated_at = now()
WHERE domain IN (
  'pubmed.ncbi.nlm.nih.gov', 'www.ncbi.nlm.nih.gov', 'www.nature.com',
  'www.nejm.org', 'jamanetwork.com', 'www.thelancet.com', 'www.frontiersin.org',
  'academic.oup.com', 'www.sciencedirect.com', 'www.cell.com'
);

UPDATE public.authorities_sources SET
  source_tier = 1,
  registry_status = 'blocked',
  blocked_reason = 'Prompt 226h / G10: ICTRP portal blocked pending WHO credentials. Tier 1 registry when credentialed; not crawlable now.',
  is_active = false,
  approval_status = 'rejected',
  updated_at = now()
WHERE domain = 'trialsearch.who.int';

UPDATE public.kb_ingest_source_status SET
  status = 'pending_access',
  reason = 'WHO ICTRP requires credentialed SharePoint bulk access / crawling credentials. Gary action: request via ictrpinfo@who.int.',
  coverage_note = 'Global registry coverage is incomplete until ICTRP credentials land. Trials registered only outside ClinicalTrials.gov may be missing.',
  updated_at = now()
WHERE source_system = 'ictrp';

-- 4. Rejection log
CREATE TABLE IF NOT EXISTS public.kb_evidence_link_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id uuid,
  publication_id uuid,
  trial_id uuid,
  reason text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_evidence_link_rejections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_evidence_link_rejections_select_authenticated ON public.kb_evidence_link_rejections;
CREATE POLICY kb_evidence_link_rejections_select_authenticated
  ON public.kb_evidence_link_rejections
  FOR SELECT TO authenticated
  USING (true);

COMMENT ON TABLE public.kb_evidence_link_rejections IS
  'Prompt 226h G55: audit log when extract/synthetic evidence cross-links are rejected.';

-- 5. Trigger: refuse tissue_extract <-> synthetic_defined evidence links
CREATE OR REPLACE FUNCTION public.enforce_preparation_class_evidence_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_new_class text;
  v_studied_class text;
  v_studied_peptide uuid;
  v_other_class text;
  v_conflict boolean := false;
BEGIN
  -- Raise only. Writers must INSERT into kb_evidence_link_rejections
  -- outside this aborted transaction so the audit row persists.

  SELECT preparation_class INTO v_new_class
  FROM public.kb_peptides
  WHERE id = NEW.peptide_id;

  IF v_new_class IS NULL THEN
    v_new_class := 'not_applicable';
  END IF;

  IF NEW.publication_id IS NOT NULL THEN
    SELECT studied_preparation_class, studied_peptide_id
      INTO v_studied_class, v_studied_peptide
    FROM public.kb_publications
    WHERE id = NEW.publication_id;

    IF v_studied_peptide IS NOT NULL AND v_studied_class IS NULL THEN
      SELECT preparation_class INTO v_studied_class
      FROM public.kb_peptides WHERE id = v_studied_peptide;
    END IF;

    IF v_studied_class IN ('tissue_extract', 'synthetic_defined')
       AND v_new_class IN ('tissue_extract', 'synthetic_defined')
       AND v_studied_class <> v_new_class THEN
      v_conflict := true;
    END IF;

    IF NOT v_conflict THEN
      SELECT p.preparation_class INTO v_other_class
      FROM public.kb_peptide_evidence_links l
      JOIN public.kb_peptides p ON p.id = l.peptide_id
      WHERE l.publication_id = NEW.publication_id
        AND l.peptide_id <> NEW.peptide_id
        AND p.preparation_class IN ('tissue_extract', 'synthetic_defined')
        AND v_new_class IN ('tissue_extract', 'synthetic_defined')
        AND p.preparation_class <> v_new_class
      LIMIT 1;

      IF v_other_class IS NOT NULL THEN
        v_conflict := true;
      END IF;
    END IF;
  END IF;

  IF v_conflict THEN
    RAISE EXCEPTION 'preparation_class_cross_link: tissue_extract and synthetic_defined evidence must not share links';
  END IF;

  RETURN NEW;
END;
$fn$;

CREATE INDEX IF NOT EXISTS kb_peptide_evidence_links_publication_idx
  ON public.kb_peptide_evidence_links (publication_id)
  WHERE publication_id IS NOT NULL;

DROP TRIGGER IF EXISTS kb_peptide_evidence_links_preparation_class
  ON public.kb_peptide_evidence_links;

CREATE TRIGGER kb_peptide_evidence_links_preparation_class
  BEFORE INSERT OR UPDATE ON public.kb_peptide_evidence_links
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_preparation_class_evidence_link();

-- 6. Backfill preparation classes + disclosure
UPDATE public.kb_peptides SET
  preparation_class = 'tissue_extract',
  provenance_disclosure = 'The published research on this compound comes overwhelmingly from a single research institution and its affiliated laboratories, published largely in Russian-language or Russian-affiliated journals. Independent replication outside that group is limited. This does not mean the findings are wrong. It means they have not passed through the independent replication that is normally required before a finding is treated as established.',
  misconception_notes = CASE
    WHEN misconception_notes IS NULL OR misconception_notes = '' THEN
      'Tissue extract (cytomax-class). Older clinical history belongs to the extract, not to derived synthetic peptides.'
    ELSE misconception_notes
  END,
  updated_at = now()
WHERE slug IN ('epithalamin', 'thymalin');

UPDATE public.kb_peptides SET
  preparation_class = 'synthetic_defined',
  provenance_disclosure = 'The published research on this compound comes overwhelmingly from a single research institution and its affiliated laboratories, published largely in Russian-language or Russian-affiliated journals. Independent replication outside that group is limited. This does not mean the findings are wrong. It means they have not passed through the independent replication that is normally required before a finding is treated as established.',
  misconception_notes = CASE
    WHEN misconception_notes IS NULL OR misconception_notes = '' THEN
      'Synthetic defined peptide (cytogen-class). Do not treat extract clinical history as evidence for this synthetic.'
    ELSE misconception_notes
  END,
  updated_at = now()
WHERE slug IN (
  'epitalon', 'edu-epitalon', 'thymogen', 'vilon', 'pinealon',
  'chonluten', 'vesugen', 'bronchogen', 'thymulin'
);

UPDATE public.kb_peptides p
SET
  derived_from_peptide_id = d.id,
  updated_at = now()
FROM public.kb_peptides d
WHERE d.slug = 'epithalamin'
  AND p.slug IN ('epitalon', 'edu-epitalon');

UPDATE public.kb_peptides p
SET
  derived_from_peptide_id = d.id,
  updated_at = now()
FROM public.kb_peptides d
WHERE d.slug = 'thymalin'
  AND p.slug = 'thymogen';

UPDATE public.kb_peptides SET
  provenance_disclosure = 'The published research on this compound comes overwhelmingly from a single research institution and its affiliated laboratories, published largely in Russian-language or Russian-affiliated journals. Independent replication outside that group is limited. This does not mean the findings are wrong. It means they have not passed through the independent replication that is normally required before a finding is treated as established.',
  updated_at = now()
WHERE slug IN ('cortexin', 'cerebrolysin')
  AND (provenance_disclosure IS NULL OR provenance_disclosure = '');

-- 7. Quarantine any existing extract/synthetic publication cross-links
WITH bad AS (
  SELECT DISTINCT a.id AS link_id, a.peptide_id, a.publication_id
  FROM public.kb_peptide_evidence_links a
  JOIN public.kb_peptides pa ON pa.id = a.peptide_id
  JOIN public.kb_peptide_evidence_links b
    ON b.publication_id = a.publication_id
   AND b.peptide_id <> a.peptide_id
  JOIN public.kb_peptides pb ON pb.id = b.peptide_id
  WHERE a.publication_id IS NOT NULL
    AND pa.preparation_class IN ('tissue_extract', 'synthetic_defined')
    AND pb.preparation_class IN ('tissue_extract', 'synthetic_defined')
    AND pa.preparation_class <> pb.preparation_class
)
INSERT INTO public.kb_evidence_link_rejections (peptide_id, publication_id, reason, details)
SELECT peptide_id, publication_id, 'preparation_class_cross_link_quarantine',
       jsonb_build_object('link_id', link_id, 'action', 'delete')
FROM bad;

DELETE FROM public.kb_peptide_evidence_links l
USING (
  SELECT DISTINCT a.id AS link_id
  FROM public.kb_peptide_evidence_links a
  JOIN public.kb_peptides pa ON pa.id = a.peptide_id
  JOIN public.kb_peptide_evidence_links b
    ON b.publication_id = a.publication_id
   AND b.peptide_id <> a.peptide_id
  JOIN public.kb_peptides pb ON pb.id = b.peptide_id
  WHERE a.publication_id IS NOT NULL
    AND pa.preparation_class IN ('tissue_extract', 'synthetic_defined')
    AND pb.preparation_class IN ('tissue_extract', 'synthetic_defined')
    AND pa.preparation_class <> pb.preparation_class
) q
WHERE l.id = q.link_id;
