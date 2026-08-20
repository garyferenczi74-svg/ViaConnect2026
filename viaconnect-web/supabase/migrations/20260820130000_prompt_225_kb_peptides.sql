-- Prompt 225: Knowledge Base Collection 14 Peptide Education Database (schema).
-- Append-only. Models C13 kb_hormones. No monograph seed in this file.
-- consumer_safe defaults false until Marshall. practitioner_depth forbids dose keys.

-- ---------------------------------------------------------------------------
-- Extend kb_items.payload_type to include peptide
-- ---------------------------------------------------------------------------
ALTER TABLE public.kb_items
  DROP CONSTRAINT IF EXISTS kb_items_payload_type_check;

ALTER TABLE public.kb_items
  ADD CONSTRAINT kb_items_payload_type_check
  CHECK (payload_type IN (
    'product', 'study', 'association', 'delivery_tech',
    'genetic_test', 'synthesis', 'education_entry', 'hormone', 'peptide'
  ));

-- ---------------------------------------------------------------------------
-- Promote existing peptide_education collection metadata (C14 typed era)
-- ---------------------------------------------------------------------------
UPDATE public.kb_collections
SET
  display_name = 'Peptide education database',
  owning_agent = 'thanos',
  co_owner_agents = ARRAY[
    'hounddog', 'sherlock', 'elysium', 'hannah', 'marshall', 'lex', 'jeffery'
  ]::text[],
  source_classes = ARRAY[
    'pubmed', 'firecrawl_allowlist', 'fda', 'wada', 'health_canada',
    'ema', 'mhra', 'tga', 'clinicaltrials', 'internal_derivation'
  ]::text[],
  cadence_class = 'weekly',
  gate_profile = 'lex_lane',
  seeding_phase = 3,
  status = 'planned'
WHERE slug = 'peptide_education';

INSERT INTO public.kb_collections (
  slug, display_name, owning_agent, co_owner_agents, source_classes,
  cadence_class, gate_profile, seeding_phase, status
)
SELECT
  'peptide_education',
  'Peptide education database',
  'thanos',
  ARRAY[
    'hounddog', 'sherlock', 'elysium', 'hannah', 'marshall', 'lex', 'jeffery'
  ]::text[],
  ARRAY[
    'pubmed', 'firecrawl_allowlist', 'fda', 'wada', 'health_canada',
    'ema', 'mhra', 'tga', 'clinicaltrials', 'internal_derivation'
  ]::text[],
  'weekly',
  'lex_lane',
  3,
  'planned'
WHERE NOT EXISTS (
  SELECT 1 FROM public.kb_collections WHERE slug = 'peptide_education'
);

