-- Prompt 227a: raise Research Hub cron to 6h and seed evidence-lane registry.
-- Append-only. Project nnhkcufyqjojdbvdrpky only. Mercola never seeded.

-- 1. Steady-state cadence (was */10 for Phase 1 proof)
DO $$
BEGIN
  PERFORM cron.unschedule('viaconnect_227a_research_hub_aging_cell');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'viaconnect_227a_research_hub_aging_cell',
  '35 */6 * * *',
  $sql$
  SELECT public.invoke_viaconnect_bearer_cron('/api/cron/run-227a-phase1-research-hub');
  $sql$
);

-- 2. Extend transport to allow RSS; add evidence-lane columns
ALTER TABLE public.authorities_sources
  DROP CONSTRAINT IF EXISTS authorities_sources_transport_check;

ALTER TABLE public.authorities_sources
  ADD CONSTRAINT authorities_sources_transport_check
  CHECK (
    transport IS NULL
    OR transport IN ('rest_api', 'eutils', 'bulk_export', 'firecrawl', 'manual', 'rss')
  );

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS lane text;

ALTER TABLE public.authorities_sources
  DROP CONSTRAINT IF EXISTS authorities_sources_lane_check;

ALTER TABLE public.authorities_sources
  ADD CONSTRAINT authorities_sources_lane_check
  CHECK (
    lane IS NULL
    OR lane IN ('evidence', 'signal', 'excluded')
  );

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS journal_filter text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS feed_url text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS cursor_topic_key text;

ALTER TABLE public.authorities_sources
  ADD COLUMN IF NOT EXISTS provenance_cap text;

