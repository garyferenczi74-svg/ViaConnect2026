-- Prompt 221 Phase 2: competitive_sources allowlist (Gary-approved unblock).
-- Append-only. Seeds C1 competitive brand/retail domains and C4 genetic test providers.
-- Does NOT bulk-seed product rows; crawl is allowlist-scoped only.
-- Facts-only competitive storage; grade E awareness; MAP / robots discipline in runners.

-- Expand staging source_type for Phase 2 + existing 214c agent lanes
ALTER TABLE public.hounddog_staging_items
  DROP CONSTRAINT IF EXISTS hounddog_staging_items_source_type_check;
ALTER TABLE public.hounddog_staging_items
  ADD CONSTRAINT hounddog_staging_items_source_type_check
  CHECK (source_type IN (
    'clinical_study',
    'social_aggregate',
    'news',
    'competitive_product',
    'genetic_test',
    'thanos_peptide',
    'elysium_genetics',
    'authority_source'
  ));

-- ---------------------------------------------------------------------------
-- competitive_sources (parallel to authorities_sources; separate governance)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitive_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  label text NOT NULL,
  source_kind text NOT NULL DEFAULT 'brand'
    CHECK (source_kind IN (
      'brand', 'retailer', 'genetic_test_provider', 'reference', 'other'
    )),
  category_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  base_url text,
  is_active boolean NOT NULL DEFAULT true,
  approval_status text NOT NULL DEFAULT 'proposed'
    CHECK (approval_status IN ('proposed', 'approved', 'rejected')),
  proposed_by text,
  approved_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitive_sources_active
  ON public.competitive_sources (is_active, approval_status);

CREATE INDEX IF NOT EXISTS idx_competitive_sources_kind
  ON public.competitive_sources (source_kind)
  WHERE is_active = true AND approval_status = 'approved';

ALTER TABLE public.competitive_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS competitive_sources_select_authenticated ON public.competitive_sources;
CREATE POLICY competitive_sources_select_authenticated
  ON public.competitive_sources FOR SELECT TO authenticated
  USING (approval_status = 'approved' AND is_active = true);

DROP POLICY IF EXISTS competitive_sources_admin_all ON public.competitive_sources;
CREATE POLICY competitive_sources_admin_all
  ON public.competitive_sources FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

COMMENT ON TABLE public.competitive_sources IS
  'Prompt 221 Phase 2: Gary-approved competitive and genetic-test crawl allowlist. Firecrawl only on approved active domains.';

