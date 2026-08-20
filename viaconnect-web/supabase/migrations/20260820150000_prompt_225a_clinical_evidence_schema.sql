-- Prompt 225a: clinical evidence schema (trials, publications, links, query terms, source status).
-- Append-only. Dose values must never be stored (enforced in application redaction + CI).
-- ICTRP ships pending_access until WHO credentials exist.

-- ---------------------------------------------------------------------------
-- Extend kb_items.payload_type for trial / publication evidence
-- ---------------------------------------------------------------------------
ALTER TABLE public.kb_items
  DROP CONSTRAINT IF EXISTS kb_items_payload_type_check;

ALTER TABLE public.kb_items
  ADD CONSTRAINT kb_items_payload_type_check
  CHECK (payload_type IN (
    'product', 'study', 'association', 'delivery_tech',
    'genetic_test', 'synthesis', 'education_entry',
    'hormone', 'competitor_app', 'peptide',
    'clinical_trial', 'publication'
  ));

-- ---------------------------------------------------------------------------
-- kb_trials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_item_id uuid NOT NULL REFERENCES public.kb_items(id) ON DELETE CASCADE,
  canonical_trial_id text NOT NULL UNIQUE,
  primary_registry text NOT NULL
    CHECK (primary_registry IN (
      'clinicaltrials_gov', 'eu_ctis', 'eudract', 'isrctn', 'anzctr',
      'chictr', 'ctri', 'jprn', 'irct', 'other'
    )),
  registry_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  utn text,
  brief_title text NOT NULL DEFAULT '',
  official_title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'unknown'
    CHECK (status IN (
      'not_yet_recruiting', 'recruiting', 'active_not_recruiting',
      'completed', 'terminated', 'suspended', 'withdrawn', 'unknown'
    )),
  status_reason text,
  phase text NOT NULL DEFAULT 'unknown'
    CHECK (phase IN (
      'early_phase_1', 'phase_1', 'phase_2', 'phase_3', 'phase_4',
      'not_applicable', 'unknown'
    )),
  study_type text NOT NULL DEFAULT 'interventional'
    CHECK (study_type IN ('interventional', 'observational', 'expanded_access')),
  allocation text,
  masking text,
  intervention_model text,
  enrollment_count integer,
  enrollment_type text
    CHECK (enrollment_type IS NULL OR enrollment_type IN ('actual', 'estimated')),
  conditions text[] NOT NULL DEFAULT '{}',
  intervention_names text[] NOT NULL DEFAULT '{}',
  arm_count integer NOT NULL DEFAULT 0,
  has_comparator boolean NOT NULL DEFAULT false,
  comparator_type text NOT NULL DEFAULT 'unknown'
    CHECK (comparator_type IN ('placebo', 'active', 'none', 'unknown')),
  has_results_posted boolean NOT NULL DEFAULT false,
  primary_outcome_titles text[] NOT NULL DEFAULT '{}',
  outcome_direction text
    CHECK (outcome_direction IS NULL OR outcome_direction IN (
      'met_primary', 'did_not_meet_primary', 'mixed', 'not_reported', 'not_yet_reported'
    )),
  sponsor_name text,
  sponsor_class text
    CHECK (sponsor_class IS NULL OR sponsor_class IN (
      'industry', 'nih', 'other_gov', 'academic', 'individual'
    )),
  countries text[] NOT NULL DEFAULT '{}',
  start_date date,
  completion_date date,
  last_update_posted date,
  source_url text NOT NULL,
  dose_redaction_applied boolean NOT NULL DEFAULT false,
  raw_hash text NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kb_trials_enrollment_unknown_not_zero CHECK (
    enrollment_count IS NULL OR enrollment_count > 0
  )
);

CREATE INDEX IF NOT EXISTS kb_trials_registry_idx
  ON public.kb_trials (primary_registry, status);
CREATE INDEX IF NOT EXISTS kb_trials_results_idx
  ON public.kb_trials (has_results_posted)
  WHERE has_results_posted = true;
CREATE INDEX IF NOT EXISTS kb_trials_utn_idx
  ON public.kb_trials (utn)
  WHERE utn IS NOT NULL;
CREATE INDEX IF NOT EXISTS kb_trials_intervention_gin
  ON public.kb_trials USING gin (intervention_names);

ALTER TABLE public.kb_trials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_trials_select_authenticated ON public.kb_trials;
CREATE POLICY kb_trials_select_authenticated ON public.kb_trials
  FOR SELECT TO authenticated
  USING (
    dose_redaction_applied = true
    AND EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = kb_item_id
        AND i.gate_status IN ('approved', 'lex_approved')
        AND COALESCE(i.jeffery_verdict, 'pending') = 'approved'
    )
  );

