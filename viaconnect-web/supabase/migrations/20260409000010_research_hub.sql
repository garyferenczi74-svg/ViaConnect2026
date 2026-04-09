-- =============================================================
-- Prompt #61: Research Hub — Personalized Source Management
-- 6 tables, RLS, indexes, seed 6 categories, seed sample items.
-- Idempotent (safe to re-run via ON CONFLICT DO NOTHING).
-- =============================================================

-- ─── 1. Categories (master tab list) ────────────────────────
CREATE TABLE IF NOT EXISTS research_hub_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  icon_name   TEXT NOT NULL,
  description TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. User-activated tabs ─────────────────────────────────
CREATE TABLE IF NOT EXISTS research_hub_user_tabs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES research_hub_categories(id) ON DELETE CASCADE,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);

-- ─── 3. User-curated sources ───────────────────────────────
CREATE TABLE IF NOT EXISTS research_hub_user_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES research_hub_categories(id) ON DELETE CASCADE,
  source_name     TEXT NOT NULL,
  source_url      TEXT,
  source_type     TEXT NOT NULL,
  source_icon_url TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notify_alerts   BOOLEAN NOT NULL DEFAULT true,
  is_custom       BOOLEAN NOT NULL DEFAULT false,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, source_name)
);

-- ─── 4. Discovered content items (global pool) ─────────────
CREATE TABLE IF NOT EXISTS research_hub_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID NOT NULL REFERENCES research_hub_categories(id),
  source_name  TEXT NOT NULL,
  title        TEXT NOT NULL,
  summary      TEXT,
  original_url TEXT,
  author       TEXT,
  published_at TIMESTAMPTZ,
  image_url    TEXT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  raw_metadata JSONB  NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_name, title)
);

-- ─── 5. Per-user item interaction + relevance ──────────────
CREATE TABLE IF NOT EXISTS research_hub_user_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id           UUID NOT NULL REFERENCES research_hub_items(id) ON DELETE CASCADE,
  relevance_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  relevance_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  matched_domains   TEXT[] NOT NULL DEFAULT '{}',
  is_bookmarked     BOOLEAN NOT NULL DEFAULT false,
  is_read           BOOLEAN NOT NULL DEFAULT false,
  is_dismissed      BOOLEAN NOT NULL DEFAULT false,
  surfaced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at           TIMESTAMPTZ,
  UNIQUE (user_id, item_id)
);

-- ─── 6. Alerts (high-relevance items) ──────────────────────
CREATE TABLE IF NOT EXISTS research_hub_alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_item_id  UUID NOT NULL REFERENCES research_hub_user_items(id) ON DELETE CASCADE,
  alert_type    TEXT NOT NULL DEFAULT 'relevance',
  title         TEXT NOT NULL,
  body          TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── RLS ────────────────────────────────────────────────────
ALTER TABLE research_hub_user_tabs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_hub_user_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_hub_user_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_hub_alerts       ENABLE ROW LEVEL SECURITY;

-- categories + items are public-readable (global pools)
ALTER TABLE research_hub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_hub_items      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories readable by all" ON research_hub_categories;
CREATE POLICY "Categories readable by all"
  ON research_hub_categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Items readable by all" ON research_hub_items;
CREATE POLICY "Items readable by all"
  ON research_hub_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users manage own tabs" ON research_hub_user_tabs;
CREATE POLICY "Users manage own tabs"
  ON research_hub_user_tabs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own sources" ON research_hub_user_sources;
CREATE POLICY "Users manage own sources"
  ON research_hub_user_sources FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own items" ON research_hub_user_items;
CREATE POLICY "Users manage own items"
  ON research_hub_user_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own alerts" ON research_hub_alerts;
CREATE POLICY "Users manage own alerts"
  ON research_hub_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rh_user_tabs_user        ON research_hub_user_tabs(user_id);
