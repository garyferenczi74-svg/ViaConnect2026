-- Prompt 221 Phase 1: twelve-collection knowledge corpus spine.
-- Append-only. Does NOT seed competitive crawl data.
-- pgvector already enabled (Prompt 208). Do not apply until 219N soak PASS
-- unless Gary accepts freeze break. No user-specific rows (platform knowledge).

-- ---------------------------------------------------------------------------
-- A1. kb_collections
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  owning_agent text NOT NULL,
  co_owner_agents text[] NOT NULL DEFAULT '{}',
  source_classes text[] NOT NULL DEFAULT '{}',
  cadence_class text NOT NULL CHECK (cadence_class IN (
    'studies_12h', 'weekly', 'popularity_weekly', 'derived_on_upstream_change'
  )),
  gate_profile text NOT NULL CHECK (gate_profile IN (
    'standard', 'lex_lane', 'practitioner_flagged'
  )),
  seeding_phase smallint NOT NULL CHECK (seeding_phase BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'seeding', 'live', 'paused'
  )),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_collections_status_idx
  ON public.kb_collections (status);
CREATE INDEX IF NOT EXISTS kb_collections_phase_idx
  ON public.kb_collections (seeding_phase);

ALTER TABLE public.kb_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_collections_select ON public.kb_collections;
CREATE POLICY kb_collections_select ON public.kb_collections
  FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- A2. kb_items (universal spine)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_collection_id uuid NOT NULL REFERENCES public.kb_collections(id),
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  source_urls text[] NOT NULL DEFAULT '{}',
  retrieval_timestamp timestamptz,
  content_hash text NOT NULL,
  evidence_grade text CHECK (evidence_grade IS NULL OR evidence_grade IN ('A','B','C','D','E')),
  extraction_confidence smallint CHECK (
    extraction_confidence IS NULL OR (extraction_confidence BETWEEN 0 AND 100)
  ),
  gate_status text NOT NULL DEFAULT 'pending' CHECK (gate_status IN (
    'pending', 'approved', 'rejected', 'lex_review', 'lex_approved'
  )),
  gate_decided_at timestamptz,
  gate_reason text,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_type text NOT NULL CHECK (payload_type IN (
    'product', 'study', 'association', 'delivery_tech',
    'genetic_test', 'synthesis', 'education_entry'
  )),
  payload_ref uuid,
  practitioner_depth boolean NOT NULL DEFAULT false,
  consumer_safe boolean NOT NULL DEFAULT true,
  superseded_by uuid REFERENCES public.kb_items(id),
  last_verified_at timestamptz,
  embedding extensions.vector(768),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kb_items_content_hash_unique UNIQUE (content_hash)
);

CREATE INDEX IF NOT EXISTS kb_items_collection_gate_created_idx
  ON public.kb_items (primary_collection_id, gate_status, created_at DESC);
CREATE INDEX IF NOT EXISTS kb_items_gate_status_idx
  ON public.kb_items (gate_status);
CREATE INDEX IF NOT EXISTS kb_items_payload_type_idx
  ON public.kb_items (payload_type);
CREATE INDEX IF NOT EXISTS kb_items_provenance_gin
  ON public.kb_items USING gin (provenance);
CREATE INDEX IF NOT EXISTS kb_items_embedding_hnsw
  ON public.kb_items USING hnsw (embedding extensions.vector_cosine_ops);