COMMENT ON TABLE public.kb_trials IS
  'Prompt 225a: registry trials. dose_redaction_applied must be true before retrieval. No dose values stored.';

-- ---------------------------------------------------------------------------
-- kb_publications (sibling to 221 kb_studies; peptide-domain evidence)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_item_id uuid NOT NULL REFERENCES public.kb_items(id) ON DELETE CASCADE,
  kb_study_item_id uuid REFERENCES public.kb_items(id) ON DELETE SET NULL,
  pmid text,
  pmcid text,
  doi text,
  title text NOT NULL,
  journal text,
  pub_year integer,
  publication_types text[] NOT NULL DEFAULT '{}',
  mesh_terms text[] NOT NULL DEFAULT '{}',
  is_human boolean NOT NULL DEFAULT false,
  is_animal boolean NOT NULL DEFAULT false,
  is_in_vitro boolean NOT NULL DEFAULT false,
  sample_size integer,
  study_design text,
  linked_nct_ids text[] NOT NULL DEFAULT '{}',
  abstract_available boolean NOT NULL DEFAULT false,
  full_text_access text NOT NULL DEFAULT 'metadata_only'
    CHECK (full_text_access IN ('pmc_oa', 'publisher_oa', 'metadata_only')),
  facts_extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction_confidence numeric,
  source_url text NOT NULL,
  dose_redaction_applied boolean NOT NULL DEFAULT false,
  raw_hash text NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kb_publications_sample_unknown_not_zero CHECK (
    sample_size IS NULL OR sample_size > 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS kb_publications_pmid_unique
  ON public.kb_publications (pmid) WHERE pmid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS kb_publications_doi_unique
  ON public.kb_publications (doi) WHERE doi IS NOT NULL;
CREATE INDEX IF NOT EXISTS kb_publications_human_idx
  ON public.kb_publications (is_human) WHERE is_human = true;
CREATE INDEX IF NOT EXISTS kb_publications_types_gin
  ON public.kb_publications USING gin (publication_types);

ALTER TABLE public.kb_publications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_publications_select_authenticated ON public.kb_publications;
CREATE POLICY kb_publications_select_authenticated ON public.kb_publications
  FOR SELECT TO authenticated
  USING (
    dose_redaction_applied = true
    AND EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = kb_item_id
        AND i.gate_status IN ('approved', 'lex_approved')
        AND COALESCE(i.jeffery_verdict, 'pending') = 'approved'
    )
  );

COMMENT ON TABLE public.kb_publications IS
  'Prompt 225a: publication facts. Store paraphrased facts_extracted only, never abstract body. dose_redaction_applied required.';

COMMENT ON COLUMN public.kb_publications.facts_extracted IS
  'Paraphrased factual summary only. Never store publisher abstract text.';

-- ---------------------------------------------------------------------------
-- kb_peptide_evidence_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_peptide_evidence_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id uuid NOT NULL REFERENCES public.kb_peptides(id) ON DELETE CASCADE,
  trial_id uuid REFERENCES public.kb_trials(id) ON DELETE CASCADE,
  publication_id uuid REFERENCES public.kb_publications(id) ON DELETE CASCADE,
  relevance text NOT NULL
    CHECK (relevance IN (
      'direct_intervention', 'comparator_arm', 'mechanistic',
      'review_coverage', 'adverse_event_source'
    )),
  indication_context text NOT NULL DEFAULT '',
  supports_claim_id text,
  evidence_weight numeric,
  curated_by text NOT NULL DEFAULT 'thanos',
  jeffery_review_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kb_peptide_evidence_links_one_target CHECK (
    (trial_id IS NOT NULL AND publication_id IS NULL)
    OR (trial_id IS NULL AND publication_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS kb_peptide_evidence_links_peptide_idx
  ON public.kb_peptide_evidence_links (peptide_id);
CREATE UNIQUE INDEX IF NOT EXISTS kb_peptide_evidence_links_trial_uq
  ON public.kb_peptide_evidence_links (peptide_id, trial_id)
  WHERE trial_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS kb_peptide_evidence_links_pub_uq
  ON public.kb_peptide_evidence_links (peptide_id, publication_id)
  WHERE publication_id IS NOT NULL;

ALTER TABLE public.kb_peptide_evidence_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_peptide_evidence_links_select ON public.kb_peptide_evidence_links;
CREATE POLICY kb_peptide_evidence_links_select ON public.kb_peptide_evidence_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kb_peptides p
      WHERE p.id = peptide_id
        AND p.consumer_safe = true
        AND p.exclusion_tier = 'educational'
    )
    OR EXISTS (
      SELECT 1 FROM public.kb_peptides p
      WHERE p.id = peptide_id
    )
  );