CREATE INDEX IF NOT EXISTS idx_rh_user_sources_user_cat ON research_hub_user_sources(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_rh_items_category        ON research_hub_items(category_id);
CREATE INDEX IF NOT EXISTS idx_rh_user_items_score      ON research_hub_user_items(user_id, relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_rh_user_items_surfaced   ON research_hub_user_items(user_id, surfaced_at DESC);
CREATE INDEX IF NOT EXISTS idx_rh_alerts_user_unread    ON research_hub_alerts(user_id, is_read) WHERE is_read = false;

-- ─── Seed: 6 default categories ────────────────────────────
INSERT INTO research_hub_categories (slug, label, icon_name, description, sort_order, is_default) VALUES
  ('publications',    'Publications',    'BookOpen',     'Peer-reviewed journals, medical literature, and research papers', 1, true),
  ('platforms',       'Platforms',       'Globe',        'Health & wellness platforms, databases, and knowledge bases',     2, true),
  ('social_media',    'Social Media',    'Users',        'Health influencers, practitioners, and thought leaders',          3, true),
  ('podcasts',        'Podcasts',        'Headphones',   'Health and wellness podcasts and audio content',                  4, false),
  ('clinical_trials', 'Clinical Trials', 'FlaskConical', 'Active clinical trials and study results',                        5, false),
  ('news',            'Health News',     'Newspaper',    'Breaking health news and industry updates',                       6, false)
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed: sample content items per category ──────────────
-- These give users an immediately-populated feed without paid API calls.
-- Content is wellness-aligned with the ViaConnect platform focus.

DO $$
DECLARE
  pub_id     UUID;
  plat_id    UUID;
  social_id  UUID;
  pod_id     UUID;
  trials_id  UUID;
  news_id    UUID;
BEGIN
  SELECT id INTO pub_id    FROM research_hub_categories WHERE slug = 'publications';
  SELECT id INTO plat_id   FROM research_hub_categories WHERE slug = 'platforms';
  SELECT id INTO social_id FROM research_hub_categories WHERE slug = 'social_media';
  SELECT id INTO pod_id    FROM research_hub_categories WHERE slug = 'podcasts';
  SELECT id INTO trials_id FROM research_hub_categories WHERE slug = 'clinical_trials';
  SELECT id INTO news_id   FROM research_hub_categories WHERE slug = 'news';

  -- Publications (8 items)
  INSERT INTO research_hub_items (category_id, source_name, title, summary, original_url, author, published_at, tags) VALUES
    (pub_id, 'PubMed Central', 'Liposomal Curcumin Demonstrates 27× Bioavailability vs Standard Curcumin', 'Randomized crossover trial in 32 healthy adults shows liposomal delivery yields 10–27× increase in plasma curcumin compared to unformulated extract.', 'https://pubmed.ncbi.nlm.nih.gov/sample/1', 'Wang L. et al.', now() - interval '2 hours', ARRAY['curcumin','bioavailability','liposomal','inflammation']),
    (pub_id, 'Nutrients (MDPI)',  'MTHFR C677T Variant and Methylfolate Supplementation: Updated Meta-Analysis', 'Pooled analysis of 14 RCTs confirms enhanced homocysteine reduction in C677T heterozygotes receiving 5-MTHF vs synthetic folic acid.', 'https://www.mdpi.com/sample/2', 'Garcia P. et al.', now() - interval '5 hours', ARRAY['mthfr','methylation','folate','snp']),
    (pub_id, 'American Journal of Clinical Nutrition', 'Magnesium Glycinate vs Citrate: Sleep Latency Outcomes in 240 Adults', 'Glycinate form reduced sleep latency by 22% vs 11% for citrate over 8 weeks. Both forms improved subjective sleep quality scores.', 'https://academic.oup.com/sample/3', 'Chen H. et al.', now() - interval '8 hours', ARRAY['magnesium','sleep','minerals']),
    (pub_id, 'Aging Cell',        'NAD+ Precursors and Mitochondrial Function in Aging Skeletal Muscle', 'NMN supplementation (250mg/day) improved muscle NAD+ levels by 40% and walking speed in adults aged 65+ over 12 weeks.', 'https://onlinelibrary.wiley.com/sample/4', 'Tanaka R. et al.', now() - interval '12 hours', ARRAY['nad','longevity','mitochondria','aging']),
    (pub_id, 'Clinical Epigenetics','SAMe Dosing and DNA Methylation Markers: A 6-Month Cohort Study', 'Daily SAMe (400mg) sustained improvements in global DNA methylation index and reduced depressive symptoms in MTHFR variant carriers.', 'https://clinicalepigeneticsjournal.biomedcentral.com/sample/5', 'Patel A. et al.', now() - interval '1 day', ARRAY['same','methylation','mood','epigenetics']),
    (pub_id, 'Drug Target Review','BPC-157 Oral Bioavailability: Recent Pharmacokinetic Findings', 'New data on stable gastric pentadecapeptide absorption suggests oral routes may achieve therapeutic plasma levels under specific conditions.', 'https://www.drugtargetreview.com/sample/6', 'Kovacic M. et al.', now() - interval '1 day 6 hours', ARRAY['peptides','bpc-157','bioavailability']),
    (pub_id, 'Nature Cancer',     'Sulforaphane and NRF2 Pathway Activation in Cancer Prevention', 'Cruciferous-derived sulforaphane shows sustained NRF2 induction and phase II detoxification enzyme upregulation in healthy volunteers.', 'https://www.nature.com/sample/7', 'Nakamura T. et al.', now() - interval '2 days', ARRAY['sulforaphane','detox','nrf2','cancer']),
    (pub_id, 'Endocrine Society News','Vitamin D, Cortisol Rhythm, and HPA Axis Regulation', 'Cohort data from 180 adults shows Vitamin D ≥40 ng/mL associated with healthier diurnal cortisol slopes and reduced perceived stress scores.', 'https://www.endocrine.org/sample/8', 'Reyes B. et al.', now() - interval '3 days', ARRAY['vitamin-d','cortisol','hpa-axis','stress'])
  ON CONFLICT (source_name, title) DO NOTHING;

  -- Platforms (6 items)
  INSERT INTO research_hub_items (category_id, source_name, title, summary, original_url, author, published_at, tags) VALUES
    (plat_id, 'Examine.com',          'Updated Evidence Summary: Ashwagandha for Stress and Sleep', 'Latest evidence review confirms moderate-to-strong evidence for KSM-66 ashwagandha (300–600mg) for stress reduction. New analysis on sleep markers added.', 'https://examine.com/sample/1', 'Examine Research Team', now() - interval '4 hours', ARRAY['ashwagandha','stress','sleep','adaptogen']),
    (plat_id, 'NIH Office of Dietary Supplements','Iron Status and Recommended Intakes: 2026 Update', 'NIH ODS publishes updated guidelines for iron bioavailability across plant- and animal-based diets, with new genotype-specific considerations.', 'https://ods.od.nih.gov/sample/2', 'NIH ODS', now() - interval '10 hours', ARRAY['iron','minerals','nutrition']),
    (plat_id, 'Precision Nutrition',  'How Genetic Testing Personalizes Nutrient Targets', 'Practical guide on translating SNP-level data (FUT2, MTHFR, COMT, VDR) into food and supplement protocols.', 'https://www.precisionnutrition.com/sample/3', 'PN Coaching', now() - interval '14 hours', ARRAY['nutrigenomics','snp','personalized']),
    (plat_id, 'Life Extension Foundation','Telomere Length Modulators: 2026 Evidence Review', 'Comprehensive look at supplements and lifestyle factors with measurable impact on leukocyte telomere length over 12+ months.', 'https://www.lifeextension.com/sample/4', 'LEF Editorial', now() - interval '1 day', ARRAY['telomeres','longevity','aging']),
    (plat_id, 'Project CBD',          'CBD and Endocannabinoid Tone: Clinical Implications', 'Discussion of how endogenous cannabinoid signaling interacts with stress, sleep, and inflammatory pathways.', 'https://www.projectcbd.org/sample/5', 'Project CBD Editorial', now() - interval '1 day 12 hours', ARRAY['cbd','endocannabinoid','inflammation']),
    (plat_id, 'Healthline Nutrition', 'Zinc Bioavailability: Picolinate vs Glycinate vs Citrate', 'Comparison of 3 common zinc forms for absorption, GI tolerance, and immune function support.', 'https://www.healthline.com/sample/6', 'Healthline Editorial', now() - interval '2 days', ARRAY['zinc','minerals','immune'])
  ON CONFLICT (source_name, title) DO NOTHING;

  -- Social media (5 items)
  INSERT INTO research_hub_items (category_id, source_name, title, summary, original_url, author, published_at, tags) VALUES
    (social_id, 'FoundMyFitness',   'Sulforaphane and Brain Health: New Animal Data', 'Dr. Patrick highlights new sulforaphane research showing reduced neuroinflammation markers and improved cognitive function in aged mice.', 'https://www.foundmyfitness.com/sample/1', 'Dr. Rhonda Patrick', now() - interval '3 hours', ARRAY['sulforaphane','brain','neuroinflammation']),
    (social_id, 'Huberman Lab',     'Zone 2 Cardio Frequency and Mitochondrial Density', 'Discussion thread on optimal Zone 2 cardio frequency (3–4×/week, 45–60 min) for measurable improvements in mitochondrial density.', 'https://www.hubermanlab.com/sample/2', 'Dr. Andrew Huberman', now() - interval '7 hours', ARRAY['zone-2','cardio','mitochondria','exercise']),
    (social_id, 'Examine Research Digest','New RCT: Creatine for Cognitive Performance Under Sleep Deprivation', 'Examine breaks down a new trial showing 0.3g/kg creatine improved working memory in sleep-deprived adults.', 'https://examine.com/research/sample/3', 'Examine Editorial', now() - interval '11 hours', ARRAY['creatine','cognition','sleep']),
    (social_id, 'Mercola',          'Sunlight Exposure Timing and Circadian Health', 'Review of recent research on morning bright light exposure and circadian rhythm regulation.', 'https://www.mercola.com/sample/4', 'Dr. Joseph Mercola', now() - interval '1 day', ARRAY['circadian','light','sleep']),
    (social_id, 'mindbodygreen',    'Adaptogens 101: Rhodiola, Ashwagandha, and Holy Basil', 'Practical guide to choosing adaptogens based on stress phenotype and circadian preferences.', 'https://www.mindbodygreen.com/sample/5', 'mbg Editorial', now() - interval '1 day 8 hours', ARRAY['adaptogens','rhodiola','ashwagandha','stress'])
  ON CONFLICT (source_name, title) DO NOTHING;

  -- Podcasts (3 items)
  INSERT INTO research_hub_items (category_id, source_name, title, summary, original_url, author, published_at, tags) VALUES
    (pod_id, 'Huberman Lab',  'Episode: Tools for Managing Stress & Anxiety', 'Episode covers science-based protocols for downregulating the sympathetic nervous system, including physiological sigh and NSDR.', 'https://www.hubermanlab.com/podcast/sample/1', 'Dr. Andrew Huberman', now() - interval '6 hours', ARRAY['stress','breathing','nsdr']),
    (pod_id, 'FoundMyFitness','Episode: NAD+, Sirtuins, and Healthspan', 'Long-form discussion on NAD+ precursors, sirtuin activation, and the latest healthspan research.', 'https://www.foundmyfitness.com/podcast/sample/2', 'Dr. Rhonda Patrick', now() - interval '1 day 4 hours', ARRAY['nad','sirtuins','longevity']),
    (pod_id, 'The Drive',     'Episode: Magnesium Forms, Dosing, and Sleep', 'Dr. Peter Attia discusses magnesium glycinate vs threonate vs citrate for sleep, recovery, and cognitive function.', 'https://peterattiamd.com/sample/3', 'Dr. Peter Attia', now() - interval '2 days', ARRAY['magnesium','sleep','minerals'])
  ON CONFLICT (source_name, title) DO NOTHING;

  -- Clinical trials (3 items)
  INSERT INTO research_hub_items (category_id, source_name, title, summary, original_url, author, published_at, tags) VALUES
    (trials_id, 'ClinicalTrials.gov','Recruiting: NMN Supplementation for Mitochondrial Function in Aging (NCT05999001)', 'Phase 2 RCT recruiting adults 55–75 to test NMN at 500mg/day vs placebo over 16 weeks. Primary endpoint: skeletal muscle NAD+ levels.', 'https://clinicaltrials.gov/sample/1', 'NIH/NIA', now() - interval '1 day', ARRAY['nmn','nad','aging','clinical-trial']),
    (trials_id, 'ClinicalTrials.gov','Active: Methylated B-Vitamin Complex in MTHFR C677T Carriers (NCT05888002)', 'Phase 3 study evaluating methylated B-vitamins on homocysteine, energy, and cognitive markers in 240 MTHFR carriers.', 'https://clinicaltrials.gov/sample/2', 'University Research Group', now() - interval '2 days', ARRAY['mthfr','methylation','b-vitamins']),
    (trials_id, 'ClinicalTrials.gov','Completed: Ashwagandha (KSM-66) for Anxiety in Healthcare Workers (NCT05777003)', '12-week RCT in 180 healthcare workers showed 32% reduction in PSS-10 stress scores vs placebo.', 'https://clinicaltrials.gov/sample/3', 'Multi-Center Group', now() - interval '4 days', ARRAY['ashwagandha','stress','anxiety','clinical-trial'])
  ON CONFLICT (source_name, title) DO NOTHING;

  -- News (4 items)
  INSERT INTO research_hub_items (category_id, source_name, title, summary, original_url, author, published_at, tags) VALUES
    (news_id, 'NutraIngredients',  'Liposomal Delivery Technology Captures 18% of Premium Supplement Market', 'Industry analysis shows liposomal supplement formulations growing 35% YoY, driven by demand for bioavailable, low-dose options.', 'https://www.nutraingredients.com/sample/1', 'NutraIngredients Editorial', now() - interval '5 hours', ARRAY['liposomal','industry','bioavailability']),
    (news_id, 'ScienceDaily',      'New Genetic Test Predicts Vitamin D Response in Individuals', 'Researchers identify a 4-SNP panel that predicts Vitamin D supplementation response with 78% accuracy.', 'https://www.sciencedaily.com/sample/2', 'ScienceDaily Editorial', now() - interval '9 hours', ARRAY['vitamin-d','snp','genetics']),
    (news_id, 'Nutraceutical World','Functional Mushroom Market Hits $50B Globally', 'Lions mane, reishi, cordyceps, and chaga drive record growth as consumers prioritize cognitive and immune support.', 'https://www.nutraceuticalsworld.com/sample/3', 'Nutraceuticals World', now() - interval '1 day', ARRAY['mushrooms','cognition','immune']),
    (news_id, 'Longevity.Technology','First Approved Senolytic Therapy Enters Phase 3', 'Senolytic compound targeting p16+ senescent cells shows promising Phase 2 results in osteoarthritis patients.', 'https://longevity.technology/sample/4', 'Longevity Tech Editorial', now() - interval '2 days', ARRAY['senolytics','aging','longevity'])
  ON CONFLICT (source_name, title) DO NOTHING;
END $$;

-- ─── updated_at trigger pattern ────────────────────────────
-- (No updated_at columns in this schema; alerts and items track their own
-- created_at / surfaced_at / read_at fields explicitly.)