-- Optional keyword assist for hybrid search
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS kb_items_title_trgm
    ON public.kb_items USING gin (title gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.kb_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_items_select_live ON public.kb_items;
CREATE POLICY kb_items_select_live ON public.kb_items
  FOR SELECT TO authenticated
  USING (
    gate_status IN ('approved', 'lex_approved')
    AND (consumer_safe = true OR practitioner_depth = true)
  );

-- Junction: multi-collection membership without duplication
CREATE TABLE IF NOT EXISTS public.kb_item_collections (
  item_id uuid NOT NULL REFERENCES public.kb_items(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.kb_collections(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, collection_id)
);

ALTER TABLE public.kb_item_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_item_collections_select ON public.kb_item_collections;
CREATE POLICY kb_item_collections_select ON public.kb_item_collections
  FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- A3. kb_canonical_ingredients + kb_products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_canonical_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL UNIQUE,
  synonyms text[] NOT NULL DEFAULT '{}',
  class text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_canonical_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_canonical_ingredients_select ON public.kb_canonical_ingredients;
CREATE POLICY kb_canonical_ingredients_select ON public.kb_canonical_ingredients
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.kb_products (
  item_id uuid PRIMARY KEY REFERENCES public.kb_items(id) ON DELETE CASCADE,
  brand text NOT NULL,
  product_name text NOT NULL,
  category text,
  subcategory text,
  ingredient_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_technology text CHECK (delivery_technology IS NULL OR delivery_technology IN (
    'liposomal', 'micellar', 'standard', 'softgel', 'powder',
    'gummy', 'sublingual', 'other'
  )),
  serving_size text,
  servings_per_container numeric,
  list_price numeric,
  currency text DEFAULT 'USD',
  price_per_serving numeric,
  price_captured_at timestamptz,
  label_claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  retailer_or_brand_page text,
  availability_note text,
  is_via_cura boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS kb_products_brand_name_idx
  ON public.kb_products (brand, product_name);
CREATE INDEX IF NOT EXISTS kb_products_category_idx
  ON public.kb_products (category);

ALTER TABLE public.kb_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_products_select ON public.kb_products;
CREATE POLICY kb_products_select ON public.kb_products
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = item_id
        AND i.gate_status IN ('approved', 'lex_approved')
    )
  );

-- ---------------------------------------------------------------------------
-- A4. kb_genetic_tests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_genetic_tests (
  item_id uuid PRIMARY KEY REFERENCES public.kb_items(id) ON DELETE CASCADE,
  provider text NOT NULL,
  test_name text NOT NULL,
  test_type text CHECK (test_type IS NULL OR test_type IN (
    'consumer_array', 'WGS', 'WES', 'targeted_panel', 'clinical'
  )),
  panel_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  sample_type text,
  methodology text,
  turnaround_days integer,
  list_price numeric,
  currency text DEFAULT 'USD',
  report_features text[] NOT NULL DEFAULT '{}',
  raw_data_export boolean NOT NULL DEFAULT false,
  raw_data_format text,
  regions_available text[] NOT NULL DEFAULT '{}',
  genex360_overlap jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  last_verified_at timestamptz
);

ALTER TABLE public.kb_genetic_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_genetic_tests_select ON public.kb_genetic_tests;
CREATE POLICY kb_genetic_tests_select ON public.kb_genetic_tests
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = item_id AND i.gate_status IN ('approved', 'lex_approved')
    )
  );

-- ---------------------------------------------------------------------------
-- A5. kb_snp_associations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_snp_associations (
  item_id uuid PRIMARY KEY REFERENCES public.kb_items(id) ON DELETE CASCADE,
  rsid text NOT NULL,
  gene text,
  domain text NOT NULL CHECK (domain IN (
    'nutritional', 'hormonal', 'peptide_response'
  )),
  association_summary text NOT NULL,
  effect_direction text,
  effect_magnitude_note text,
  population_notes text,
  evidence_grade text NOT NULL CHECK (evidence_grade IN ('A','B','C','D','E')),
  citing_study_item_ids uuid[] NOT NULL DEFAULT '{}',
  review_status text NOT NULL DEFAULT 'pending',
  consumer_safe boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS kb_snp_associations_rsid_idx
  ON public.kb_snp_associations (rsid);
CREATE INDEX IF NOT EXISTS kb_snp_associations_domain_idx
  ON public.kb_snp_associations (domain);

ALTER TABLE public.kb_snp_associations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_snp_associations_select ON public.kb_snp_associations;
CREATE POLICY kb_snp_associations_select ON public.kb_snp_associations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = item_id AND i.gate_status IN ('approved', 'lex_approved')
    )
  );

-- ---------------------------------------------------------------------------
-- A6. kb_studies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_studies (
  item_id uuid PRIMARY KEY REFERENCES public.kb_items(id) ON DELETE CASCADE,
  pmid text,
  doi text,
  study_type text CHECK (study_type IS NULL OR study_type IN (
    'RCT', 'meta_analysis', 'systematic_review', 'cohort',
    'case_control', 'animal', 'in_vitro', 'review'
  )),
  population_n integer,
  population_description text,
  intervention text,
  comparator text,
  outcomes_summary text,
  effect_direction text,
  is_bioavailability boolean NOT NULL DEFAULT false,
  bioavailability_metrics jsonb,
  publication_date date,
  journal text,
  full_text_available boolean NOT NULL DEFAULT false,
  full_text_item_ref uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS kb_studies_pmid_unique
  ON public.kb_studies (pmid) WHERE pmid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS kb_studies_doi_unique
  ON public.kb_studies (doi) WHERE doi IS NOT NULL;
CREATE INDEX IF NOT EXISTS kb_studies_bioavailability_idx
  ON public.kb_studies (is_bioavailability) WHERE is_bioavailability = true;

ALTER TABLE public.kb_studies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_studies_select ON public.kb_studies;
CREATE POLICY kb_studies_select ON public.kb_studies
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = item_id AND i.gate_status IN ('approved', 'lex_approved')
    )
  );