-- ---------------------------------------------------------------------------
-- Seed: Via Cura category-aligned brand domains + genetic test providers
-- approved_by = gary (operator unblock 2026-08-17)
-- ---------------------------------------------------------------------------
INSERT INTO public.competitive_sources (
  domain, label, source_kind, category_tags, base_url,
  approval_status, proposed_by, approved_by, notes
) VALUES
  -- Liposomal / advanced delivery competitors
  ('quicksilverscientific.com', 'Quicksilver Scientific', 'brand',
    ARRAY['advanced-formulas','liposomal','methylation-snp'],
    'https://www.quicksilverscientific.com', 'approved', 'hounddog', 'gary',
    'Liposomal delivery competitor set'),
  ('bodybio.com', 'BodyBio', 'brand',
    ARRAY['advanced-formulas','base-formulations','liposomal'],
    'https://bodybio.com', 'approved', 'hounddog', 'gary',
    'Phospholipid / cellular competitor'),
  ('livonlabs.com', 'LivOn Labs', 'brand',
    ARRAY['advanced-formulas','liposomal'],
    'https://www.livonlabs.com', 'approved', 'hounddog', 'gary',
    'Liposomal vitamin C competitor'),
  -- Clinical / practitioner brands
  ('thorne.com', 'Thorne', 'brand',
    ARRAY['base-formulations','advanced-formulas','methylation-snp','womens-health'],
    'https://www.thorne.com', 'approved', 'hounddog', 'gary',
    'Broad clinical-grade competitor'),
  ('pureencapsulations.com', 'Pure Encapsulations', 'brand',
    ARRAY['base-formulations','advanced-formulas','methylation-snp','womens-health'],
    'https://www.pureencapsulations.com', 'approved', 'hounddog', 'gary',
    'Hypoallergenic clinical competitor'),
  ('designsforhealth.com', 'Designs for Health', 'brand',
    ARRAY['advanced-formulas','methylation-snp','base-formulations'],
    'https://www.designsforhealth.com', 'approved', 'hounddog', 'gary',
    'Practitioner channel competitor'),
  ('seekinghealth.com', 'Seeking Health', 'brand',
    ARRAY['methylation-snp','base-formulations','childrens-formulations'],
    'https://www.seekinghealth.com', 'approved', 'hounddog', 'gary',
    'Methylation / MTHFR competitor'),
  ('lifeextension.com', 'Life Extension', 'brand',
    ARRAY['advanced-formulas','base-formulations','functional-mushrooms'],
    'https://www.lifeextension.com', 'approved', 'hounddog', 'gary',
    'Longevity catalog competitor'),
  -- Mass / natural retail brands
  ('nowfoods.com', 'NOW Foods', 'brand',
    ARRAY['base-formulations','functional-mushrooms'],
    'https://www.nowfoods.com', 'approved', 'hounddog', 'gary',
    'Mass natural competitor'),
  ('jarrow.com', 'Jarrow Formulas', 'brand',
    ARRAY['base-formulations','advanced-formulas'],
    'https://www.jarrow.com', 'approved', 'hounddog', 'gary',
    'Formulation competitor'),
  ('gardenoflife.com', 'Garden of Life', 'brand',
    ARRAY['base-formulations','womens-health','childrens-formulations'],
    'https://www.gardenoflife.com', 'approved', 'hounddog', 'gary',
    'Whole-food competitor'),
  ('nordicnaturals.com', 'Nordic Naturals', 'brand',
    ARRAY['base-formulations','womens-health','childrens-formulations'],
    'https://www.nordicnaturals.com', 'approved', 'hounddog', 'gary',
    'Omega-3 competitor'),
  ('momentous.com', 'Momentous', 'brand',
    ARRAY['advanced-formulas','base-formulations'],
    'https://www.momentous.com', 'approved', 'hounddog', 'gary',
    'Performance competitor'),
  ('drinkag1.com', 'AG1', 'brand',
    ARRAY['advanced-formulas','base-formulations'],
    'https://drinkag1.com', 'approved', 'hounddog', 'gary',
    'Greens powder competitor'),
  ('ritual.com', 'Ritual', 'brand',
    ARRAY['womens-health','base-formulations'],
    'https://www.ritual.com', 'approved', 'hounddog', 'gary',
    'Direct-to-consumer multi competitor'),
  ('humann.com', 'Humann', 'brand',
    ARRAY['advanced-formulas','base-formulations'],
    'https://humann.com', 'approved', 'hounddog', 'gary',
    'Nitric oxide / performance competitor'),
  ('hostdefense.com', 'Host Defense', 'brand',
    ARRAY['functional-mushrooms'],
    'https://hostdefense.com', 'approved', 'hounddog', 'gary',
    'Mushroom competitor'),
  ('foursigmatic.com', 'Four Sigmatic', 'brand',
    ARRAY['functional-mushrooms'],
    'https://us.foursigmatic.com', 'approved', 'hounddog', 'gary',
    'Functional mushroom competitor'),
  -- Crawlable retail product listings (facts only: name, price, label text)
  ('iherb.com', 'iHerb', 'retailer',
    ARRAY['base-formulations','advanced-formulas','retail'],
    'https://www.iherb.com', 'approved', 'hounddog', 'gary',
    'Retail listings; price/availability only; no review scrapes'),
  ('vitacost.com', 'Vitacost', 'retailer',
    ARRAY['base-formulations','advanced-formulas','retail'],
    'https://www.vitacost.com', 'approved', 'hounddog', 'gary',
    'Retail listings; label facts only'),
  -- C4 genetic test providers
  ('23andme.com', '23andMe', 'genetic_test_provider',
    ARRAY['genex360','genetic_tests'],
    'https://www.23andme.com', 'approved', 'elysium', 'gary',
    'Consumer array competitor'),
  ('ancestry.com', 'AncestryDNA', 'genetic_test_provider',
    ARRAY['genex360','genetic_tests'],
    'https://www.ancestry.com', 'approved', 'elysium', 'gary',
    'Consumer ancestry / traits competitor'),
  ('nebula.org', 'Nebula Genomics', 'genetic_test_provider',
    ARRAY['genex360','genetic_tests'],
    'https://nebula.org', 'approved', 'elysium', 'gary',
    'WGS consumer competitor'),
  ('sequencing.com', 'Sequencing.com', 'genetic_test_provider',
    ARRAY['genex360','genetic_tests'],
    'https://sequencing.com', 'approved', 'elysium', 'gary',
    'WGS / marketplace competitor'),
  ('invitae.com', 'Invitae', 'genetic_test_provider',
    ARRAY['genex360','genetic_tests'],
    'https://www.invitae.com', 'approved', 'elysium', 'gary',
    'Clinical panel competitor'),
  ('color.com', 'Color Health', 'genetic_test_provider',
    ARRAY['genex360','genetic_tests'],
    'https://www.color.com', 'approved', 'elysium', 'gary',
    'Clinical / employer genetics competitor'),
  ('selfdecode.com', 'SelfDecode', 'genetic_test_provider',
    ARRAY['genex360','genetic_tests'],
    'https://selfdecode.com', 'approved', 'elysium', 'gary',
    'Consumer interpretation competitor'),
  ('genomelink.io', 'Genomelink', 'genetic_test_provider',
    ARRAY['genex360','genetic_tests'],
    'https://genomelink.io', 'approved', 'elysium', 'gary',
    'Upload / traits competitor'),
  ('myheritage.com', 'MyHeritage DNA', 'genetic_test_provider',
    ARRAY['genex360','genetic_tests'],
    'https://www.myheritage.com', 'approved', 'elysium', 'gary',
    'Consumer DNA competitor'),
  ('tellmegen.com', 'tellmeGen', 'genetic_test_provider',
    ARRAY['genex360','genetic_tests'],
    'https://www.tellmegen.com', 'approved', 'elysium', 'gary',
    'Consumer health genetics competitor')
