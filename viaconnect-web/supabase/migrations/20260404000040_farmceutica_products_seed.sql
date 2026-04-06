-- ============================================================
-- FarmCeutica Wellness LLC — Brand + 55 Product Seed
-- Migration: 20260404000040_farmceutica_products_seed.sql
--
-- Seeds the supplement_brand_registry with the FarmCeutica
-- Wellness LLC brand record and inserts all 55 products into
-- supplement_brand_top_products across 6 categories:
--   Proprietary Base (8), Advanced (15), Women's Health (4),
--   Children's (3), GENEX360 (20), Mushrooms (5)
--
-- Record-keeping migration — SQL already executed on
-- Supabase project nnhkcufyqjojdbvdrpky.
-- ============================================================

-- 1. Upsert the FarmCeutica Wellness LLC brand
INSERT INTO supplement_brand_registry (
  brand_name, normalized_name, tier, tier_label, hq_country,
  estimated_sku_count, is_active, discovery_source,
  verification_status, website_url
) VALUES (
  'FarmCeutica Wellness LLC',
  'farmceuticawellnessllc',
  1,
  'Premium',
  'USA',
  55,
  true,
  'internal-seed',
  'verified',
  'https://farmceuticawellness.com'
)
ON CONFLICT (normalized_name) DO UPDATE SET
  brand_name          = EXCLUDED.brand_name,
  tier                = EXCLUDED.tier,
  tier_label          = EXCLUDED.tier_label,
  hq_country          = EXCLUDED.hq_country,
  estimated_sku_count = EXCLUDED.estimated_sku_count,
  is_active           = EXCLUDED.is_active,
  discovery_source    = EXCLUDED.discovery_source,
  verification_status = EXCLUDED.verification_status,
  website_url         = EXCLUDED.website_url;

-- 2. Insert all 55 products
DO $$
DECLARE
  v_brand_id uuid;
