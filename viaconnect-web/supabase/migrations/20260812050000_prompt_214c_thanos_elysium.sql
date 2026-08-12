-- Prompt 214c: Thanos (Peptide Education) + Elysium (My Genetics)
-- Append-only. Authorities allowlist, education/interpretation tables, RLS.

-- ---------------------------------------------------------------------------
-- Science & Authorities crawl allowlist (Gary-approved; agents propose)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.authorities_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  label text NOT NULL,
  source_kind text NOT NULL DEFAULT 'institution'
    CHECK (source_kind IN ('journal', 'institution', 'regulatory', 'reference', 'expert_affiliation', 'other')),
  domain_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  base_url text,
  is_active boolean NOT NULL DEFAULT true,
  approval_status text NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('proposed', 'approved', 'rejected')),
  proposed_by text,
  approved_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_authorities_sources_active
  ON public.authorities_sources (is_active, approval_status);

ALTER TABLE public.authorities_sources ENABLE ROW LEVEL SECURITY;

-- Consumer-readable living allowlist (no PII)
DROP POLICY IF EXISTS authorities_sources_select_authenticated ON public.authorities_sources;
CREATE POLICY authorities_sources_select_authenticated
  ON public.authorities_sources FOR SELECT TO authenticated
  USING (approval_status = 'approved' AND is_active = true);

-- ---------------------------------------------------------------------------
-- Thanos: peptide education catalog (educational only; never commercial)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.peptide_education_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_key text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL,
  mechanism text,
  evidence_grade text NOT NULL DEFAULT 'unknown',
  regulatory_status text,
  safety_context text,
  topic_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  provenance jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url text,
  content_hash text,
  supersedes_entry_key text,
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  is_practitioner_depth boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peptide_edu_active
  ON public.peptide_education_entries (is_active, last_verified_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_peptide_edu_content_hash
  ON public.peptide_education_entries (content_hash)
  WHERE content_hash IS NOT NULL;

ALTER TABLE public.peptide_education_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS peptide_edu_select_authenticated ON public.peptide_education_entries;
CREATE POLICY peptide_edu_select_authenticated
  ON public.peptide_education_entries FOR SELECT TO authenticated
  USING (is_active = true AND is_practitioner_depth = false);

-- ---------------------------------------------------------------------------
-- Elysium: variant interpretation catalog + coverage (GENEX360 + uploads)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.elysium_variant_interpretations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rsid text NOT NULL,
  gene_symbol text,
  panel_key text NOT NULL DEFAULT 'unknown',
  genotype text,
  effect_summary text NOT NULL,
  evidence_grade text NOT NULL DEFAULT 'unknown',
  population_context text,
  interpretation_status text NOT NULL DEFAULT 'interpreted'
    CHECK (interpretation_status IN ('interpreted', 'pending', 'unknown')),
  education_entry_key text,
  provenance jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_url text,
  content_hash text,
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  release_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rsid, panel_key)
);

CREATE INDEX IF NOT EXISTS idx_elysium_variant_rsid
  ON public.elysium_variant_interpretations (rsid);

CREATE INDEX IF NOT EXISTS idx_elysium_variant_panel
  ON public.elysium_variant_interpretations (panel_key, interpretation_status);

ALTER TABLE public.elysium_variant_interpretations ENABLE ROW LEVEL SECURITY;

-- Catalog is educational reference; no user genotypes here
DROP POLICY IF EXISTS elysium_variant_select_authenticated ON public.elysium_variant_interpretations;
CREATE POLICY elysium_variant_select_authenticated
  ON public.elysium_variant_interpretations FOR SELECT TO authenticated
  USING (true);

-- User upload coverage summary (sensitive; owner only)
CREATE TABLE IF NOT EXISTS public.elysium_upload_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id text,
  total_variants integer NOT NULL DEFAULT 0,
  mapped_count integer NOT NULL DEFAULT 0,
  unknown_count integer NOT NULL DEFAULT 0,
  pending_count integer NOT NULL DEFAULT 0,
  coverage_pct numeric,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_elysium_upload_user
  ON public.elysium_upload_coverage (user_id, created_at DESC);

ALTER TABLE public.elysium_upload_coverage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS elysium_upload_select_own ON public.elysium_upload_coverage;
CREATE POLICY elysium_upload_select_own
  ON public.elysium_upload_coverage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS elysium_upload_insert_own ON public.elysium_upload_coverage;
CREATE POLICY elysium_upload_insert_own
  ON public.elysium_upload_coverage FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Agent-owned staging marker on shared staging table (214b)
ALTER TABLE public.hounddog_staging_items
  ADD COLUMN IF NOT EXISTS agent_slug text;

CREATE INDEX IF NOT EXISTS idx_hounddog_staging_agent
  ON public.hounddog_staging_items (agent_slug)
  WHERE agent_slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Seed Science & Authorities allowlist domains