ON CONFLICT (domain) DO UPDATE SET
  approval_status = EXCLUDED.approval_status,
  is_active = true,
  approved_by = EXCLUDED.approved_by,
  category_tags = EXCLUDED.category_tags,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Discovery cursors for Phase 2 rhythm (219m)
INSERT INTO public.discovery_cursors (source_key, topic_key, cursor_date, last_run_status, config)
VALUES
  ('firecrawl_competitive', 'global', '2026-08-17', 'empty', '{"phase":2,"collection":"competitive_supplements"}'::jsonb),
  ('firecrawl_competitive', 'advanced-formulas', '2026-08-17', 'empty', '{"phase":2}'::jsonb),
  ('firecrawl_competitive', 'methylation-snp', '2026-08-17', 'empty', '{"phase":2}'::jsonb),
  ('firecrawl_competitive', 'base-formulations', '2026-08-17', 'empty', '{"phase":2}'::jsonb),
  ('firecrawl_genetic_tests', 'global', '2026-08-17', 'empty', '{"phase":2,"collection":"genetic_tests"}'::jsonb)
ON CONFLICT (source_key, topic_key) DO NOTHING;

-- Flip Phase 2 collections to seeding (items arrive via ingest; live when populated)
UPDATE public.kb_collections
SET status = 'seeding'
WHERE slug IN ('competitive_supplements', 'genetic_tests')
  AND status = 'planned';
