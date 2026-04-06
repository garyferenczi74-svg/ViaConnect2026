-- DRAFT FORMULATIONS — SNP / GeneX360™ gene-targeted products + 4 misc.
-- Each formulation_json carries "draft": true and is built from well-established
-- cofactors for the named pathway at standard clinical support doses.
-- These are placeholders awaiting founder/regulatory review before launch.
-- Query stale drafts later with: WHERE formulation_json->>'draft' = 'true'
-- Only updates rows where formulation_json IS NULL so existing data is never overwritten.

UPDATE product_catalog SET
  short_description = 'Mitochondrial fatty acid metabolism support with Acetyl-L-Carnitine, CoQ10, and B-cofactors',
  formulation_json = '{"draft":true,"total_mg":625,"ingredients":[
    {"ingredient":"Acetyl-L-Carnitine","mg":250},
    {"ingredient":"Liposomal CoQ10 (Ubiquinol)","mg":100},
    {"ingredient":"Pantothenic Acid (B5)","mg":50},
    {"ingredient":"Magnesium Bisglycinate","mg":100},
    {"ingredient":"R-Alpha-Lipoic Acid","mg":100},
    {"ingredient":"Riboflavin (B2)","mg":25}
  ]}'::jsonb
WHERE name = 'ACAT+ Mitochondrial Support' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Acetylcholine synthesis support with Alpha-GPC, Citicoline, and Phosphatidylserine',
  formulation_json = '{"draft":true,"total_mg":950,"ingredients":[
    {"ingredient":"Alpha-GPC","mg":300},
    {"ingredient":"Citicoline (CDP-Choline)","mg":250},
    {"ingredient":"Phosphatidylserine","mg":100},
    {"ingredient":"Pantothenic Acid (B5)","mg":50},
    {"ingredient":"Acetyl-L-Carnitine","mg":250},
    {"ingredient":"Huperzine A","mg":0.1}
  ]}'::jsonb
WHERE name = 'ACHY+ Acetylcholine Support' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Purine metabolism cofactors with Molybdenum, P5P, Inositol, and methyl donors',
  formulation_json = '{"draft":true,"total_mg":376.55,"ingredients":[
    {"ingredient":"Molybdenum (Glycinate)","mg":0.15},
    {"ingredient":"Magnesium Bisglycinate","mg":100},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Inositol","mg":250},
    {"ingredient":"Liposomal 5-MTHF","mg":0.4},
    {"ingredient":"Methylcobalamin (B12)","mg":1}
  ]}'::jsonb
WHERE name = 'ADO Support+ Purine Metabolism' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Alternative methylation pathway support with TMG, Choline, and Methyl B12',
  formulation_json = '{"draft":true,"total_mg":966,"ingredients":[
    {"ingredient":"TMG (Trimethylglycine / Betaine)","mg":500},
    {"ingredient":"Citicoline (Choline)","mg":250},
    {"ingredient":"Zinc Bisglycinate","mg":15},
    {"ingredient":"Methylcobalamin (B12)","mg":1},
    {"ingredient":"L-Serine","mg":200}
  ]}'::jsonb
WHERE name = 'BHMT+ Methylation Support' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Sulfur pathway balance with Molybdenum, P5P, Riboflavin, and Taurine',
  formulation_json = '{"draft":true,"total_mg":650.15,"ingredients":[
    {"ingredient":"Molybdenum (Glycinate)","mg":0.15},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Riboflavin (B2)","mg":25},
    {"ingredient":"Magnesium Bisglycinate","mg":100},
    {"ingredient":"L-Taurine","mg":500}
  ]}'::jsonb
WHERE name = 'CBS Support+ Sulfur Pathway' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Catecholamine clearance support with Magnesium, SAMe, and methyl donors',
  formulation_json = '{"draft":true,"total_mg":451.4,"ingredients":[
    {"ingredient":"Magnesium Bisglycinate","mg":200},
    {"ingredient":"SAMe (S-Adenosylmethionine)","mg":200},
    {"ingredient":"Methylcobalamin (B12)","mg":1},
    {"ingredient":"Liposomal 5-MTHF","mg":0.4},
    {"ingredient":"Riboflavin (B2)","mg":25},
    {"ingredient":"Vitamin B6 (P5P)","mg":25}
  ]}'::jsonb