-- ---------------------------------------------------------------------------
INSERT INTO public.authorities_sources (domain, label, source_kind, domain_tags, base_url, approval_status, approved_by, notes)
VALUES
  ('pubmed.ncbi.nlm.nih.gov', 'PubMed', 'journal', ARRAY['genetics','peptide','nutrition'], 'https://pubmed.ncbi.nlm.nih.gov', 'approved', 'system-seed', 'Primary clinical literature index'),
  ('www.ncbi.nlm.nih.gov', 'NCBI', 'institution', ARRAY['genetics','reference'], 'https://www.ncbi.nlm.nih.gov', 'approved', 'system-seed', 'NCBI portals including Gene and ClinVar'),
  ('www.fda.gov', 'U.S. FDA', 'regulatory', ARRAY['peptide','regulatory'], 'https://www.fda.gov', 'approved', 'system-seed', 'Regulatory status for peptides and claims framing'),
  ('www.nih.gov', 'NIH', 'institution', ARRAY['genetics','peptide','nutrition'], 'https://www.nih.gov', 'approved', 'system-seed', 'National Institutes of Health'),
  ('www.who.int', 'WHO', 'regulatory', ARRAY['public_health'], 'https://www.who.int', 'approved', 'system-seed', 'World Health Organization'),
  ('www.internationalgenome.org', 'IGSR 1000 Genomes', 'reference', ARRAY['genetics'], 'https://www.internationalgenome.org', 'approved', 'system-seed', 'Population allele frequency reference'),
  ('www.genome.gov', 'NHGRI', 'institution', ARRAY['genetics'], 'https://www.genome.gov', 'approved', 'system-seed', 'National Human Genome Research Institute'),
  ('clinicaltrials.gov', 'ClinicalTrials.gov', 'registry', ARRAY['peptide','clinical'], 'https://clinicaltrials.gov', 'approved', 'system-seed', 'Registered clinical studies'),
  ('www.nature.com', 'Nature Portfolio', 'journal', ARRAY['genetics','peptide'], 'https://www.nature.com', 'approved', 'system-seed', 'Peer-reviewed journal family'),
  ('www.nejm.org', 'NEJM', 'journal', ARRAY['clinical'], 'https://www.nejm.org', 'approved', 'system-seed', 'New England Journal of Medicine'),
  ('jamanetwork.com', 'JAMA Network', 'journal', ARRAY['clinical'], 'https://jamanetwork.com', 'approved', 'system-seed', 'JAMA family journals'),
  ('www.thelancet.com', 'The Lancet', 'journal', ARRAY['clinical'], 'https://www.thelancet.com', 'approved', 'system-seed', 'Lancet journals'),
  ('www.frontiersin.org', 'Frontiers', 'journal', ARRAY['genetics','peptide','nutrition'], 'https://www.frontiersin.org', 'approved', 'system-seed', 'Open-access research'),
  ('academic.oup.com', 'Oxford Academic', 'journal', ARRAY['genetics','nutrition'], 'https://academic.oup.com', 'approved', 'system-seed', 'OUP journals including Human Molecular Genetics'),
  ('www.sciencedirect.com', 'ScienceDirect', 'journal', ARRAY['peptide','nutrition'], 'https://www.sciencedirect.com', 'approved', 'system-seed', 'Elsevier journals'),
  ('www.cell.com', 'Cell Press', 'journal', ARRAY['genetics','peptide'], 'https://www.cell.com', 'approved', 'system-seed', 'Cell family journals'),
  ('snpedia.com', 'SNPedia', 'reference', ARRAY['genetics'], 'https://www.snpedia.com', 'approved', 'system-seed', 'Crowdsourced SNP annotations (educational)'),
  ('ghr.nlm.nih.gov', 'MedlinePlus Genetics', 'reference', ARRAY['genetics'], 'https://medlineplus.gov/genetics', 'approved', 'system-seed', 'Consumer genetics education (NLM)'),
  ('medlineplus.gov', 'MedlinePlus', 'reference', ARRAY['genetics','nutrition'], 'https://medlineplus.gov', 'approved', 'system-seed', 'NLM consumer health'),
  ('www.efsa.europa.eu', 'EFSA', 'regulatory', ARRAY['nutrition','regulatory'], 'https://www.efsa.europa.eu', 'approved', 'system-seed', 'EU food safety authority'),
  ('ods.od.nih.gov', 'NIH ODS', 'institution', ARRAY['nutrition'], 'https://ods.od.nih.gov', 'approved', 'system-seed', 'Office of Dietary Supplements'),
  ('www.a4m.com', 'A4M', 'expert_affiliation', ARRAY['peptide'], 'https://www.a4m.com', 'approved', 'system-seed', 'Peptide science education affiliation'),
  ('www.peptidesociety.org', 'International Peptide Society', 'expert_affiliation', ARRAY['peptide'], 'https://www.peptidesociety.org', 'approved', 'system-seed', 'Clinical peptide education body'),
  ('www.utoronto.ca', 'University of Toronto', 'institution', ARRAY['genetics','nutrition'], 'https://www.utoronto.ca', 'approved', 'system-seed', 'Expert affiliation (El-Sohemy / nutrigenomics)'),
  ('www.tufts.edu', 'Tufts University', 'institution', ARRAY['genetics','nutrition'], 'https://www.tufts.edu', 'approved', 'system-seed', 'Expert affiliation (Ordovas)')
