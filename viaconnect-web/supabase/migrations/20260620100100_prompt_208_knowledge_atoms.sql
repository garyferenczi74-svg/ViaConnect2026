-- Prompt 208 v2, Phase 1 (Gate A): the graded knowledge corpus core.
-- Append-only. Two tables: knowledge_atoms (one sourced claim per row) and
-- snp_protocol_rules (variant+genotype -> action). RLS: service-role writes
-- (service_role bypasses RLS); authenticated reads ONLY published rows.

-- ---------------------------------------------------------------------------
-- knowledge_atoms (spec 6.1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.knowledge_atoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL CHECK (domain IN (
    'methylation','nutrition','hormones','epigenetics','peptides','cannabinoid','longevity')),
  claim text NOT NULL,
  mechanism text,
  evidence_tier smallint NOT NULL CHECK (evidence_tier IN (1,2,3)),
  source_type text,
  source_authority text CHECK (source_authority IN (
    'pubmed','consensus','clinicaltrials','internal_study','open_web')),
  source_url text,
  citation text,
  snp_refs text[] NOT NULL DEFAULT '{}',
  nutrient_refs text[] NOT NULL DEFAULT '{}',
  supplement_refs text[] NOT NULL DEFAULT '{}',
  contraindications jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN (
    'draft','in_review','published','rejected','retired')),
  reviewed_by text,
  confidence numeric,
  embedding extensions.vector(768),
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_atoms_domain_status_idx
  ON public.knowledge_atoms (domain, review_status);
CREATE INDEX IF NOT EXISTS knowledge_atoms_status_idx
  ON public.knowledge_atoms (review_status);
CREATE INDEX IF NOT EXISTS knowledge_atoms_snp_refs_gin
  ON public.knowledge_atoms USING gin (snp_refs);
-- HNSW for cosine-distance dedup at ingestion (no training data needed; empty start).
CREATE INDEX IF NOT EXISTS knowledge_atoms_embedding_hnsw
  ON public.knowledge_atoms USING hnsw (embedding extensions.vector_cosine_ops);

ALTER TABLE public.knowledge_atoms ENABLE ROW LEVEL SECURITY;

-- Authenticated callers read ONLY published atoms. No write policy => writes are
-- service-role only (service_role bypasses RLS).
DROP POLICY IF EXISTS knowledge_atoms_select_published ON public.knowledge_atoms;
CREATE POLICY knowledge_atoms_select_published
  ON public.knowledge_atoms FOR SELECT TO authenticated
  USING (review_status = 'published');

-- ---------------------------------------------------------------------------
-- snp_protocol_rules (spec 6.2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.snp_protocol_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rsid text NOT NULL,
  gene text,
  genotype_match text NOT NULL,
  effect text,
  action_type text NOT NULL CHECK (action_type IN (
    'prefer_form','avoid_intake','dose_context','monitor_biomarker','contraindicate','practitioner_only')),
  recommended_form text,
  flagged_form text,
  avoid_list text[] NOT NULL DEFAULT '{}',
  linked_atom_ids uuid[] NOT NULL DEFAULT '{}',
  evidence_tier smallint CHECK (evidence_tier IN (1,2,3)),
  sensitive boolean NOT NULL DEFAULT false,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN (
    'draft','in_review','published','rejected','retired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snp_protocol_rules_rsid_idx
  ON public.snp_protocol_rules (rsid);
CREATE INDEX IF NOT EXISTS snp_protocol_rules_status_idx
  ON public.snp_protocol_rules (review_status);

ALTER TABLE public.snp_protocol_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS snp_protocol_rules_select_published ON public.snp_protocol_rules;
CREATE POLICY snp_protocol_rules_select_published
  ON public.snp_protocol_rules FOR SELECT TO authenticated
  USING (review_status = 'published');
