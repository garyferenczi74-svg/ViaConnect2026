-- Prompt 222: competitor_app payload class + competitor_platforms collection.
-- Internal strategy only. Seed rows in a later migration.
-- Teardown kb_items MUST set consumer_safe = false and practitioner_depth = false.

ALTER TABLE public.kb_items
  DROP CONSTRAINT IF EXISTS kb_items_payload_type_check;

ALTER TABLE public.kb_items
  ADD CONSTRAINT kb_items_payload_type_check
  CHECK (payload_type IN (
    'product', 'study', 'association', 'delivery_tech',
    'genetic_test', 'synthesis', 'education_entry', 'competitor_app'
  ));

INSERT INTO public.kb_collections (
  slug, display_name, owning_agent, co_owner_agents, source_classes,
  cadence_class, gate_profile, seeding_phase, status
) VALUES (
  'competitor_platforms',
  'Competitive platform teardowns',
  'hounddog',
  ARRAY['sherlock', 'jeffery']::text[],
  ARRAY['firecrawl_competitive', 'public_http']::text[],
  'weekly',
  'standard',
  2,
  'planned'
)
ON CONFLICT (slug) DO NOTHING;