ON CONFLICT (domain) DO NOTHING;

-- Seed peptide education topic keys into existing registry (214b table)
INSERT INTO public.ingest_topic_registry (topic_key, query_text, source_classes, domain, approval_status, approved_by)
VALUES
  ('peptide-bpc157', 'BPC-157 tissue repair peptide research review', ARRAY['pubmed'], 'peptide', 'approved', 'system-seed'),
  ('peptide-epitalon', 'Epitalon epithalon telomere bioregulator research', ARRAY['pubmed'], 'peptide', 'approved', 'system-seed'),
  ('peptide-ss31', 'elamipretide SS-31 mitochondrial peptide clinical', ARRAY['pubmed'], 'peptide', 'approved', 'system-seed'),
  ('peptide-thymosin', 'Thymosin alpha-1 immune peptide clinical trials', ARRAY['pubmed'], 'peptide', 'approved', 'system-seed'),
  ('peptide-ghk-cu', 'GHK-Cu copper peptide gene regulation skin', ARRAY['pubmed'], 'peptide', 'approved', 'system-seed'),
  ('genetics-mthfr', 'MTHFR C677T A1298C folate methylation clinical', ARRAY['pubmed'], 'genetics', 'approved', 'system-seed'),
  ('genetics-comt', 'COMT Val158Met catecholamine stress genetics', ARRAY['pubmed'], 'genetics', 'approved', 'system-seed'),
  ('genetics-cyp', 'CYP2C9 CYP2C19 CYP1A2 pharmacogenomics allele frequency', ARRAY['pubmed'], 'genetics', 'approved', 'system-seed')
ON CONFLICT (topic_key) DO NOTHING;

-- Seed core peptide education entries (consumer educational layer)
INSERT INTO public.peptide_education_entries (
  entry_key, title, summary, mechanism, evidence_grade, regulatory_status, safety_context,
  topic_keys, provenance, source_url, is_practitioner_depth
) VALUES
  (
    'edu-bpc157',
    'BPC-157 educational overview',
    'Body protection compound studied for tissue repair pathways. Educational material only; discuss with a qualified practitioner. Never a consumer product purchase path.',
    'Angiogenic and gut-barrier research signals in preclinical and limited human pilot literature.',
    'moderate',
    'Research compound; not FDA-approved as a general wellness product',
    'Human pilot and Phase I signals exist; full safety profile depends on context. Practitioner guidance required for any protocol discussion.',
    ARRAY['peptide-bpc157'],
    '[{"source":"system-seed","note":"Catalog seed from Peptide Education"}]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/?term=BPC-157',
    false
  ),
  (
    'edu-epitalon',
    'Epitalon educational overview',
    'Short bioregulatory peptide studied for pineal and telomere-related pathways. Educational only.',
    'Khavinson-line bioregulator literature on circadian and cellular aging markers.',
    'moderate',
    'Research and regional clinical use history; not a U.S. consumer commercial product on this platform',
    'Decades of regional clinical use reports; still educational framing only on ViaConnect.',
    ARRAY['peptide-epitalon'],
    '[{"source":"system-seed"}]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/?term=Epitalon',
    false
  ),
  (
    'edu-ss31',
    'SS-31 / elamipretide educational overview',
    'Mitochondrial-targeted peptide studied in primary mitochondrial disease and energetics research. Educational only.',
    'Cardiolipin and mitochondrial membrane stabilization research.',
    'strong',
    'FDA-approved indication exists for Barth syndrome (elamipretide); other uses remain research or specialist context',
    'Indication-specific approval does not create a ViaConnect purchase path. Educational framing only.',
    ARRAY['peptide-ss31'],
    '[{"source":"system-seed"}]'::jsonb,
    'https://pubmed.ncbi.nlm.nih.gov/?term=elamipretide',
    false
  ),
  (
    'edu-tesofensine-pause',
    'Tesofensine regulatory timing note',
    'Tesofensine remains paused on this platform pending FDA approval framing. Referenced only as regulatory-timing education, not a protocol offer.',
    null,
    'unknown',
    'Not presented as available protocol; regulatory-timing pause',
    'Do not present dosing or purchase pathways.',
    ARRAY['peptide-regulatory'],
    '[{"source":"system-seed","note":"Tesofensine removed pending FDA approval"}]'::jsonb,
    'https://www.fda.gov',
    false
  )
ON CONFLICT (entry_key) DO NOTHING;

COMMENT ON TABLE public.authorities_sources IS 'Prompt 214c Science & Authorities crawl allowlist for Thanos and Elysium.';
COMMENT ON TABLE public.peptide_education_entries IS 'Prompt 214c Thanos-owned peptide education catalog (educational / practitioner guidance only).';
COMMENT ON TABLE public.elysium_variant_interpretations IS 'Prompt 214c Elysium-owned GENEX360 and upload interpretation catalog.';
COMMENT ON TABLE public.elysium_upload_coverage IS 'Prompt 214c user-owned genetics upload coverage summary (RLS owner-only).';