-- ---------------------------------------------------------------------------
-- kb_evidence_query_terms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_evidence_query_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id uuid NOT NULL REFERENCES public.kb_peptides(id) ON DELETE CASCADE,
  term text NOT NULL,
  term_source text NOT NULL
    CHECK (term_source IN (
      'canonical', 'inn', 'trade_name', 'code_name',
      'community_name', 'sequence_descriptor'
    )),
  source_system text NOT NULL
    CHECK (source_system IN ('ctgov', 'ictrp', 'pubmed')),
  is_active boolean NOT NULL DEFAULT true,
  precision_score numeric,
  last_run_at timestamptz,
  yield_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS kb_evidence_query_terms_uq
  ON public.kb_evidence_query_terms (peptide_id, term, source_system);
CREATE INDEX IF NOT EXISTS kb_evidence_query_terms_active_idx
  ON public.kb_evidence_query_terms (source_system, is_active)
  WHERE is_active = true;

ALTER TABLE public.kb_evidence_query_terms ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- kb_ingest_source_status (Hannah coverage disclosure)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_ingest_source_status (
  source_system text PRIMARY KEY
    CHECK (source_system IN ('ctgov', 'ictrp', 'pubmed', 'firecrawl_oa', 'regulatory_watch')),
  status text NOT NULL
    CHECK (status IN ('live', 'pending_access', 'degraded', 'blocked')),
  reason text NOT NULL DEFAULT '',
  last_successful_run timestamptz,
  coverage_note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_ingest_source_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_ingest_source_status_select ON public.kb_ingest_source_status;
CREATE POLICY kb_ingest_source_status_select ON public.kb_ingest_source_status
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.kb_ingest_source_status (source_system, status, reason, coverage_note)
VALUES
  (
    'ctgov',
    'live',
    'ClinicalTrials.gov API v2 REST. Public domain US government data.',
    'Covers studies registered on ClinicalTrials.gov (200+ countries represented). Not a substitute for ICTRP-only non-US primary registries.'
  ),
  (
    'ictrp',
    'pending_access',
    'WHO ICTRP requires credentialed SharePoint bulk access / crawling credentials. Gary action: request via ictrpinfo@who.int.',
    'Global registry coverage is incomplete until ICTRP credentials land. Trials registered only outside ClinicalTrials.gov (e.g. ChiCTR, CTRI, JPRN, some EU-only) may be missing.'
  ),
  (
    'pubmed',
    'live',
    'NCBI E-utilities primary. Firecrawl only for OA publisher full text not in PMC.',
    'Publication metadata and paraphrased facts only. Abstracts are not stored verbatim.'
  ),
  (
    'firecrawl_oa',
    'live',
    'Firecrawl reserved for OA full text and regulatory watch pages without APIs.',
    'Not used for CT.gov, PubMed metadata, or trialsearch.who.int.'
  ),
  (
    'regulatory_watch',
    'live',
    'FDA / WADA / Health Canada / MHRA / TGA watch per Prompt 225 Section 7.3.',
    'Separate from trial/publication corpus.'
  )
ON CONFLICT (source_system) DO UPDATE SET
  status = EXCLUDED.status,
  reason = EXCLUDED.reason,
  coverage_note = EXCLUDED.coverage_note,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Hard-block ICTRP Search Portal on authorities allowlist notes
-- (who.int parent would otherwise allow trialsearch.who.int via subdomain match)
-- ---------------------------------------------------------------------------
INSERT INTO public.authorities_sources (
  domain, label, source_kind, domain_tags, base_url, approval_status, approved_by, notes, is_active
)
VALUES (
  'trialsearch.who.int',
  'WHO ICTRP Search Portal (BLOCKED)',
  'registry',
  ARRAY['peptide', 'clinical', 'blocked'],
  'https://trialsearch.who.int',
  'rejected',
  '225a-lex-policy',
  'Prompt 225a: crawling requires WHO credentials; service currently unavailable. Do not Firecrawl. Use SharePoint bulk export when credentialed. Subdomain of who.int must not be crawled via parent allowlist inheritance; application deny list required.',
  false
)
ON CONFLICT (domain) DO UPDATE SET
  approval_status = 'rejected',
  is_active = false,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Discovery cursors for CT.gov peptide evidence
INSERT INTO public.discovery_cursors (source_key, topic_key, cursor_date, last_run_status, config)
VALUES
  ('ctgov', 'peptide-wave1', '2026-01-01', 'empty', '{"pageSize":100,"sort":"LastUpdatePostDate:desc"}'::jsonb),
  ('pubmed', 'peptide-wave1-evidence', '2026-01-01', 'empty', '{"retmax":20,"datetype":"edat"}'::jsonb)
ON CONFLICT (source_key, topic_key) DO NOTHING;