WHERE name = 'COMT+ Neurotransmitter Balance' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Histamine clearance with DAO enzyme, Quercetin, Vitamin C, and P5P',
  formulation_json = '{"draft":true,"total_mg":551,"ingredients":[
    {"ingredient":"Diamine Oxidase Enzyme","mg":10},
    {"ingredient":"Liposomal Vitamin C","mg":250},
    {"ingredient":"Quercetin Phytosome","mg":250},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Copper Bisglycinate","mg":1},
    {"ingredient":"Zinc Bisglycinate","mg":15}
  ]}'::jsonb
WHERE name = 'DAO+ Histamine Balance' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Glutathione S-transferase support with Liposomal Glutathione, NAC, and Sulforaphane',
  formulation_json = '{"draft":true,"total_mg":1350.2,"ingredients":[
    {"ingredient":"Liposomal Glutathione (Setria®)","mg":250},
    {"ingredient":"NAC (N-Acetyl Cysteine)","mg":600},
    {"ingredient":"Selenium (L-Selenomethionine)","mg":0.2},
    {"ingredient":"Milk Thistle (80% Silymarin)","mg":250},
    {"ingredient":"R-Alpha-Lipoic Acid","mg":200},
    {"ingredient":"Sulforaphane (Broccoli Sprout)","mg":50}
  ]}'::jsonb
WHERE name = 'GST+ Cellular Detox' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Monoamine balance with Riboflavin, Magnesium, L-Theanine, and P5P',
  formulation_json = '{"draft":true,"total_mg":740,"ingredients":[
    {"ingredient":"Riboflavin (B2)","mg":50},
    {"ingredient":"Magnesium Bisglycinate","mg":200},
    {"ingredient":"L-Theanine","mg":200},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Zinc Bisglycinate","mg":15},
    {"ingredient":"Inositol","mg":250}
  ]}'::jsonb
WHERE name = 'MAOA+ Neurochemical Balance' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Methylated folate metabolism with 5-MTHF, B12, B6, and Riboflavin cofactors',
  formulation_json = '{"draft":true,"total_mg":801.8,"ingredients":[
    {"ingredient":"Liposomal 5-MTHF","mg":0.8},
    {"ingredient":"Methylcobalamin (B12)","mg":1},
    {"ingredient":"Riboflavin (B2)","mg":25},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Citicoline (Choline)","mg":250},
    {"ingredient":"TMG (Trimethylglycine)","mg":500}
  ]}'::jsonb
WHERE name = 'MTHFR+ Folate Metabolism' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Methionine synthase support with Methyl B12, 5-MTHF, and L-Methionine',
  formulation_json = '{"draft":true,"total_mg":316.8,"ingredients":[
    {"ingredient":"Methylcobalamin (B12)","mg":1},
    {"ingredient":"Liposomal 5-MTHF","mg":0.8},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Zinc Bisglycinate","mg":15},
    {"ingredient":"L-Methionine","mg":250},
    {"ingredient":"Riboflavin (B2)","mg":25}
  ]}'::jsonb
WHERE name = 'MTR+ Methylation Matrix' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Methylcobalamin regeneration with Hydroxo/Methyl B12, Riboflavin, and Selenium',
  formulation_json = '{"draft":true,"total_mg":42.6,"ingredients":[
    {"ingredient":"Hydroxocobalamin (B12)","mg":1},
    {"ingredient":"Methylcobalamin (B12)","mg":1},
    {"ingredient":"Riboflavin (B2)","mg":25},
    {"ingredient":"Selenium (L-Selenomethionine)","mg":0.2},
    {"ingredient":"Zinc Bisglycinate","mg":15},
    {"ingredient":"Liposomal 5-MTHF","mg":0.4}
  ]}'::jsonb
