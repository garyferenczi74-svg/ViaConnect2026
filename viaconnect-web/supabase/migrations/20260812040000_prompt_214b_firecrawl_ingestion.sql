-- Prompt 214b: Firecrawl ingestion foundation, topic registry, genomics ref, curation.
-- Append-only.

-- Topic registry (data-driven; not hardcoded query strings)
CREATE TABLE IF NOT EXISTS public.ingest_topic_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_key text NOT NULL UNIQUE,
  query_text text NOT NULL,
  source_classes text[] NOT NULL DEFAULT ARRAY['pubmed']::text[],
  domain text NOT NULL DEFAULT 'wellness',
  is_active boolean NOT NULL DEFAULT true,
  approval_status text NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('proposed', 'approved', 'rejected')),
  proposed_by text,
  approved_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingest_topics_active
  ON public.ingest_topic_registry (is_active, approval_status);

ALTER TABLE public.ingest_topic_registry ENABLE ROW LEVEL SECURITY;

-- Firecrawl credit / budget ledger (per run)
CREATE TABLE IF NOT EXISTS public.firecrawl_run_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL,
  run_date date NOT NULL,
  source_class text NOT NULL,
  pages_used integer NOT NULL DEFAULT 0,
  credits_used numeric NOT NULL DEFAULT 0,
  budget_pages integer NOT NULL,
  budget_credits numeric NOT NULL,
  hit_budget boolean NOT NULL DEFAULT false,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firecrawl_ledger_date
  ON public.firecrawl_run_ledger (run_date DESC);

ALTER TABLE public.firecrawl_run_ledger ENABLE ROW LEVEL SECURITY;

-- Extend staging with content hash + supersedes link
ALTER TABLE public.hounddog_staging_items
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS topic_key text,
  ADD COLUMN IF NOT EXISTS relevance_score numeric,
  ADD COLUMN IF NOT EXISTS supersedes_external_id text,
  ADD COLUMN IF NOT EXISTS full_text_excerpt text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hounddog_staging_content_hash
  ON public.hounddog_staging_items (content_hash)
  WHERE content_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hounddog_staging_external_id
  ON public.hounddog_staging_items (external_id)
  WHERE external_id IS NOT NULL;

-- Panel-scoped 1000 Genomes / IGSR reference (versioned)
CREATE TABLE IF NOT EXISTS public.genomics_reference_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id text NOT NULL UNIQUE,
  announced_at timestamptz,
  source_url text NOT NULL,
  notes text,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.genomics_panel_allele_freq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id text NOT NULL REFERENCES public.genomics_reference_releases(release_id) ON DELETE CASCADE,
  rsid text NOT NULL,
  gene_symbol text,
  population text NOT NULL DEFAULT 'ALL',
  alt_allele_freq numeric,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (release_id, rsid, population)
);

CREATE INDEX IF NOT EXISTS idx_genomics_freq_rsid
  ON public.genomics_panel_allele_freq (rsid);

ALTER TABLE public.genomics_reference_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genomics_panel_allele_freq ENABLE ROW LEVEL SECURITY;

-- Sherlock curation outputs (finished; consumers read these)
CREATE TABLE IF NOT EXISTS public.sherlock_curation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gated_id uuid REFERENCES public.hounddog_gated_items(id) ON DELETE SET NULL,
  curation_key text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  quality_grade text NOT NULL DEFAULT 'unknown',
  study_type text,
  sample_size integer,
  recency_year integer,
  effect_direction text,
  is_upgrade boolean NOT NULL DEFAULT false,
  supersedes_curation_key text,
  route_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  provenance jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sherlock_curation_key
  ON public.sherlock_curation_items (curation_key);

CREATE INDEX IF NOT EXISTS idx_sherlock_curation_routes
  ON public.sherlock_curation_items USING gin (route_tags);

ALTER TABLE public.sherlock_curation_items ENABLE ROW LEVEL SECURITY;

-- Seed core topics (approved)
INSERT INTO public.ingest_topic_registry (topic_key, query_text, source_classes, domain, approval_status, approved_by)
VALUES
  ('nad-metabolism', 'NAD+ precursor NMN cellular energy', ARRAY['pubmed','social'], 'longevity', 'approved', 'system-seed'),
  ('mitochondria', 'mitochondrial biogenesis CoQ10 PQQ', ARRAY['pubmed','social'], 'longevity', 'approved', 'system-seed'),
  ('sleep-circadian', 'sleep circadian rhythm recovery HRV', ARRAY['pubmed','social'], 'sleep', 'approved', 'system-seed'),
  ('mthfr-methylation', 'MTHFR methylation folate homocysteine', ARRAY['pubmed','social'], 'genetics', 'approved', 'system-seed'),
  ('body-composition', 'body composition DEXA visceral fat muscle mass', ARRAY['pubmed','social'], 'biology', 'approved', 'system-seed'),
  ('omega-3', 'omega-3 EPA DHA inflammation', ARRAY['pubmed','social'], 'nutrition', 'approved', 'system-seed'),
  ('vitamin-d', 'vitamin D deficiency immune bone', ARRAY['pubmed','social'], 'nutrition', 'approved', 'system-seed'),
  ('comt-stress', 'COMT catecholamine stress anxiety genetics', ARRAY['pubmed'], 'genetics', 'approved', 'system-seed'),
  ('hydration-performance', 'hydration electrolyte performance', ARRAY['pubmed','social'], 'nutrition', 'approved', 'system-seed'),
  ('igsr-release-watch', 'IGSR 1000 Genomes data release', ARRAY['genomes'], 'genetics', 'approved', 'system-seed')
ON CONFLICT (topic_key) DO NOTHING;

COMMENT ON TABLE public.ingest_topic_registry IS 'Prompt 214b data-driven ingest topics; Gary approves proposals.';
COMMENT ON TABLE public.sherlock_curation_items IS 'Prompt 214b Sherlock finished curation for Hannah/Arnold/Gordon digests.';
