-- Prompt 221: seed twelve kb_collections (status planned; no item seeding).
INSERT INTO public.kb_collections (
  slug, display_name, owning_agent, co_owner_agents, source_classes,
  cadence_class, gate_profile, seeding_phase, status
) VALUES
  (
    'competitive_supplements',
    'Competitive supplements and formulations',
    'hounddog',
    ARRAY['sherlock']::text[],
    ARRAY['firecrawl_competitive', 'firecrawl_allowlist']::text[],
    'weekly',
    'standard',
    2,
    'planned'
  ),
  (
    'popularity_formulation',
    'Most popular supplements and formulation comparisons',
    'sherlock',
    ARRAY[]::text[],
    ARRAY['internal_derivation', 'social']::text[],
    'popularity_weekly',
    'standard',
    4,
    'planned'
  ),
  (
    'via_cura_competitive',
    'Competitive comparisons on Via Cura products',
    'sherlock',
    ARRAY['marshall', 'lex']::text[],
    ARRAY['internal_derivation']::text[],
    'derived_on_upstream_change',
    'lex_lane',
    4,
    'planned'
  ),
  (
    'genetic_tests',
    'Genetic testing database',
    'elysium',
    ARRAY[]::text[],
    ARRAY['firecrawl_allowlist', 'firecrawl_competitive']::text[],
    'weekly',
    'standard',
    2,
    'planned'
  ),
  (
    'peptide_education',
    'Peptide education database',
    'thanos',
    ARRAY[]::text[],
    ARRAY['firecrawl_allowlist', 'pubmed']::text[],
    'studies_12h',
    'practitioner_flagged',
    1,
    'planned'
  ),
  (
    'micellar',
    'Micellar delivery database',
    'hounddog',
    ARRAY['gordon']::text[],
    ARRAY['pubmed', 'firecrawl_allowlist']::text[],
    'studies_12h',
    'standard',
    3,
    'planned'
  ),
  (
    'liposomal',
    'Liposomal delivery database',
    'hounddog',
    ARRAY['gordon']::text[],
    ARRAY['pubmed', 'firecrawl_allowlist']::text[],
    'studies_12h',
    'standard',
    3,
    'planned'
  ),
  (
    'clinical_studies',
    'Current clinical studies',
    'hounddog',
    ARRAY['sherlock']::text[],
    ARRAY['pubmed']::text[],
    'studies_12h',
    'standard',
    1,
    'planned'
  ),
  (
    'bioavailability_studies',
    'Bioavailability studies',
    'hounddog',
    ARRAY['gordon']::text[],
    ARRAY['pubmed']::text[],
    'studies_12h',
    'standard',
    1,
    'planned'
  ),
  (
    'genetic_nutritional',
    'Genetic nutritional database',
    'elysium',
    ARRAY['gordon']::text[],
    ARRAY['pubmed', 'internal_derivation']::text[],
    'weekly',
    'standard',
    3,
    'planned'
  ),
  (
    'genetic_hormonal',
    'Genetic hormonal database',
    'elysium',
    ARRAY['arnold']::text[],
    ARRAY['pubmed', 'internal_derivation']::text[],
    'weekly',
    'standard',
    3,
    'planned'
  ),
  (
    'genetic_peptide',
    'Genetic peptide database',
    'elysium',
    ARRAY['thanos']::text[],
    ARRAY['pubmed', 'internal_derivation']::text[],
    'weekly',
    'standard',
    3,
    'planned'
  )
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  owning_agent = EXCLUDED.owning_agent,
  co_owner_agents = EXCLUDED.co_owner_agents,
  source_classes = EXCLUDED.source_classes,
  cadence_class = EXCLUDED.cadence_class,
  gate_profile = EXCLUDED.gate_profile,
  seeding_phase = EXCLUDED.seeding_phase;