WHERE name = 'MTRR+ Methylcobalamin Regen' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Acetylation pathway support with Pantothenic Acid, Acetyl-L-Carnitine, and Glycine',
  formulation_json = '{"draft":true,"total_mg":975.15,"ingredients":[
    {"ingredient":"Pantothenic Acid (B5)","mg":100},
    {"ingredient":"Acetyl-L-Carnitine","mg":250},
    {"ingredient":"Glycine","mg":500},
    {"ingredient":"Molybdenum (Glycinate)","mg":0.15},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Magnesium Bisglycinate","mg":100}
  ]}'::jsonb
WHERE name = 'NAT Support+ Acetylation' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Nitric oxide and vascular integrity with L-Citrulline, L-Arginine, BH4, and Beetroot',
  formulation_json = '{"draft":true,"total_mg":2255.4,"ingredients":[
    {"ingredient":"L-Citrulline Malate","mg":1000},
    {"ingredient":"L-Arginine","mg":500},
    {"ingredient":"Liposomal BH4 (Tetrahydrobiopterin)","mg":5},
    {"ingredient":"Liposomal Vitamin C","mg":250},
    {"ingredient":"Liposomal 5-MTHF","mg":0.4},
    {"ingredient":"Beetroot Extract (10:1)","mg":500}
  ]}'::jsonb
WHERE name = 'NOS+ Vascular Integrity' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Folate transport support with 5-MTHF, Folinic Acid, and Methyl B12',
  formulation_json = '{"draft":true,"total_mg":67.2,"ingredients":[
    {"ingredient":"Liposomal 5-MTHF","mg":0.8},
    {"ingredient":"Folinic Acid (Calcium Folinate)","mg":0.4},
    {"ingredient":"Methylcobalamin (B12)","mg":1},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Riboflavin (B2)","mg":25},
    {"ingredient":"Zinc Bisglycinate","mg":15}
  ]}'::jsonb
WHERE name = 'RFC1 Support+ Folate Transport' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Glycine-folate balance with Glycine, L-Serine, 5-MTHF, and P5P',
  formulation_json = '{"draft":true,"total_mg":1300.8,"ingredients":[
    {"ingredient":"Glycine","mg":1000},
    {"ingredient":"L-Serine","mg":250},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Liposomal 5-MTHF","mg":0.4},
    {"ingredient":"Folinic Acid","mg":0.4},
    {"ingredient":"Riboflavin (B2)","mg":25}
  ]}'::jsonb
WHERE name = 'SHMT+ Glycine-Folate Balance' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Superoxide dismutase cofactors: Zinc, Copper, Manganese, Selenium, and antioxidants',
  formulation_json = '{"draft":true,"total_mg":1118.2,"ingredients":[
    {"ingredient":"Zinc Bisglycinate","mg":15},
    {"ingredient":"Copper Bisglycinate","mg":1},
    {"ingredient":"Manganese Bisglycinate","mg":2},
    {"ingredient":"Selenium (L-Selenomethionine)","mg":0.2},
    {"ingredient":"Liposomal Vitamin C","mg":500},
    {"ingredient":"NAC (N-Acetyl Cysteine)","mg":600}
  ]}'::jsonb
WHERE name = 'SOD+ Antioxidant Defense' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Sulfite clearance with Molybdenum, B12, P5P, and Magnesium',
  formulation_json = '{"draft":true,"total_mg":151.3,"ingredients":[
    {"ingredient":"Molybdenum (Glycinate)","mg":0.3},
    {"ingredient":"Methylcobalamin (B12)","mg":1},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Magnesium Bisglycinate","mg":100},
    {"ingredient":"Riboflavin (B2)","mg":25}
  ]}'::jsonb
WHERE name = 'SUOX+ Sulfite Clearance' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'B12 transport support with Methyl, Hydroxo, and Adenosyl Cobalamin forms',
  formulation_json = '{"draft":true,"total_mg":153.8,"ingredients":[
    {"ingredient":"Methylcobalamin (B12)","mg":1},
    {"ingredient":"Hydroxocobalamin (B12)","mg":1},
    {"ingredient":"Adenosylcobalamin (B12)","mg":1},
    {"ingredient":"Liposomal 5-MTHF","mg":0.8},
    {"ingredient":"Intrinsic Factor","mg":50},
    {"ingredient":"Calcium (as Carbonate)","mg":100}
  ]}'::jsonb