-- ---------------------------------------------------------------------------
-- kb_peptides (typed monograph spine)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_peptides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_item_id uuid NOT NULL UNIQUE REFERENCES public.kb_items(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  canonical_name text NOT NULL,
  display_name text NOT NULL,
  molecular_class text NOT NULL CHECK (molecular_class IN (
    'peptide', 'peptide_fragment', 'peptide_analog', 'peptidomimetic',
    'protein', 'glycoprotein', 'small_molecule', 'amino_acid_derivative',
    'cofactor', 'biological_mixture', 'monoclonal_antibody', 'topical_cosmetic_peptide'
  )),
  is_peptide boolean NOT NULL DEFAULT true,
  sequence_notation text,
  residue_count integer,
  parent_molecule text,
  category text NOT NULL,
  secondary_categories text[] NOT NULL DEFAULT '{}',
  mechanism_summary text NOT NULL DEFAULT '',
  mechanism_detail text NOT NULL DEFAULT '',
  receptor_targets text[] NOT NULL DEFAULT '{}',
  pathway_tags text[] NOT NULL DEFAULT '{}',
  researched_effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_grade_overall text NOT NULL DEFAULT 'E'
    CHECK (evidence_grade_overall IN ('A', 'B', 'C', 'D', 'E')),
  human_data_exists boolean NOT NULL DEFAULT false,
  strongest_model text NOT NULL DEFAULT 'anecdotal_only'
    CHECK (strongest_model IN (
      'human_rct', 'human_controlled', 'human_observational',
      'animal', 'ex_vivo', 'in_vitro', 'anecdotal_only'
    )),
  evidence_summary text NOT NULL DEFAULT '',
  fda_status text NOT NULL DEFAULT 'unknown'
    CHECK (fda_status IN (
      'approved', 'approved_other_indication', 'investigational',
      'not_approved', 'withdrawn', 'unapproved_marketed', 'unknown'
    )),
  fda_503a_category text NOT NULL DEFAULT 'unknown'
    CHECK (fda_503a_category IN (
      'category_1', 'category_2', 'category_3', 'not_nominated',
      'not_applicable', 'unknown'
    )),
  regulatory_status jsonb NOT NULL DEFAULT '{}'::jsonb,
  controlled_substance boolean NOT NULL DEFAULT false,
  wada_status text NOT NULL DEFAULT 'unknown'
    CHECK (wada_status IN (
      'prohibited_all_times', 'prohibited_in_competition',
      'monitoring_program', 'not_prohibited', 'captured_by_s0', 'unknown'
    )),
  wada_class text,
  half_life_class text NOT NULL DEFAULT 'not_applicable'
    CHECK (half_life_class IN (
      'ultra_short', 'short', 'intermediate', 'long', 'depot', 'not_applicable'
    )),
  routes_studied text[] NOT NULL DEFAULT '{}',
  risk_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  sourcing_risk_notes text NOT NULL DEFAULT '',
  misconception_notes text NOT NULL DEFAULT '',
  via_cura_adjacency jsonb,
  exclusion_tier text NOT NULL DEFAULT 'educational'
    CHECK (exclusion_tier IN (
      'educational', 'restricted', 'excluded_adverse_reference'
    )),
  exclusion_reason text,
  consumer_safe boolean NOT NULL DEFAULT false,
  practitioner_depth jsonb,
  marshall_status text NOT NULL DEFAULT 'pending'
    CHECK (marshall_status IN ('pending', 'approved', 'rejected')),
  lex_status text NOT NULL DEFAULT 'not_required'
    CHECK (lex_status IN ('not_required', 'pending', 'cleared', 'blocked')),
  jeffery_review_id uuid,
  last_reviewed_at timestamptz,
  superseded_by uuid REFERENCES public.kb_peptides(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kb_peptides_exclusion_reason_required CHECK (
    exclusion_tier = 'educational' OR (
      exclusion_reason IS NOT NULL AND length(trim(exclusion_reason)) > 0
    )
  ),
  -- Schema-level dose prohibition (Prompt 225 Section 2.1 / G3)
  CONSTRAINT kb_peptides_practitioner_depth_no_dose CHECK (
    practitioner_depth IS NULL
    OR NOT (
      practitioner_depth ?| ARRAY[
        'dose', 'dosage', 'dosing', 'amount',
        'frequency', 'cycle', 'titration', 'reconstitution'
      ]
    )
  )
);

CREATE INDEX IF NOT EXISTS kb_peptides_slug_idx
  ON public.kb_peptides (slug);
CREATE INDEX IF NOT EXISTS kb_peptides_category_idx
  ON public.kb_peptides (category);
CREATE INDEX IF NOT EXISTS kb_peptides_exclusion_tier_idx
  ON public.kb_peptides (exclusion_tier);
CREATE INDEX IF NOT EXISTS kb_peptides_consumer_safe_idx
  ON public.kb_peptides (consumer_safe)
  WHERE consumer_safe = true;
CREATE INDEX IF NOT EXISTS kb_peptides_molecular_class_idx
  ON public.kb_peptides (molecular_class);
CREATE INDEX IF NOT EXISTS kb_peptides_secondary_categories_gin
  ON public.kb_peptides USING gin (secondary_categories);
CREATE INDEX IF NOT EXISTS kb_peptides_pathway_tags_gin
  ON public.kb_peptides USING gin (pathway_tags);
CREATE INDEX IF NOT EXISTS kb_peptides_receptor_targets_gin
  ON public.kb_peptides USING gin (receptor_targets);
CREATE INDEX IF NOT EXISTS kb_peptides_researched_effects_gin
  ON public.kb_peptides USING gin (researched_effects);

ALTER TABLE public.kb_peptides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_peptides_select_consumer ON public.kb_peptides;
CREATE POLICY kb_peptides_select_consumer ON public.kb_peptides
  FOR SELECT TO authenticated
  USING (
    consumer_safe = true
    AND exclusion_tier = 'educational'
    AND EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = kb_item_id
        AND i.gate_status IN ('approved', 'lex_approved')
        AND COALESCE(i.jeffery_verdict, 'pending') = 'approved'
        AND i.consumer_safe = true
    )
  );

COMMENT ON TABLE public.kb_peptides IS
  'Prompt 225 C14: peptide education monographs. consumer_safe defaults false until Marshall. practitioner_depth forbids dose keys by CHECK.';

COMMENT ON COLUMN public.kb_peptides.wada_status IS
  'Seed hints only until Hound Dog verifies against current WADA list; unverified must not render as not_prohibited without review.';

-- ---------------------------------------------------------------------------
-- kb_peptide_synonyms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_peptide_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id uuid NOT NULL REFERENCES public.kb_peptides(id) ON DELETE CASCADE,
  synonym text NOT NULL,
  synonym_type text NOT NULL CHECK (synonym_type IN (
    'trade_name', 'code_name', 'inn', 'community_name', 'deprecated', 'misnomer'
  )),
  is_primary_search_term boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (peptide_id, synonym, synonym_type)
);

CREATE INDEX IF NOT EXISTS kb_peptide_synonyms_synonym_idx
  ON public.kb_peptide_synonyms (lower(synonym));

ALTER TABLE public.kb_peptide_synonyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_peptide_synonyms_select ON public.kb_peptide_synonyms;
CREATE POLICY kb_peptide_synonyms_select ON public.kb_peptide_synonyms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kb_peptides p
      WHERE p.id = peptide_id
        AND p.consumer_safe = true
        AND p.exclusion_tier = 'educational'
    )
  );