-- 3. Seed evidence-lane sources (domain unique; journals use journal.<slug>)
INSERT INTO public.authorities_sources AS a (
  domain, label, source_kind, domain_tags, base_url,
  is_active, approval_status, approved_by, notes,
  source_tier, transport, registry_status, lane,
  journal_filter, feed_url, cursor_topic_key, provenance_cap, cadence
) VALUES
  ('journal.aging-cell', 'Aging Cell', 'journal', ARRAY['longevity','aging'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2. Phase 1 proven.', 2, 'eutils', 'live', 'evidence',
   '"Aging Cell"[Journal]', NULL, 'aging-cell', NULL, '6h'),
  ('journal.geroscience', 'GeroScience', 'journal', ARRAY['longevity','aging'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2.', 2, 'eutils', 'live', 'evidence',
   '"GeroScience"[Journal]', NULL, 'geroscience', NULL, '6h'),
  ('journal.ajcn', 'American Journal of Clinical Nutrition', 'journal', ARRAY['nutrition'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2. Strong nutrition anchor.', 2, 'eutils', 'live', 'evidence',
   '"American Journal of Clinical Nutrition"[Journal]', NULL, 'ajcn', NULL, '6h'),
  ('journal.nutrition-reviews', 'Nutrition Reviews', 'journal', ARRAY['nutrition'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2.', 2, 'eutils', 'live', 'evidence',
   '"Nutrition Reviews"[Journal]', NULL, 'nutrition-reviews', NULL, '6h'),
  ('journal.clinical-nutrition', 'Clinical Nutrition', 'journal', ARRAY['nutrition'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2 (ESPEN).', 2, 'eutils', 'live', 'evidence',
   '"Clinical Nutrition"[Journal]', NULL, 'clinical-nutrition', NULL, '6h'),
  ('journal.food-nutrition-research', 'Food and Nutrition Research', 'journal', ARRAY['nutrition'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2. Open access.', 2, 'eutils', 'live', 'evidence',
   '"Food & Nutrition Research"[Journal]', NULL, 'food-nutrition-research', NULL, '6h'),
  ('journal.jcem', 'Journal of Clinical Endocrinology and Metabolism', 'journal', ARRAY['hormones'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2. Anchors hormone work.', 2, 'eutils', 'live', 'evidence',
   '"The Journal of Clinical Endocrinology and Metabolism"[Journal]', NULL, 'jcem', NULL, '6h'),
  ('journal.hormones', 'Hormones (Athens)', 'journal', ARRAY['hormones'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2.', 2, 'eutils', 'live', 'evidence',
   '"Hormones (Athens, Greece)"[Journal]', NULL, 'hormones', NULL, '6h'),
  ('journal.thyroid-research', 'Thyroid Research', 'journal', ARRAY['hormones','thyroid'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2.', 2, 'eutils', 'live', 'evidence',
   '"Thyroid Research"[Journal]', NULL, 'thyroid-research', NULL, '6h'),
  ('journal.clinical-epigenetics', 'Clinical Epigenetics', 'journal', ARRAY['epigenetics'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2. Feeds Collection 11.', 2, 'eutils', 'live', 'evidence',
   '"Clinical Epigenetics"[Journal]', NULL, 'clinical-epigenetics', NULL, '6h'),
  ('journal.epigenetics', 'Epigenetics', 'journal', ARRAY['epigenetics'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2.', 2, 'eutils', 'live', 'evidence',
   '"Epigenetics"[Journal]', NULL, 'epigenetics', NULL, '6h'),
  ('journal.nature-cancer', 'Nature Cancer', 'journal', ARRAY['cancer'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2.', 2, 'eutils', 'live', 'evidence',
   '"Nature Cancer"[Journal]', NULL, 'nature-cancer', NULL, '6h'),
  ('journal.cannabis-cannabinoid', 'Cannabis and Cannabinoid Research', 'journal', ARRAY['cannabinoid'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2. Peer-reviewed.', 2, 'eutils', 'live', 'evidence',
   '"Cannabis and Cannabinoid Research"[Journal]', NULL, 'cannabis-cannabinoid', NULL, '6h'),
  ('journal.nutrients-mdpi', 'Nutrients', 'journal', ARRAY['nutrition'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2 flagged. High volume; provenance-weighted; do not let volume become weight.',
   2, 'eutils', 'live', 'evidence',
   '"Nutrients"[Journal]', NULL, 'nutrients-mdpi', 'cap_c_volume_flag', '6h'),
  ('journal.oncotarget', 'Oncotarget', 'journal', ARRAY['cancer'],
   'https://pubmed.ncbi.nlm.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 2 verify. MEDLINE reindexed 2022 after prior delisting. Contested history; watch quality.',
   2, 'eutils', 'live', 'evidence',
   '"Oncotarget"[Journal]', NULL, 'oncotarget', 'verify_medline', '6h'),
  ('ods.od.nih.gov', 'NIH Office of Dietary Supplements', 'institution', ARRAY['supplements','nutrition'],
   'https://ods.od.nih.gov', true, 'approved', 'gary',
   '227a evidence lane Tier 1. RSS discovery then primary path.', 1, 'rss', 'live', 'evidence',
   NULL, 'https://ods.od.nih.gov/News/RSS.aspx', 'nih-ods', NULL, '6h'),
  ('www.cancerresearchuk.org', 'Cancer Research UK', 'institution', ARRAY['cancer','research'],
   'https://www.cancerresearchuk.org', true, 'approved', 'gary',
   '227a evidence lane Tier 2. Research and science pages, not fundraising.', 2, 'rss', 'live', 'evidence',
   NULL, 'https://news.cancerresearchuk.org/feed/', 'cancer-research-uk', NULL, '12h'),
  ('ascopubs.org', 'ASCO News and Research', 'institution', ARRAY['cancer','society'],
   'https://ascopubs.org', true, 'approved', 'gary',
   '227a evidence lane Tier 2-3. Journal content Tier 2; news Tier 3. RSS news feed.', 3, 'rss', 'live', 'evidence',
   NULL, 'https://ascopost.com/rss/', 'asco-news', 'cap_c', '12h'),
  ('www.icrs.co', 'ICRS Cannabinoid Research', 'institution', ARRAY['cannabinoid','society'],
   'https://www.icrs.co', true, 'approved', 'gary',
   '227a evidence lane Tier 3. Conference abstracts preliminary; never grade as full pubs.', 3, 'rss', 'pending_access', 'evidence',
   NULL, NULL, 'icrs', 'abstracts_only', '12h'),
  ('www.drugtargetreview.com', 'Drug Target Review', 'other', ARRAY['trade','secondary'],
   'https://www.drugtargetreview.com', true, 'approved', 'gary',
   '227a evidence lane Tier 3. Trade publication; pointer to primary sources.', 3, 'rss', 'live', 'evidence',
   NULL, 'https://www.drugtargetreview.com/feed/', 'drug-target-review', 'cap_c', '12h'),
  ('methylation-research-hub.pending', 'Methylation Research Hub', 'other', ARRAY['methylation'],
   NULL, false, 'proposed', 'gary',
   '227a Tier 3 pending identification of operator. Not wired until commercial vs independent is resolved.',
   3, 'firecrawl', 'pending_access', 'evidence',
   NULL, NULL, 'methylation-hub', NULL, NULL)
ON CONFLICT (domain) DO UPDATE SET
  label = EXCLUDED.label,
  source_kind = EXCLUDED.source_kind,
  domain_tags = EXCLUDED.domain_tags,
  base_url = COALESCE(EXCLUDED.base_url, a.base_url),
  is_active = EXCLUDED.is_active,
  approval_status = EXCLUDED.approval_status,
  approved_by = EXCLUDED.approved_by,
  notes = EXCLUDED.notes,
  source_tier = EXCLUDED.source_tier,
  transport = EXCLUDED.transport,
  registry_status = EXCLUDED.registry_status,
  lane = EXCLUDED.lane,
  journal_filter = EXCLUDED.journal_filter,
  feed_url = EXCLUDED.feed_url,
  cursor_topic_key = EXCLUDED.cursor_topic_key,
  provenance_cap = EXCLUDED.provenance_cap,
  cadence = EXCLUDED.cadence,
  updated_at = now();

-- Explicit exclusions (G56): Mercola never in registry as live source
INSERT INTO public.authorities_sources (
  domain, label, source_kind, is_active, approval_status, approved_by, notes,
  source_tier, transport, registry_status, lane, blocked_reason
) VALUES (
  'www.mercola.com', 'Mercola (EXCLUDED)', 'other', false, 'rejected', 'gary',
  'G56: Excluded from both evidence and signal lanes. Supplement seller with FDA warning letters and health misinformation record.',
  4, NULL, 'blocked', 'excluded',
  'G56 credibility exclusion; never wire'
)
ON CONFLICT (domain) DO UPDATE SET
  is_active = false,
  approval_status = 'rejected',
  registry_status = 'blocked',
  lane = 'excluded',
  blocked_reason = EXCLUDED.blocked_reason,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Ensure existing pubmed row stays eutils backbone
UPDATE public.authorities_sources
SET lane = COALESCE(lane, 'evidence'),
    transport = COALESCE(transport, 'eutils'),
    registry_status = COALESCE(registry_status, 'live'),
    updated_at = now()
WHERE domain IN ('pubmed.ncbi.nlm.nih.gov', 'www.ncbi.nlm.nih.gov');