WHERE name = 'TCN2+ B12 Transport' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Vitamin D receptor activation with Liposomal D3, K2 (MK-7), Magnesium, and Boron',
  formulation_json = '{"draft":true,"total_mg":219.225,"ingredients":[
    {"ingredient":"Liposomal Vitamin D3 (Cholecalciferol)","mg":0.125},
    {"ingredient":"Liposomal Vitamin K2 (MK-7)","mg":0.2},
    {"ingredient":"Liposomal Magnesium Bisglycinate","mg":200},
    {"ingredient":"Boron (Glycinate)","mg":3},
    {"ingredient":"Zinc Bisglycinate","mg":15},
    {"ingredient":"Vitamin A (Retinyl Palmitate)","mg":0.9}
  ]}'::jsonb
WHERE name = 'VDR+ Receptor Activation' AND formulation_json IS NULL;

-- ── Other empty products (4) ─────────────────────────────────────────

UPDATE product_catalog SET
  short_description = 'Complete amino acid stack with BCAAs, Glutamine, Lysine, Arginine, and Taurine',
  formulation_json = '{"draft":true,"total_mg":6000,"ingredients":[
    {"ingredient":"L-Leucine","mg":1500},
    {"ingredient":"L-Isoleucine","mg":750},
    {"ingredient":"L-Valine","mg":750},
    {"ingredient":"L-Glutamine","mg":1000},
    {"ingredient":"L-Lysine","mg":500},
    {"ingredient":"L-Arginine","mg":500},
    {"ingredient":"Glycine","mg":500},
    {"ingredient":"L-Taurine","mg":500}
  ]}'::jsonb
WHERE name = 'AMINO ACID MATRIX+' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Lipid metabolism and brain health with Omega-3, Phosphatidylcholine, CoQ10, and Curcumin',
  formulation_json = '{"draft":true,"total_mg":1950,"ingredients":[
    {"ingredient":"Liposomal DHA","mg":500},
    {"ingredient":"Liposomal EPA","mg":250},
    {"ingredient":"Phosphatidylcholine","mg":300},
    {"ingredient":"Liposomal CoQ10 (Ubiquinol)","mg":100},
    {"ingredient":"Tocotrienols (Vitamin E Complex)","mg":50},
    {"ingredient":"Liposomal Curcumin (95% curcuminoids)","mg":500},
    {"ingredient":"Liposomal Resveratrol","mg":250}
  ]}'::jsonb
WHERE name = 'APOE+' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Phase I detox support with DIM, Sulforaphane, Calcium D-Glucarate, and B-cofactors',
  formulation_json = '{"draft":true,"total_mg":900,"ingredients":[
    {"ingredient":"DIM (Diindolylmethane)","mg":200},
    {"ingredient":"Sulforaphane (Broccoli Sprout)","mg":50},
    {"ingredient":"Calcium D-Glucarate","mg":500},
    {"ingredient":"Vitamin B6 (P5P)","mg":25},
    {"ingredient":"Riboflavin (B2)","mg":25},
    {"ingredient":"Magnesium Bisglycinate","mg":100}
  ]}'::jsonb
WHERE name = 'CYP450+' AND formulation_json IS NULL;

UPDATE product_catalog SET
  short_description = 'Metabolic and fat-loss support with L-Carnitine, EGCG, Berberine, and CLA',
  formulation_json = '{"draft":true,"total_mg":3050.2,"ingredients":[
    {"ingredient":"L-Carnitine Tartrate","mg":1000},
    {"ingredient":"Green Tea Extract (50% EGCG)","mg":500},
    {"ingredient":"Chromium Picolinate","mg":0.2},
    {"ingredient":"Berberine HCl","mg":500},
    {"ingredient":"CLA (Conjugated Linoleic Acid)","mg":1000},
    {"ingredient":"Cayenne Extract (Capsaicin)","mg":50}
  ]}'::jsonb
WHERE name = 'SHRED+' AND formulation_json IS NULL;