-- ---------------------------------------------------------------------------
-- A7. kb_delivery_tech
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_delivery_tech (
  item_id uuid PRIMARY KEY REFERENCES public.kb_items(id) ON DELETE CASCADE,
  technology text NOT NULL,
  mechanism_summary text,
  applicable_ingredient_classes text[] NOT NULL DEFAULT '{}',
  stability_evidence_ids uuid[] NOT NULL DEFAULT '{}',
  absorption_evidence_ids uuid[] NOT NULL DEFAULT '{}',
  known_implementations uuid[] NOT NULL DEFAULT '{}',
  via_cura_relevance_note text
);

ALTER TABLE public.kb_delivery_tech ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_delivery_tech_select ON public.kb_delivery_tech;
CREATE POLICY kb_delivery_tech_select ON public.kb_delivery_tech
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = item_id AND i.gate_status IN ('approved', 'lex_approved')
    )
  );

-- ---------------------------------------------------------------------------
-- A8. kb_syntheses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_syntheses (
  item_id uuid PRIMARY KEY REFERENCES public.kb_items(id) ON DELETE CASCADE,
  synthesis_type text NOT NULL CHECK (synthesis_type IN (
    'popularity_ranking', 'formulation_comparison', 'sku_competitive_comparison'
  )),
  subject text NOT NULL,
  methodology jsonb NOT NULL DEFAULT '{}'::jsonb,
  inputs_item_ids uuid[] NOT NULL DEFAULT '{}',
  body_structured jsonb NOT NULL DEFAULT '{}'::jsonb,
  narrative_summary text,
  valid_until timestamptz,
  lex_review_status text CHECK (lex_review_status IS NULL OR lex_review_status IN (
    'pending', 'approved', 'rejected', 'needs_revision'
  )),
  lex_reviewed_at timestamptz
);

ALTER TABLE public.kb_syntheses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_syntheses_select ON public.kb_syntheses;
CREATE POLICY kb_syntheses_select ON public.kb_syntheses
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = item_id AND i.gate_status IN ('approved', 'lex_approved')
    )
  );

-- ---------------------------------------------------------------------------
-- A9. history, Lex decisions, review queue, chunks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_items_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.kb_items(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  changed_fields text[] NOT NULL DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_items_history_item_recorded_idx
  ON public.kb_items_history (item_id, recorded_at DESC);

ALTER TABLE public.kb_items_history ENABLE ROW LEVEL SECURITY;
-- Admin/service only: no authenticated select policy (audit internal)

CREATE TABLE IF NOT EXISTS public.kb_lex_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.kb_items(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN (
    'approved', 'rejected', 'needs_revision'
  )),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  decided_by text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_lex_decisions_item_idx
  ON public.kb_lex_decisions (item_id, decided_at DESC);

ALTER TABLE public.kb_lex_decisions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.kb_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.kb_items(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN (
    'low_confidence', 'near_duplicate', 'unknown_fields', 'manual'
  )),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'cleared', 'rejected'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz,
  cleared_by text
);

CREATE INDEX IF NOT EXISTS kb_review_queue_status_idx
  ON public.kb_review_queue (status, created_at DESC);

ALTER TABLE public.kb_review_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.kb_item_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.kb_items(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  embedding extensions.vector(768),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS kb_item_chunks_embedding_hnsw
  ON public.kb_item_chunks USING hnsw (embedding extensions.vector_cosine_ops);

ALTER TABLE public.kb_item_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kb_item_chunks_select ON public.kb_item_chunks;
CREATE POLICY kb_item_chunks_select ON public.kb_item_chunks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.kb_items i
      WHERE i.id = item_id AND i.gate_status IN ('approved', 'lex_approved')
    )
  );

COMMENT ON TABLE public.kb_collections IS 'Prompt 221: twelve collection registry. Seeding status planned until phase gates.';
COMMENT ON TABLE public.kb_items IS 'Prompt 221: universal KB spine. Live writes only via promote_kb_item.';
COMMENT ON TABLE public.kb_lex_decisions IS 'Prompt 221: mandatory Lex lane for sku_competitive_comparison (C3).';