BEGIN
  SELECT id INTO v_brand_id
    FROM supplement_brand_registry
   WHERE normalized_name = 'farmceuticawellnessllc';

  -- ── PROPRIETARY BASE (8) ──────────────────────────────────────────────────

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'BHB Ketone Salts', 'bhbketonesalts', 'Proprietary Base', 'Powder', 'internal-seed', true,
     setweight(to_tsvector('english', 'BHB Ketone Salts'), 'A') || setweight(to_tsvector('english', 'beta-hydroxybutyrate ketosis energy metabolism powder'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'MethylB Complete+™ B Complex', 'methylbcompletebcomplex', 'Proprietary Base', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'MethylB Complete+™ B Complex'), 'A') || setweight(to_tsvector('english', 'methylated B vitamins B12 folate methylcobalamin methylfolate'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Electrolyte Blend', 'electrolyteblend', 'Proprietary Base', 'Powder', 'internal-seed', true,
     setweight(to_tsvector('english', 'Electrolyte Blend'), 'A') || setweight(to_tsvector('english', 'electrolytes hydration sodium potassium magnesium minerals powder'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'GLP-1 Activator Complex', 'glp1activatorcomplex', 'Proprietary Base', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'GLP-1 Activator Complex'), 'A') || setweight(to_tsvector('english', 'GLP-1 blood sugar glucose metabolism berberine weight management'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Magnesium Synergy Matrix', 'magnesiumsynergymatrix', 'Proprietary Base', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Magnesium Synergy Matrix'), 'A') || setweight(to_tsvector('english', 'magnesium glycinate threonate taurate malate mineral relaxation sleep'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'NeuroCalm BH4 Complex', 'neurocalmbh4complex', 'Proprietary Base', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'NeuroCalm BH4 Complex'), 'A') || setweight(to_tsvector('english', 'BH4 tetrahydrobiopterin neurotransmitter serotonin dopamine mood'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Omega-3 DHA/EPA (Algal)', 'omega3dhaepaalgal', 'Proprietary Base', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Omega-3 DHA/EPA (Algal)'), 'A') || setweight(to_tsvector('english', 'omega-3 DHA EPA algal vegan fish oil cardiovascular brain'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'ToxiBind Matrix™', 'toxibindmatrix', 'Proprietary Base', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'ToxiBind Matrix™'), 'A') || setweight(to_tsvector('english', 'detox binder toxin removal heavy metals mold mycotoxin activated charcoal'), 'B'))
  ON CONFLICT DO NOTHING;

  -- ── ADVANCED (15) ─────────────────────────────────────────────────────────

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Creatine HCL+', 'creatinehcl', 'Advanced', 'Powder', 'internal-seed', true,
     setweight(to_tsvector('english', 'Creatine HCL+'), 'A') || setweight(to_tsvector('english', 'creatine hydrochloride muscle strength performance energy ATP'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'CATALYST+ Energy Multivitamin', 'catalystenergymultivitamin', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'CATALYST+ Energy Multivitamin'), 'A') || setweight(to_tsvector('english', 'multivitamin energy daily vitamin D3 K2 magnesium methylated B vitamins'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Replenish NAD+', 'replenishnad', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Replenish NAD+'), 'A') || setweight(to_tsvector('english', 'NAD+ NMN longevity aging CoQ10 ubiquinol mitochondria PQQ urolithin'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Balance+ Gut Repair', 'balancegutrepair', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Balance+ Gut Repair'), 'A') || setweight(to_tsvector('english', 'gut health repair leaky gut BPC-157 glutamine probiotics digestive'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'BLAST+ Nitric Oxide Stack', 'blastnitricoxidestack', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'BLAST+ Nitric Oxide Stack'), 'A') || setweight(to_tsvector('english', 'nitric oxide circulation blood flow L-citrulline beetroot cardiovascular'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'NeuroCalm+', 'neurocalm', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'NeuroCalm+'), 'A') || setweight(to_tsvector('english', 'stress adaptogen ashwagandha rhodiola L-theanine GABA cortisol calm'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'RELAX+ Sleep Support', 'relaxsleepsupport', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'RELAX+ Sleep Support'), 'A') || setweight(to_tsvector('english', 'sleep melatonin 5-HTP glycine apigenin magnesium CBD CBN insomnia'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Clean+ Detox & Liver Health', 'cleandetoxliverhealth', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Clean+ Detox & Liver Health'), 'A') || setweight(to_tsvector('english', 'detox liver cleanse glutathione NAC milk thistle toxin elimination'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Teloprime+ Telomere Support', 'teloprimetelomeresupport', 'Advanced', 'Powder', 'internal-seed', true,
     setweight(to_tsvector('english', 'Teloprime+ Telomere Support'), 'A') || setweight(to_tsvector('english', 'telomere longevity resveratrol astragalus cycloastragenol aging AC-11'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'DigestiZorb+™ Enzyme Complex', 'digestizorbenzymecomplex', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'DigestiZorb+™ Enzyme Complex'), 'A') || setweight(to_tsvector('english', 'digestive enzymes protease lipase amylase bloating digestion absorption'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'FOCUS+ Nootropic Formula', 'focusnootropicformula', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'FOCUS+ Nootropic Formula'), 'A') || setweight(to_tsvector('english', 'nootropic brain focus cognition lion''s mane bacopa memory concentration'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'RISE+ Male Testosterone', 'risemaletestosterone', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'RISE+ Male Testosterone'), 'A') || setweight(to_tsvector('english', 'testosterone male hormonal tongkat ali fadogia ashwagandha libido'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'FLEX+ Joint & Inflammation', 'flexjointinflammation', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'FLEX+ Joint & Inflammation'), 'A') || setweight(to_tsvector('english', 'joint pain inflammation curcumin boswellia collagen hyaluronic acid MSM'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'IRON+ Red Blood Cell Support', 'ironredbloodcellsupport', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'IRON+ Red Blood Cell Support'), 'A') || setweight(to_tsvector('english', 'iron anemia ferritin red blood cell vitamin C glutathione absorption'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Histamine Relief Protocol™', 'histaminereliefprotocol', 'Advanced', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Histamine Relief Protocol™'), 'A') || setweight(to_tsvector('english', 'histamine intolerance DAO diamine oxidase mast cell allergy quercetin'), 'B'))
  ON CONFLICT DO NOTHING;

  -- ── WOMEN'S HEALTH (4) ────────────────────────────────────────────────────

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'DESIRE+ Female Hormonal', 'desirefemalehormonal', 'Women''s Health', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'DESIRE+ Female Hormonal'), 'A') || setweight(to_tsvector('english', 'female hormone libido estrogen progesterone maca DIM women'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Grow+ Pre-Natal Formula', 'growprenatalformula', 'Women''s Health', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Grow+ Pre-Natal Formula'), 'A') || setweight(to_tsvector('english', 'prenatal pregnancy folate methylfolate DHA iron choline fertility'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Revitalizher Postnatal+', 'revitalizherpostnatal', 'Women''s Health', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Revitalizher Postnatal+'), 'A') || setweight(to_tsvector('english', 'postnatal postpartum recovery nursing breastfeeding iron B12 DHA'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Thrive+ Post-Natal GLP-1', 'thrivepostnatalglp1', 'Women''s Health', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Thrive+ Post-Natal GLP-1'), 'A') || setweight(to_tsvector('english', 'postnatal GLP-1 weight management postpartum metabolism berberine'), 'B'))
  ON CONFLICT DO NOTHING;

  -- ── CHILDREN'S (3) ────────────────────────────────────────────────────────

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Sproutables Infant Tincture', 'sproutablesinfanttincture', 'Children''s', 'Tincture', 'internal-seed', true,
     setweight(to_tsvector('english', 'Sproutables Infant Tincture'), 'A') || setweight(to_tsvector('english', 'infant baby vitamin D drops liquid tincture pediatric newborn'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Sproutables Toddler Tablets', 'sproutablestoddlertablets', 'Children''s', 'Tablet', 'internal-seed', true,
     setweight(to_tsvector('english', 'Sproutables Toddler Tablets'), 'A') || setweight(to_tsvector('english', 'toddler children kids multivitamin tablet chewable pediatric growth'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Sproutables Children Gummies', 'sproutableschildrengummies', 'Children''s', 'Gummy', 'internal-seed', true,
     setweight(to_tsvector('english', 'Sproutables Children Gummies'), 'A') || setweight(to_tsvector('english', 'children kids gummy multivitamin immune growth development pediatric'), 'B'))
  ON CONFLICT DO NOTHING;

  -- ── GENEX360 (20) ─────────────────────────────────────────────────────────

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'ACAT+ Mitochondrial Support', 'acatmitochondrialsupport', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'ACAT+ Mitochondrial Support'), 'A') || setweight(to_tsvector('english', 'ACAT gene mitochondria cholesterol acetyl-CoA lipid metabolism energy'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'ACHY+ Acetylcholine Support', 'achyacetylcholinesupport', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'ACHY+ Acetylcholine Support'), 'A') || setweight(to_tsvector('english', 'acetylcholine choline memory cognition neurotransmitter ACHE gene'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'ADO Support+™ Purine Metabolism', 'adosupportpurinemetabolism', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'ADO Support+™ Purine Metabolism'), 'A') || setweight(to_tsvector('english', 'adenosine purine metabolism ADA gene uric acid nucleotide'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'BHMT+™ Methylation Support', 'bhmtmethylationsupport', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'BHMT+™ Methylation Support'), 'A') || setweight(to_tsvector('english', 'BHMT gene betaine homocysteine methyltransferase methylation'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'CBS Support+™ Sulfur Pathway', 'cbssupportsulfurpathway', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'CBS Support+™ Sulfur Pathway'), 'A') || setweight(to_tsvector('english', 'CBS gene cystathionine beta-synthase sulfur transsulfuration homocysteine'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'COMT+™ Neurotransmitter Balance', 'comtneurotransmitterbalance', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'COMT+™ Neurotransmitter Balance'), 'A') || setweight(to_tsvector('english', 'COMT gene catechol-O-methyltransferase dopamine estrogen catecholamine'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'DAO+™ Histamine Balance', 'daohistaminebalance', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'DAO+™ Histamine Balance'), 'A') || setweight(to_tsvector('english', 'DAO gene diamine oxidase histamine intolerance mast cell allergy'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'GST+™ Cellular Detox', 'gstcellulardetox', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'GST+™ Cellular Detox'), 'A') || setweight(to_tsvector('english', 'GST gene glutathione S-transferase detoxification phase II liver'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'MAOA+™ Neurochemical Balance', 'maoaneurochemicalbalance', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'MAOA+™ Neurochemical Balance'), 'A') || setweight(to_tsvector('english', 'MAOA gene monoamine oxidase serotonin norepinephrine mood neurotransmitter'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'MTHFR+™ Folate Metabolism', 'mthfrfolatemetabolism', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'MTHFR+™ Folate Metabolism'), 'A') || setweight(to_tsvector('english', 'MTHFR gene methylenetetrahydrofolate reductase folate 5-MTHF methylation homocysteine'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'MTR+™ Methylation Matrix', 'mtrmethylationmatrix', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'MTR+™ Methylation Matrix'), 'A') || setweight(to_tsvector('english', 'MTR gene methionine synthase B12 methylcobalamin homocysteine remethylation'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'MTRR+™ Methylcobalamin Regen', 'mtrrmethylcobalaminregen', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'MTRR+™ Methylcobalamin Regen'), 'A') || setweight(to_tsvector('english', 'MTRR gene methionine synthase reductase B12 regeneration methylcobalamin'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'NAT Support+™ Acetylation', 'natsupportacetylation', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'NAT Support+™ Acetylation'), 'A') || setweight(to_tsvector('english', 'NAT gene N-acetyltransferase acetylation phase II detox xenobiotic'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'NOS+™ Vascular Integrity', 'nosvascularintegrity', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'NOS+™ Vascular Integrity'), 'A') || setweight(to_tsvector('english', 'NOS gene nitric oxide synthase vascular endothelial blood pressure circulation'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'RFC1 Support+™ Folate Transport', 'rfc1supportfolatetransport', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'RFC1 Support+™ Folate Transport'), 'A') || setweight(to_tsvector('english', 'RFC1 gene reduced folate carrier transport absorption cellular uptake'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'SHMT+™ Glycine-Folate Balance', 'shmtglycinefolatebalance', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'SHMT+™ Glycine-Folate Balance'), 'A') || setweight(to_tsvector('english', 'SHMT gene serine hydroxymethyltransferase glycine folate one-carbon metabolism'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'SOD+™ Antioxidant Defense', 'sodantioxidantdefense', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'SOD+™ Antioxidant Defense'), 'A') || setweight(to_tsvector('english', 'SOD gene superoxide dismutase antioxidant free radical oxidative stress'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'SUOX+™ Sulfite Clearance', 'suoxsulfiteclearance', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'SUOX+™ Sulfite Clearance'), 'A') || setweight(to_tsvector('english', 'SUOX gene sulfite oxidase molybdenum sulfite sensitivity detoxification'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'TCN2+™ B12 Transport', 'tcn2b12transport', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'TCN2+™ B12 Transport'), 'A') || setweight(to_tsvector('english', 'TCN2 gene transcobalamin B12 transport cellular delivery methylcobalamin'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'VDR+™ Receptor Activation', 'vdrreceptoractivation', 'Methylation / GeneX360', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'VDR+™ Receptor Activation'), 'A') || setweight(to_tsvector('english', 'VDR gene vitamin D receptor calcium bone immune D3 K2 magnesium'), 'B'))
  ON CONFLICT DO NOTHING;

  -- ── MUSHROOMS (5) ─────────────────────────────────────────────────────────

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Chaga Mushroom Capsules', 'chagamushroomcapsules', 'Functional Mushrooms', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Chaga Mushroom Capsules'), 'A') || setweight(to_tsvector('english', 'chaga inonotus obliquus antioxidant immune beta-glucan adaptogen'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Cordyceps Mushroom Capsules', 'cordycepsmushroomcapsules', 'Functional Mushrooms', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Cordyceps Mushroom Capsules'), 'A') || setweight(to_tsvector('english', 'cordyceps sinensis energy endurance ATP oxygen performance adaptogen'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Lion''s Mane Mushroom Capsules', 'lionsmanemushroomcapsules', 'Functional Mushrooms', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Lion''s Mane Mushroom Capsules'), 'A') || setweight(to_tsvector('english', 'lion''s mane hericium erinaceus NGF brain cognition memory nerve growth'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Reishi Mushroom Capsules', 'reishimushroomcapsules', 'Functional Mushrooms', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Reishi Mushroom Capsules'), 'A') || setweight(to_tsvector('english', 'reishi ganoderma lucidum immune sleep calm adaptogen beta-glucan'), 'B'))
  ON CONFLICT DO NOTHING;

  INSERT INTO supplement_brand_top_products
    (brand_registry_id, product_name, normalized_product_name, product_category, delivery_method, discovery_source, is_enriched, search_vector)
  VALUES
    (v_brand_id, 'Turkey Tail Mushroom Capsules', 'turkeytailmushroomcapsules', 'Functional Mushrooms', 'Capsule', 'internal-seed', true,
     setweight(to_tsvector('english', 'Turkey Tail Mushroom Capsules'), 'A') || setweight(to_tsvector('english', 'turkey tail trametes versicolor immune gut microbiome PSK PSP beta-glucan'), 'B'))
  ON CONFLICT DO NOTHING;

END $$;