COMMENT ON TABLE public.kb_peptide_synonyms IS
  'Prompt 225: load-bearing synonym map for peptide monographs.';

-- ---------------------------------------------------------------------------
-- kb_peptide_stacks (not compounds)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_peptide_stacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  component_peptide_ids uuid[] NOT NULL DEFAULT '{}',
  community_rationale text NOT NULL DEFAULT '',
  evidence_status text NOT NULL DEFAULT 'no_combination_data'
    CHECK (evidence_status IN (
      'no_combination_data',
      'preclinical_combination_data',
      'human_combination_data'
    )),
  interaction_notes text NOT NULL DEFAULT '',
  consumer_safe boolean NOT NULL DEFAULT false,
  exclusion_tier text NOT NULL DEFAULT 'educational'
    CHECK (exclusion_tier IN (
      'educational', 'restricted', 'excluded_adverse_reference'
    )),
  marshall_status text NOT NULL DEFAULT 'pending'
    CHECK (marshall_status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_peptide_stacks_consumer_safe_idx
  ON public.kb_peptide_stacks (consumer_safe)
  WHERE consumer_safe = true;

ALTER TABLE public.kb_peptide_stacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_peptide_stacks_select_consumer ON public.kb_peptide_stacks;
CREATE POLICY kb_peptide_stacks_select_consumer ON public.kb_peptide_stacks
  FOR SELECT TO authenticated
  USING (
    consumer_safe = true
    AND exclusion_tier = 'educational'
    AND marshall_status = 'approved'
  );

COMMENT ON TABLE public.kb_peptide_stacks IS
  'Prompt 225: stack registry. Default evidence_status is no_combination_data.';

-- ---------------------------------------------------------------------------
-- kb_peptide_snp_links (Collection 14 <-> Collection 11)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_peptide_snp_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id uuid NOT NULL REFERENCES public.kb_peptides(id) ON DELETE CASCADE,
  snp_association_id uuid,
  relationship_type text NOT NULL CHECK (relationship_type IN (
    'receptor_variant', 'pathway_variant', 'clearance_variant',
    'safety_relevant', 'commonly_overclaimed'
  )),
  direction text NOT NULL CHECK (direction IN (
    'may_increase_response', 'may_decrease_response',
    'safety_consideration', 'insufficient_evidence'
  )),
  evidence_grade text NOT NULL DEFAULT 'E'
    CHECK (evidence_grade IN ('A', 'B', 'C', 'D', 'E')),
  citation_ids text[] NOT NULL DEFAULT '{}',
  consumer_safe boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_peptide_snp_links_peptide_idx
  ON public.kb_peptide_snp_links (peptide_id);
CREATE INDEX IF NOT EXISTS kb_peptide_snp_links_consumer_safe_idx
  ON public.kb_peptide_snp_links (consumer_safe)
  WHERE consumer_safe = true;

ALTER TABLE public.kb_peptide_snp_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_peptide_snp_links_select_consumer ON public.kb_peptide_snp_links;
CREATE POLICY kb_peptide_snp_links_select_consumer ON public.kb_peptide_snp_links
  FOR SELECT TO authenticated
  USING (
    consumer_safe = true
    AND EXISTS (
      SELECT 1 FROM public.kb_peptides p
      WHERE p.id = peptide_id
        AND p.consumer_safe = true
        AND p.exclusion_tier = 'educational'
    )
  );

COMMENT ON TABLE public.kb_peptide_snp_links IS
  'Prompt 225: genetic relevance links. Never framed as safety clearance or recommendation.';

-- ---------------------------------------------------------------------------
-- kb_peptide_regulatory_events (append-only audit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_peptide_regulatory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  peptide_id uuid NOT NULL REFERENCES public.kb_peptides(id) ON DELETE CASCADE,
  jurisdiction text NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  effective_date date,
  source_citation_id text,
  detected_by text NOT NULL,
  jeffery_review_id uuid,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_peptide_regulatory_events_peptide_idx
  ON public.kb_peptide_regulatory_events (peptide_id, created_at DESC);
CREATE INDEX IF NOT EXISTS kb_peptide_regulatory_events_pending_idx
  ON public.kb_peptide_regulatory_events (jeffery_review_id)
  WHERE applied_at IS NULL;

ALTER TABLE public.kb_peptide_regulatory_events ENABLE ROW LEVEL SECURITY;

-- Regulatory event rows are audit; authenticated read limited to non-sensitive metadata
-- via service role / admin paths. No broad consumer SELECT.
DROP POLICY IF EXISTS kb_peptide_regulatory_events_deny_consumer ON public.kb_peptide_regulatory_events;
CREATE POLICY kb_peptide_regulatory_events_deny_consumer ON public.kb_peptide_regulatory_events
  FOR SELECT TO authenticated
  USING (false);

COMMENT ON TABLE public.kb_peptide_regulatory_events IS
  'Prompt 225: append-only regulatory change trail. Apply only after Jeffery review (G7).';
