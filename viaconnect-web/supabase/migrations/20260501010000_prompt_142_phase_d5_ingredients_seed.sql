-- Prompt #142 v2 Phase D.5: ingredients jsonb backfill from canonical formulation export.
--
-- The canonical xlsx export (vc_master_formulations.json) was delivered
-- by Gary 2026-04-30. Contains 63 products with structured ingredient
-- data: 8 Proprietary Base + 19 Advanced + 8 Womens Health + 3 Childrens
-- + 20 Methylation/SNP + 5 Functional Mushrooms.
--
-- Match strategy per #142 v2 §3 Phase D.5:
--   1. Name match (after ™ stripping). Most direct path; catches both
--      rows for SNP products that exist as 2 production rows (genetic+snp
--      legacy collapse from #142a) since both share the same name.
--   2. Slug match as secondary (not implemented v1; orphans surface for
--      review).
--   3. Fuzzy match (Levenshtein) — deferred per spec design.
--
-- Schema transformation (source -> target):
--   Source: {name, mg, unit}
--   Target: {name, dose, unit, role} per #142 v2 §3 Phase D.5 spec
--   - name verbatim
--   - mg -> dose (numeric)
--   - unit defaults to 'mg' if missing
--   - role defaults to "" (empty per spec; clinical curation deferred)
--
-- Unit verification deferred per spec (Q4 from #142 v2 §9): the xlsx
-- column header says "MG / Serving" but micronutrient doses (Biotin 5,
-- B12 0.8, B9 0.5) suggest possible mg vs mcg ambiguity. This migration
-- preserves unit as 'mg' for all entries; flagged rows can be reviewed
-- via tmp/phase-d5-unit-check.csv equivalent (audit log filtered).
--
-- Idempotency: COALESCE-style WHERE ingredients IS NULL OR
-- jsonb_array_length(ingredients) = 0. Re-running is a no-op.
--
-- Defensive: WHERE category != 'peptide' on every UPDATE.
--
-- Coverage expectations (per #142 v2 §3 Phase D.5):
--   - 63 canonical products map to ~91-92 production rows (the 20 SNP
--     dupes get 2 rows each via name-match)
--   - Production rows not in canonical export remain ingredients=[]
--     (testing kits genex360 category, AMINO ACID MATRIX+, APOE+, CYP450+)
--   - Orphan canonical entries (export entries with no production match)
--     flagged in RAISE NOTICE for follow-up
--
-- Amendment 1 (Gary override 2026-04-30): the canonical xlsx export had
-- the 5 Functional Mushroom extract values at 180 mg per serving, but
-- Gary corrected this to 500 mg per serving for Chaga, Cordyceps, Lion's
-- Mane, Reishi, and Turkey Tail capsules. Phospholipid carrier (15 mg)
-- unchanged; total_mg_per_serving updated from 195 -> 515.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_canonical jsonb := $JSON$
[
  {"name_clean":"BHB Ketone Salts","ingredients":[
    {"name":"Calcium Beta-Hydroxybutyrate","mg":50},
    {"name":"Magnesium Beta-Hydroxybutyrate","mg":50},
    {"name":"Sodium Beta-Hydroxybutyrate","mg":50},
    {"name":"Liposomal Organic MCT","mg":20}
  ],"total_mg_per_serving":170},
  {"name_clean":"MethylB Complete+ B Complex","ingredients":[
    {"name":"B1 ,  Thiamine","mg":10},
    {"name":"B2 ,  Riboflavin","mg":10},
    {"name":"B3 ,  Niacin","mg":15},
    {"name":"B5 ,  Pantothenic Acid","mg":20},
    {"name":"B6 ,  Pyridoxine","mg":15},
    {"name":"B7 ,  Biotin","mg":5},
    {"name":"Liposomal B9 ,  Methyl Folate (5-MTHF)","mg":0.5},
    {"name":"Liposomal B12 ,  Methylcobalamin","mg":0.8}
  ],"total_mg_per_serving":76.3},
  {"name_clean":"Electrolyte Blend","ingredients":[
    {"name":"Effervescent Hydrogen Matrix (Mg-H complex)","mg":100},
    {"name":"Magnesium (as Citrate)","mg":50},
    {"name":"Potassium (as Citrate)","mg":50},
    {"name":"Pure Himalayan Sea Salt Sodium (as Citrate)","mg":50},
    {"name":"Zinc (Bisglycinate)","mg":5}
  ],"total_mg_per_serving":255},
  {"name_clean":"Inferno + GLP-1 Activator Complex","ingredients":[
    {"name":"Berberine HCl (98% purity)","mg":30},
    {"name":"BHB Salts (Magnesium, Calcium, Sodium)","mg":150},
    {"name":"L-Carnitine Tartrate","mg":25},
    {"name":"Chromium Picolinate (elemental)","mg":2},
    {"name":"Micellar Cinnamon Bark Extract (10:1)","mg":10},
    {"name":"Liposomal Conjugated Linoleic Acid (CLA)","mg":15},
    {"name":"Probiotic Blend (10 Billion CFU)","mg":150},
    {"name":"Liposomal EGCG (Green Tea Extract, 50%)","mg":10},
    {"name":"Micellar Moringa Leaf Extract (10:1)","mg":10},
    {"name":"Liposomal Paraxanthine (PureCaf®)","mg":10},
    {"name":"Selenium (L-Selenomethionine)","mg":1},
    {"name":"Tesofensine (botanical analog mimic)","mg":2},
    {"name":"Micellar Artichoke Leaf Extract (5% Cynarin)","mg":10},
    {"name":"Inulin-FOS (Prebiotic Blend)","mg":10}
  ],"total_mg_per_serving":435},
  {"name_clean":"Magnesium Synergy Matrix","ingredients":[
    {"name":"Magnesium Bisglycinate","mg":25},
    {"name":"Magnesium Citrate","mg":25},
    {"name":"Magnesium Malate","mg":25},
    {"name":"Magnesium Orotate","mg":25},
    {"name":"Magnesium Taurate","mg":25},
    {"name":"Magnesium L-Threonate","mg":25}
  ],"total_mg_per_serving":150},
  {"name_clean":"Aptigen Complex","ingredients":[
    {"name":"L-Dopa (from Mucuna pruriens extract)","mg":30},
    {"name":"Liposomal L-Tyrosine","mg":25},
    {"name":"L-Phenylalanine","mg":15},
    {"name":"Liposomal PQQ (Pyrroloquinoline Quinone)","mg":10},
    {"name":"Liposomal Coenzyme Q10 (Ubiquinol)","mg":10},
    {"name":"Liposomal 5-MTHF (5-Methyltetrahydrofolate)","mg":10},
    {"name":"L-Citrulline Malate","mg":15},
    {"name":"L-Arginine","mg":10},
    {"name":"Liposomal Vitamin C","mg":10},
    {"name":"Liposomal L-Theanine","mg":15},
    {"name":"Liposomal Magnesium L-Threonate","mg":10},
    {"name":"Micellar Lion's Mane Extract (Hericenones)","mg":10},
    {"name":"Saccharomyces Boulardii","mg":10},
    {"name":"Lithium Orotate (Elemental Lithium ~1 mg)","mg":5},
    {"name":"5-HTP","mg":5}
  ],"total_mg_per_serving":190},
  {"name_clean":"Omega-3 DHA/EPA (Algal)","ingredients":[
    {"name":"Algal Phospholipid Matrix (carrier base)","mg":25},
    {"name":"Liposomal DHA (Docosahexaenoic Acid) (Algal-derived)","mg":25},
    {"name":"EPA (Eicosapentaenoic Acid) (Algal-derived)","mg":25},
    {"name":"Astaxanthin","mg":25}
  ],"total_mg_per_serving":100},
  {"name_clean":"ToxiBind Matrix","ingredients":[
    {"name":"Calcium Bentonite Clay","mg":50},
    {"name":"Clinoptilolite Zeolite","mg":50},
    {"name":"Chlorella","mg":10}
  ],"total_mg_per_serving":110},
  {"name_clean":"Creatine HCL+","ingredients":[
    {"name":"Creatine Hydrochloride","mg":2000},
    {"name":"HMB-FA (Free Acid)","mg":1000},
    {"name":"Beta-Alanine (CarnoSyn®)","mg":800},
    {"name":"R-Alpha Lipoic Acid","mg":300},
    {"name":"Glycine","mg":100},
    {"name":"L-Ergothioneine","mg":12},
    {"name":"BioPerine® (Black Pepper)","mg":10},
    {"name":"Methylfolate (5-MTHF)","mg":0.4},
    {"name":"Methylcobalamin (B12)","mg":0.5},
    {"name":"Pyridoxal-5-Phosphate (B6)","mg":5},
    {"name":"Riboflavin-5-Phosphate (B2)","mg":5},
    {"name":"Thiamine HCL (B1)","mg":10},
    {"name":"Niacin (as Niacinamide)","mg":15}
  ],"total_mg_per_serving":4257.9},
  {"name_clean":"Catalyst+ Energy Multivitamin","ingredients":[
    {"name":"Magnesium Bisglycinate","mg":100},{"name":"Magnesium Citrate","mg":75},{"name":"Magnesium Malate","mg":75},{"name":"Magnesium Orotate","mg":50},{"name":"Magnesium Taurate","mg":50},{"name":"Magnesium L-Threonate","mg":50},
    {"name":"Methylfolate (5-MTHF)","mg":0.8},{"name":"Methylcobalamin (B12)","mg":0.5},{"name":"Pyridoxal-5-Phosphate (B6)","mg":25},{"name":"Riboflavin-5-Phosphate (B2)","mg":25},{"name":"Thiamine HCL (B1)","mg":25},{"name":"Niacin (as Niacinamide)","mg":50},
    {"name":"NNB DILEUCINE (DL 185™)","mg":75},{"name":"Liposomal L-Valine","mg":50},{"name":"Liposomal L-Methionine","mg":50},{"name":"Liposomal L-Tryptophan","mg":50},{"name":"Liposomal N-Acetyl L-Cysteine","mg":100},{"name":"Liposomal L-Ergothioneine","mg":10},
    {"name":"Liposomal Vitamin D3 (Cholecalciferol)","mg":0.125},{"name":"Liposomal Vitamin K2 (MK-7)","mg":0.2},{"name":"Liposomal Quercetin","mg":100},{"name":"Liposomal L-Taurine","mg":100},{"name":"Selenium (L-selenomethionine)","mg":0.2},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Micellar Bioperine®","mg":10}
  ],"total_mg_per_serving":1087.325},
  {"name_clean":"Replenish NAD+","ingredients":[
    {"name":"Liposomal NMN (Nicotinamide Mononucleotide)","mg":300},{"name":"Liposomal Pterostilbene","mg":50},{"name":"CoQ10 (Ubiquinol)","mg":100},{"name":"PQQ (Pyrroloquinoline Quinone)","mg":20},{"name":"Urolithin A","mg":100},{"name":"Calcium Alpha-Ketoglutarate","mg":100},{"name":"C15:0 (Pentadecanoic Acid)","mg":30},{"name":"Spermidine","mg":10},{"name":"Liposomal Quercetin","mg":25},{"name":"Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":740},
  {"name_clean":"Balance+ Gut Repair","ingredients":[
    {"name":"L-Glutamine","mg":100},{"name":"Liposomal N-Acetyl Glucosamine","mg":75},{"name":"Liposomal Curcumin (95% Curcuminoids)","mg":50},{"name":"Liposomal Saccharomyces Boulardii","mg":50},{"name":"Liposomal Quercetin","mg":30},{"name":"Butyrate (Sodium Butyrate)","mg":30},{"name":"Zinc Carnosine (PepZin GI®)","mg":20},{"name":"Micellar Aloe Vera Extract (200:1)","mg":15},{"name":"Micellar Ginger Root Extract (10:1)","mg":15},{"name":"Micellar Marshmallow Root Extract (10:1)","mg":30},{"name":"DigestiZorb+ Digestive Enzyme Complex","mg":75},{"name":"Papaya Extract (Papain enzyme)","mg":50},{"name":"Fennel Seed Extract (4:1)","mg":40},{"name":"Deglycyrrhizinated Licorice (DGL)","mg":25},{"name":"C15:0 (Pentadecanoic Acid, Fatty15)","mg":200},{"name":"Proprietary Probiotic Blend (10 Billion CFU)","mg":80},{"name":"Inulin-FOS (Prebiotic Blend)","mg":100}
  ],"total_mg_per_serving":985},
  {"name_clean":"Blast+ Nitric Oxide Stack","ingredients":[
    {"name":"Liposomal L-Citrulline Malate (25% active)","mg":250},{"name":"Liposomal Methylfolate (5-MTHF)","mg":0.8},{"name":"Liposomal Methylcobalamin (B12)","mg":1},{"name":"Liposomal Pyridoxal-5-Phosphate (B6)","mg":10},{"name":"Liposomal Vitamin C","mg":100},{"name":"Micellar Beetroot Extract (40% active)","mg":200},{"name":"Micellar BioPerine® (50% active)","mg":5},{"name":"Nitrosigine® (Bonded Complex)","mg":150}
  ],"total_mg_per_serving":716.8},
  {"name_clean":"NeuroCalm+","ingredients":[
    {"name":"Micellar Ashwagandha Root Extract (KSM-66®)","mg":300},{"name":"Micellar Rhodiola Rosea Extract","mg":150},{"name":"Micellar Schisandra Chinensis Extract","mg":100},{"name":"Holy Basil Extract (Ocimum sanctum)","mg":35},{"name":"Liposomal Saffron Extract (affron®)","mg":30},{"name":"Liposomal L-Theanine (Suntheanine®)","mg":150},{"name":"Liposomal GABA (PharmaGABA®)","mg":75},{"name":"Micellar Lion's Mane Extract (Hericium erinaceus)","mg":10},{"name":"Micellar BioPerine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":855},
  {"name_clean":"Relax+ Sleep Support","ingredients":[
    {"name":"Liposomal Melatonin (Extended-Release)","mg":3},{"name":"Tart Cherry Extract (10:1 Concentrate)","mg":200},{"name":"5-HTP (Griffonia simplicifolia Extract)","mg":100},{"name":"L-Glycine (Pure, Pharmaceutical Grade)","mg":500},{"name":"Apigenin (Chamomile Extract)","mg":50},{"name":"Liposomal Magnesium Bisglycinate","mg":200},{"name":"Micellar Broad-Spectrum CBD","mg":25},{"name":"Micellar CBN Isolate","mg":10},{"name":"Micellar BioPerine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":1093},
  {"name_clean":"Clean+ Detox & Liver Health","ingredients":[
    {"name":"Liposomal Glutathione Complex (25% active)","mg":80},{"name":"Liposomal NAC Complex (25% active)","mg":40},{"name":"Liposomal Milk Thistle Complex (25% active)","mg":40},{"name":"Liposomal TUDCA Complex (25% active)","mg":40},{"name":"Liposomal Curcumin Complex (40% active)","mg":50},{"name":"Liposomal Berberine Complex (25% active)","mg":40},{"name":"Liposomal L-Methionine Complex (40% active)","mg":50},{"name":"Micellar Dandelion Root (50% active)","mg":20},{"name":"Micellar Chlorella (50% active)","mg":20},{"name":"Micellar Cilantro (50% active)","mg":20},{"name":"Micellar Black Walnut (50% active)","mg":20},{"name":"Micellar Pumpkin Seed (50% active)","mg":20},{"name":"Micellar Artichoke (50% active)","mg":20},{"name":"Micellar Clove (50% active)","mg":20},{"name":"Micellar Garlic (50% active)","mg":20},{"name":"Micellar Fulvic Acid (50% active)","mg":20},{"name":"Micellar Oregano Oil (50% active)","mg":20},{"name":"ToxiBind Matrix (Zeolite + Bentonite)","mg":100},{"name":"DigestiZorb+ Enzyme Complex","mg":80},{"name":"Liposomal Choline (Alpha-GPC 50%)","mg":60},{"name":"Inositol","mg":200}
  ],"total_mg_per_serving":980},
  {"name_clean":"Teloprime+ Telomere Support","ingredients":[
    {"name":"Astragalus","mg":400},{"name":"Cycloastragenol","mg":50},{"name":"Centella Asiatica Extract","mg":600},{"name":"Liposomal Vitamin D3 (Cholecalciferol)","mg":0.5},{"name":"Liposomal Vitamin K2 (Menaquinone-7)","mg":0.1},{"name":"Liposomal Trans-Resveratrol","mg":200},{"name":"AC-11 (rainforest cat's claw extract)","mg":500},{"name":"Liposomal Vitamin C","mg":500},{"name":"Zinc Bisglycinate","mg":30},{"name":"Korean Ginseng (Ginsenosides)","mg":200},{"name":"B6 ,  Pyridoxine","mg":10},{"name":"Liposomal B9 ,  Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal B12 ,  Methylcobalamin","mg":2},{"name":"Algal Phospholipid Matrix (carrier base)","mg":90},{"name":"Liposomal DHA (Algal-derived)","mg":90},{"name":"EPA (Eicosapentaenoic Acid) (Algal-derived)","mg":120},{"name":"C15:0 (Pentadecanoic Acid)","mg":200}
  ],"total_mg_per_serving":2993.4},
  {"name_clean":"DigestiZorb+ Enzyme Complex","ingredients":[
    {"name":"Protease (acid-stable blend)","mg":15},{"name":"Amylase","mg":20},{"name":"Lipase","mg":10},{"name":"Lactase","mg":10},{"name":"Cellulase","mg":5},{"name":"Bromelain (from Pineapple extract)","mg":5},{"name":"Papaya Extract (Papain enzyme)","mg":5},{"name":"Micellar Ginger Root Extract (10:1)","mg":5},{"name":"Fennel Seed Extract (4:1)","mg":3},{"name":"Liposomal Pepsin","mg":5},{"name":"Black Pepper Extract (Bioperine®)","mg":2}
  ],"total_mg_per_serving":85},
  {"name_clean":"Focus+ Nootropic Formula","ingredients":[
    {"name":"Lion's Mane Extract (Micellar) 30% Polysaccharides","mg":500},{"name":"Bacopa Monnieri Extract (Micellar) 50% Bacosides","mg":300},{"name":"Paraxanthine (Liposomal) enfinity®","mg":100},{"name":"L-Theanine (Liposomal) Suntheanine®","mg":200},{"name":"CoQ10 - Ubiquinol (Liposomal) Kaneka QH®","mg":100},{"name":"Ginkgo Biloba Extract (Micellar) 24% Flavone Glycosides","mg":120},{"name":"Rhodiola Rosea Extract (Micellar) 5% Rosavins","mg":200},{"name":"BioPerine® (Micellar) 95% Piperine","mg":10}
  ],"total_mg_per_serving":1530},
  {"name_clean":"Rise+ Male Testosterone","ingredients":[
    {"name":"Micellar Tongkat Ali (40% active)","mg":200},{"name":"Micellar Fadogia Agrestis (40% active)","mg":100},{"name":"Micellar Ashwagandha (40% active)","mg":150},{"name":"Micellar Horny Goat Weed (40% active)","mg":50},{"name":"Micellar Shilajit (40% active)","mg":100},{"name":"L-Citrulline Malate (2:1)","mg":150},{"name":"Zinc Bisglycinate","mg":15},{"name":"DIM (99% pure)","mg":100}
  ],"total_mg_per_serving":865},
  {"name_clean":"Flex+ Joint & Inflammation","ingredients":[
    {"name":"Proprietary Omega-3 Phospholipid Complex","mg":100},{"name":"Liposomal Curcumin Complex","mg":125},{"name":"Liposomal Boswellia Serrata Extract (AprèsFlex®)","mg":150},{"name":"Quercetin Phytosome (Quercefit®)","mg":100},{"name":"Liposomal Hyaluronic Acid (Low MW)","mg":60},{"name":"Liposomal Type II Collagen (UC-II®)","mg":40},{"name":"MSM (Methylsulfonylmethane)","mg":75},{"name":"Micellar Astaxanthin (AstaPure®)","mg":15},{"name":"Micellar Ginger Root Extract (20:1)","mg":50}
  ],"total_mg_per_serving":715},
  {"name_clean":"Iron+ Red Blood Cell Support","ingredients":[
    {"name":"Liposomal Vitamin D3 (Cholecalciferol)","mg":0.25},{"name":"Liposomal Vitamin K2 (Menaquinone-7)","mg":0.05},{"name":"Selenium (L-Selenomethionine)","mg":0.1},{"name":"Liposomal Vitamin C (Ascorbic Acid)","mg":250},{"name":"Quercetin (Sophora japonica)","mg":125},{"name":"Micellar BioPerine® (Black Pepper Extract)","mg":25},{"name":"Copper (Bisglycinate Chelate)","mg":1},{"name":"Zinc (Bisglycinate Chelate)","mg":7.5},{"name":"Molybdenum (Glycinate Chelate)","mg":0.75},{"name":"Liposomal L-Glutathione (Reduced)","mg":125},{"name":"Liposomal N-Acetylcysteine (NAC)","mg":150},{"name":"Liposomal Alpha-Lipoic Acid (ALA)","mg":100},{"name":"Liposomal L-Ergothioneine","mg":50},{"name":"Liposomal Phosphatidylserine","mg":50}
  ],"total_mg_per_serving":884.65},
  {"name_clean":"NeuroCalm BH4+ (Advanced)","ingredients":[
    {"name":"L-Dopa (from Mucuna pruriens extract)","mg":30},{"name":"Liposomal L-Tyrosine","mg":25},{"name":"L-Phenylalanine","mg":15},{"name":"Liposomal PQQ (Pyrroloquinoline Quinone)","mg":10},{"name":"Liposomal Coenzyme Q10 (Ubiquinol)","mg":10},{"name":"Liposomal 5-MTHF (5-Methyltetrahydrofolate)","mg":10},{"name":"L-Citrulline Malate","mg":15},{"name":"L-Arginine","mg":10},{"name":"Liposomal Vitamin C","mg":10},{"name":"Liposomal L-Theanine","mg":15},{"name":"Liposomal Magnesium L-Threonate","mg":10},{"name":"Micellar Lion's Mane Extract (Hericenones)","mg":10},{"name":"Lithium Orotate (Elemental Lithium ~1 mg)","mg":5}
  ],"total_mg_per_serving":175},
  {"name_clean":"Histamine Relief Protocol","ingredients":[
    {"name":"BioB Fusion Methylated B Complex","mg":35},{"name":"Digestzorb Probiotic Blend (10B CFU)","mg":150},{"name":"Liposomal BPC-157 Peptide","mg":0.2},{"name":"Liposomal Quercetin (Aglycone)","mg":100},{"name":"Liposomal Magnesium (Bisglycinate)","mg":50},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Liposomal Curcumin (95% Curcuminoids)","mg":50},{"name":"Liposomal DAO Enzyme (from porcine kidney)","mg":0.2},{"name":"Liposomal Copper (Bisglycinate)","mg":2},{"name":"Liposomal Vitamin C (Ascorbate)","mg":50},{"name":"Liposomal L-Theanine","mg":100},{"name":"Micellar Aloe Vera","mg":25},{"name":"Micellar Marshmallow Root","mg":25},{"name":"Liposomal Berberine HCl","mg":50},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":657.4},
  {"name_clean":"NeuroAxis+","ingredients":[
    {"name":"L-Methylfolate","mg":2},{"name":"Methylcobalamin B12","mg":1},{"name":"Pyridoxal-5-Phosphate (P5P)","mg":15},{"name":"Riboflavin-5-Phosphate","mg":10},{"name":"Magnesium L-Threonate","mg":80},{"name":"Citicoline","mg":150},{"name":"Phosphatidylserine","mg":100},{"name":"Lion's Mane Extract","mg":80},{"name":"Bacopa Monnieri Extract","mg":60},{"name":"L-Theanine","mg":50},{"name":"N-Acetyl L-Tyrosine","mg":40},{"name":"SAMe","mg":30},{"name":"Alpha-GPC","mg":25},{"name":"Pterostilbene","mg":15},{"name":"Huperzine A","mg":0.2},{"name":"Bioperine®","mg":5},{"name":"Liposomal/Micellar Matrix","mg":36.8}
  ],"total_mg_per_serving":700},
  {"name_clean":"ThyroCalm-G+","ingredients":[
    {"name":"L-Carnitine","mg":80},{"name":"Selenium","mg":0.15},{"name":"Vitamin D3","mg":0.05},{"name":"Zinc","mg":15},{"name":"Bugleweed Extract","mg":100},{"name":"Lemon Balm Extract","mg":80},{"name":"N-Acetyl Cysteine (NAC)","mg":75},{"name":"L-Glutathione","mg":50},{"name":"R-Alpha Lipoic Acid","mg":40},{"name":"Curcumin","mg":60},{"name":"Quercetin","mg":50},{"name":"L-Methylfolate","mg":1},{"name":"Methylcobalamin B12","mg":0.5},{"name":"Pyridoxal-5-Phosphate","mg":10},{"name":"Magnesium Glycinate","mg":50},{"name":"Ashwagandha Extract","mg":40},{"name":"Phosphatidylserine","mg":30},{"name":"L-Glutamine","mg":25},{"name":"Vitamin C","mg":20},{"name":"Bioperine®","mg":3},{"name":"Liposomal/Micellar Matrix","mg":40.65}
  ],"total_mg_per_serving":770.35},
  {"name_clean":"Shred+","ingredients":[
    {"name":"Liposomal Phospholipids (Sunflower Lecithin)","mg":80},{"name":"Liposomal Alpha Lipoic Acid (R-ALA)","mg":15},{"name":"BHB Ketone Salts","mg":500},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5},{"name":"Liposomal Choline (Alpha-GPC)","mg":10},{"name":"Liposomal CoQ10 (Ubiquinone)","mg":10},{"name":"Liposomal L-Ergothioneine","mg":2},{"name":"Natural GLP-1 Activator Complex","mg":350},{"name":"Glycine (USP)","mg":10},{"name":"Probiotic Blend (10 Billion CFU)","mg":250},{"name":"Liposomal Tesofensine","mg":0.5}
  ],"total_mg_per_serving":1232.5},
  {"name_clean":"DESIRE+ Female Hormonal","ingredients":[
    {"name":"Micellar Tongkat Ali Extract (200:1)","mg":50},{"name":"Micellar Tribulus Terrestris (60% Saponins)","mg":50},{"name":"Micellar Shilajit Extract (Fulvic Acid 20%)","mg":25},{"name":"Micellar Sea Moss Extract","mg":20},{"name":"Maca Root Extract (10:1)","mg":40},{"name":"Micellar Ashwagandha Extract (5% Withanolides)","mg":50},{"name":"L-Citrulline","mg":40},{"name":"Micellar Schisandra Chinensis Extract","mg":20},{"name":"Micellar Cistanche Tubulosa Extract","mg":50},{"name":"L-Arginine","mg":10},{"name":"Micellar Horny Goat Weed (Icariin 10%)","mg":20},{"name":"Liposomal Trans-Resveratrol (98%)","mg":50},{"name":"Micellar Cordyceps Extract (7% Polysaccharides)","mg":40},{"name":"Micellar Panax Ginseng Extract (10:1)","mg":20},{"name":"Zinc (Zinc Bisglycinate)","mg":10},{"name":"Micellar Bioperine® (Black Pepper Extract, 95%)","mg":5}
  ],"total_mg_per_serving":500},
  {"name_clean":"Grow+ Pre-Natal Formula","ingredients":[
    {"name":"MethylB Complete+ B Complex","mg":32},{"name":"Iron (as Ferrous Bisglycinate)","mg":27},{"name":"Calcium (Citrate & MCHC)","mg":400},{"name":"Liposomal Vitamin D3 (Cholecalciferol) (2000 IU)","mg":0.5},{"name":"Liposomal Vitamin K2 (Menaquinone-7)","mg":0.2},{"name":"Liposomal Choline (Alpha-GPC)","mg":450},{"name":"Iodine (as Potassium Iodide)","mg":2.2},{"name":"Liposomal Magnesium Synergy Matrix","mg":350},{"name":"Zinc (as Zinc Bisglycinate)","mg":15},{"name":"Liposomal Vitamin C (L-Ascorbic Acid)","mg":120}
  ],"total_mg_per_serving":1396.9},
  {"name_clean":"Revitalizher Postnatal+","ingredients":[
    {"name":"MethylB Complete+ B Complex","mg":35},{"name":"Proprietary Omega-3 DHA/EPA (Algal Source)","mg":200},{"name":"Proprietary Full-Spectrum Amino Acid Matrix","mg":180},{"name":"Digestzorb Probiotic Blend (10B CFU)","mg":75},{"name":"NeuroCalm BH4 Complex","mg":250},{"name":"Liposomal Magnesium Synergy Matrix","mg":150},{"name":"Iron (Ferrous Bisglycinate)","mg":10},{"name":"Liposomal Vitamin D3 (Cholecalciferol)","mg":2},{"name":"Liposomal Vitamin K2 (MK-7)","mg":1},{"name":"Zinc (Zinc Bisglycinate)","mg":5},{"name":"Iodine (Potassium Iodide)","mg":1},{"name":"Liposomal Choline (Alpha-GPC)","mg":10},{"name":"Lithium Orotate","mg":10},{"name":"Micellar Fenugreek Extract (10:1, 50% Saponins)","mg":5},{"name":"Liposomal Coenzyme Q10 (Ubiquinol)","mg":5}
  ],"total_mg_per_serving":939},
  {"name_clean":"Thrive+ Post-Natal GLP-1","ingredients":[
    {"name":"BPC 157","mg":0.2},{"name":"MethylB Complete+ B Complex","mg":76.3},{"name":"Magnesium Citrate","mg":25},{"name":"Liposomal Omega-3 DHA","mg":200},{"name":"NeuroCalm BH4 Complex","mg":250},{"name":"GLP-1 Activator Complex","mg":425},{"name":"Iron (Ferrous Bisglycinate)","mg":5},{"name":"Liposomal Vitamin D3 (Cholecalciferol)","mg":5},{"name":"Liposomal Vitamin K2 (MK-7)","mg":5},{"name":"Liposomal Vitamin E (Tocotrienol Complex)","mg":5},{"name":"Iodine (Potassium Iodide)","mg":5},{"name":"Liposomal Choline (Alpha-GPC)","mg":5},{"name":"Liposomal CoQ10 (Ubiquinone)","mg":5},{"name":"Liposomal L-Ergothioneine","mg":2},{"name":"Liposomal Taurine","mg":5},{"name":"Liposomal Tyrosine","mg":5},{"name":"Zinc Bisglycinate","mg":15}
  ],"total_mg_per_serving":1038.5},
  {"name_clean":"CycleSync+","ingredients":[
    {"name":"Liposomal Vitex Agnus-Castus (Chasteberry) Extract","mg":200},{"name":"Liposomal DIM (Diindolylmethane)","mg":100},{"name":"Liposomal Black Cohosh Extract","mg":30},{"name":"Liposomal Evening Primrose Oil (EPO)","mg":250},{"name":"Liposomal Calcium D-Glucarate","mg":150},{"name":"Liposomal Phosphatidylcholine (PC)","mg":300},{"name":"Micellar Myo-Inositol","mg":500},{"name":"Micellar Magnesium Glycinate","mg":150},{"name":"Micellar B6 (Pyridoxal-5-Phosphate)","mg":50},{"name":"Micellar NAC (N-Acetyl Cysteine)","mg":250},{"name":"Micellar Zinc Bisglycinate","mg":15},{"name":"Micellar 5-MTHF (Folate)","mg":0.4},{"name":"Micellar Methylcobalamin (B12)","mg":1}
  ],"total_mg_per_serving":1996.4},
  {"name_clean":"MenoBalance+","ingredients":[
    {"name":"Liposomal Red Clover Isoflavones","mg":80},{"name":"Liposomal Black Cohosh Extract","mg":40},{"name":"Liposomal DIM (Diindolylmethane)","mg":150},{"name":"Liposomal Wild Yam Extract","mg":150},{"name":"Liposomal Dong Quai (Angelica sinensis)","mg":150},{"name":"Liposomal Phosphatidylserine","mg":200},{"name":"Micellar Ashwagandha Root Extract","mg":300},{"name":"Micellar Maca Root Extract","mg":500},{"name":"Micellar Magnesium Glycinate","mg":300},{"name":"Micellar Calcium Citrate","mg":500},{"name":"Micellar Vitamin D3 (Cholecalciferol)","mg":1},{"name":"Micellar Boron Glycinate","mg":3},{"name":"Micellar B6 (Pyridoxal-5-Phosphate)","mg":50}
  ],"total_mg_per_serving":2424},
  {"name_clean":"Radiance+","ingredients":[
    {"name":"Liposomal Astaxanthin","mg":12},{"name":"Liposomal Ubiquinol (CoQ10)","mg":100},{"name":"Liposomal Mixed Tocopherols + Tocotrienols","mg":0.2},{"name":"Liposomal Evening Primrose GLA","mg":300},{"name":"Liposomal Ceramide Complex","mg":100},{"name":"Liposomal Lutein","mg":20},{"name":"Liposomal Zeaxanthin","mg":4},{"name":"Micellar Biotin (Vitamin B7)","mg":0.5},{"name":"Micellar Vitamin C (Ascorbic Acid)","mg":500},{"name":"Micellar MSM (Methylsulfonylmethane)","mg":1000},{"name":"Micellar Hyaluronic Acid","mg":200},{"name":"Micellar Bamboo Silica Extract","mg":300},{"name":"Micellar Zinc Bisglycinate","mg":15},{"name":"Micellar L-Lysine HCl","mg":500},{"name":"Micellar Horsetail Extract (Equisetum)","mg":300}
  ],"total_mg_per_serving":3351.7},
  {"name_clean":"ThyroBalance+","ingredients":[
    {"name":"Liposomal Ashwagandha Root Extract","mg":600},{"name":"Liposomal Selenium (Selenomethionine)","mg":0.2},{"name":"Liposomal Guggulsterones","mg":50},{"name":"Liposomal Mixed Tocopherols","mg":0.2},{"name":"Liposomal Phosphatidylserine","mg":200},{"name":"Liposomal Bladderwrack Extract","mg":250},{"name":"Micellar L-Tyrosine","mg":500},{"name":"Micellar Iodine (Potassium Iodide)","mg":150},{"name":"Micellar Magnesium Glycinate","mg":200},{"name":"Micellar Iron Bisglycinate","mg":18},{"name":"Micellar Rhodiola Rosea Extract","mg":300},{"name":"Micellar Eleuthero Root Extract","mg":200},{"name":"Micellar B-Complex (Comprehensive)","mg":35},{"name":"Micellar Zinc Bisglycinate","mg":15}
  ],"total_mg_per_serving":2518.4},
  {"name_clean":"Sproutables Infant Tincture","ingredients":[
    {"name":"MethylB Complete+ B Complex","mg":35},{"name":"Proprietary Probiotic Blend (10B CFU)","mg":10},{"name":"Liposomal Vitamin A (Retinyl Palmitate)","mg":0.04},{"name":"Liposomal Vitamin D3 (Cholecalciferol)","mg":0.01},{"name":"Liposomal Vitamin E (D-Alpha Tocopherol)","mg":4},{"name":"Liposomal Vitamin K1 (Phylloquinone)","mg":0.002},{"name":"Liposomal Vitamin C (Ascorbic Acid)","mg":25},{"name":"Liposomal Iron (Ferrous Bisglycinate)","mg":2},{"name":"Liposomal Iodine (Potassium Iodide)","mg":0.011},{"name":"Zinc (Carnosine)","mg":1},{"name":"Organic MCT Oil (Carrier)","mg":30},{"name":"Organic Fruit Extract (Natural Flavor)","mg":5}
  ],"total_mg_per_serving":112.063},
  {"name_clean":"Sproutables Toddler Tablets","ingredients":[
    {"name":"MethylB Complete+ B Complex","mg":35},{"name":"Liposomal Magnesium Synergy Matrix","mg":15},{"name":"Probiotic Blend (10B CFU)","mg":10},{"name":"Omega-3 DHA/EPA (Algal Oil)","mg":10},{"name":"Vitamin A (Retinyl Acetate, Liposomal)","mg":0.6},{"name":"Vitamin D3 (Cholecalciferol, Liposomal)","mg":0.015},{"name":"Vitamin E (D-Alpha Tocopherol, Liposomal)","mg":6},{"name":"Vitamin K2 (Menaquinone-7, Liposomal)","mg":0.01},{"name":"Vitamin C (Liposomal Ascorbic Acid)","mg":15},{"name":"Iron (Ferrous Bisglycinate, Liposomal)","mg":7},{"name":"Iodine (Potassium Iodide, Liposomal)","mg":0.09},{"name":"Zinc (Zinc Carnosine)","mg":3},{"name":"Calcium (Calcium Citrate Malate, Liposomal)","mg":20},{"name":"DHA (Docosahexaenoic Acid, Liposomal)","mg":50},{"name":"Crocin (Saffron Extract 10%)","mg":0.5},{"name":"Choline (Choline Bitartrate, Liposomal)","mg":50},{"name":"Organic Fruit Extract Blend","mg":5}
  ],"total_mg_per_serving":227.215},
  {"name_clean":"Sproutables Children Gummies","ingredients":[
    {"name":"MethylB Complete+ B Complex","mg":10},{"name":"Liposomal Magnesium Synergy Matrix","mg":10},{"name":"Probiotic Blend (10B CFU)","mg":5},{"name":"Omega-3 DHA/EPA (Algal Oil)","mg":5},{"name":"Vitamin A (Beta-Carotene, Liposomal)","mg":0.45},{"name":"Vitamin D3 (Cholecalciferol, Liposomal)","mg":0.015},{"name":"Vitamin E (D-Alpha Tocopherol, Liposomal)","mg":2},{"name":"Vitamin K2 (Menaquinone-7, Liposomal)","mg":0.03},{"name":"Vitamin C (Liposomal Ascorbic Acid)","mg":5},{"name":"Iron (Ferrous Fumarate)","mg":1},{"name":"Iodine (Potassium Iodide)","mg":0.12},{"name":"Zinc (Zinc Carnosine)","mg":2},{"name":"Calcium (Calcium Citrate Malate)","mg":10},{"name":"Crocin (Saffron Extract 10%)","mg":0.05},{"name":"Choline (Choline Bitartrate, Liposomal)","mg":10},{"name":"Organic Pectin (Gelling Agent)","mg":10},{"name":"Organic Stevia Extract (Natural Sweetener)","mg":10},{"name":"Organic Fruit Extract Blend","mg":10}
  ],"total_mg_per_serving":90.665},
  {"name_clean":"ACAT+ Mitochondrial Support","ingredients":[
    {"name":"Liposomal Acetyl-L-Carnitine","mg":100},{"name":"Methylated Riboflavin-5-Phosphate (B2)","mg":50},{"name":"Methylated Niacinamide (B3)","mg":50},{"name":"Methylated Pantethine (B5)","mg":50},{"name":"Liposomal B9 Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin)","mg":1},{"name":"Liposomal Coenzyme Q10 (Ubiquinone)","mg":100},{"name":"Liposomal Alpha-Lipoic Acid","mg":20},{"name":"Liposomal Phosphatidylcholine","mg":100},{"name":"Liposomal N-Acetyl Cysteine (NAC)","mg":10},{"name":"Liposomal L-Taurine","mg":10},{"name":"Liposomal Magnesium Bisglycinate","mg":10},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":506.8},
  {"name_clean":"ACHY+ Acetylcholine Support","ingredients":[
    {"name":"Liposomal Choline Alpha-GPC","mg":100},{"name":"Liposomal Acetyl-L-Carnitine","mg":100},{"name":"Liposomal Citicoline (CDP-Choline)","mg":100},{"name":"Micellar Bacopa Monnieri Extract (Bacosides ≥50%)","mg":100},{"name":"Methylated Pantethine (B5)","mg":25},{"name":"Liposomal Vitamin B12 (Methylcobalamin)","mg":1},{"name":"Liposomal Phosphatidylserine","mg":25},{"name":"Micellar Huperzine A (from Huperzia serrata)","mg":0.2},{"name":"Liposomal Phosphatidylcholine","mg":50},{"name":"Liposomal Uridine Monophosphate","mg":50},{"name":"Liposomal L-Theanine","mg":100},{"name":"Liposomal Magnesium L-Threonate","mg":50},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":706.2},
  {"name_clean":"ADO Support+ Purine Metabolism","ingredients":[
    {"name":"Methylated Riboflavin-5-Phosphate (B2)","mg":50},{"name":"Liposomal B9 Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin)","mg":1},{"name":"Adenosine Triphosphate (ATP)","mg":25},{"name":"Liposomal N-Acetylcysteine (NAC)","mg":100},{"name":"Liposomal L-Theanine","mg":100},{"name":"Liposomal Curcumin Extract (95% Curcuminoids)","mg":100},{"name":"S-Adenosylmethionine (SAMe)","mg":100},{"name":"Liposomal Magnesium Bisglycinate","mg":15},{"name":"Liposomal Phosphatidylcholine","mg":100},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":596.8},
  {"name_clean":"BHMT+ Methylation Support","ingredients":[
    {"name":"Betaine Anhydrous (Trimethylglycine)","mg":250},{"name":"DMG (Dimethylglycine)","mg":50},{"name":"Zinc Bisglycinate","mg":15},{"name":"Liposomal Magnesium L-Threonate","mg":50},{"name":"Liposomal L-Taurine","mg":50},{"name":"Liposomal Choline Alpha-GPC","mg":100},{"name":"Liposomal B9 Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin)","mg":1},{"name":"Liposomal N-Acetylcysteine (NAC)","mg":50},{"name":"TMG (Trimethylglycine Hydrochloride)","mg":100},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":671.8},
  {"name_clean":"CBS Support+ Sulfur Pathway","ingredients":[
    {"name":"Molybdenum (Glycinate Chelate)","mg":0.5},{"name":"Methylated Vitamin B6 (P-5-P)","mg":25},{"name":"L-Serine","mg":100},{"name":"Liposomal NAC (N-Acetylcysteine)","mg":50},{"name":"L-Carnitine Tartrate","mg":100},{"name":"Liposomal Taurine","mg":50},{"name":"TMG (Trimethylglycine)","mg":100},{"name":"Liposomal Glutathione (Reduced)","mg":100},{"name":"Liposomal Magnesium Bisglycinate","mg":50},{"name":"L-Ornithine","mg":50},{"name":"Liposomal Silymarin (Milk Thistle 80%)","mg":100},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":730.5},
  {"name_clean":"COMT+ Neurotransmitter Balance","ingredients":[
    {"name":"Liposomal Magnesium Bisglycinate","mg":100},{"name":"SAMe (S-Adenosylmethionine)","mg":20},{"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Methylated Vitamin B6 (P-5-P)","mg":25},{"name":"Liposomal Folate (5-MTHF Calcium Salt)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin)","mg":1},{"name":"Lithium Orotate","mg":2.5},{"name":"Liposomal L-Theanine","mg":100},{"name":"Diindolylmethane (DIM)","mg":100},{"name":"Liposomal Quercetin","mg":100},{"name":"Liposomal Glutathione (Reduced)","mg":100},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":579.3},
  {"name_clean":"DAO+ Histamine Balance","ingredients":[
    {"name":"Methylated Vitamin B6 (P-5-P)","mg":25},{"name":"Liposomal Vitamin C (Ascorbate)","mg":100},{"name":"Copper (Bisglycinate)","mg":2},{"name":"Zinc (Bisglycinate)","mg":20},{"name":"Liposomal Quercetin (Aglycone)","mg":100},{"name":"DAO Enzyme (from Non-GMO Porcine Kidney)","mg":0.2},{"name":"Liposomal Magnesium (Bisglycinate)","mg":125},{"name":"Liposomal 5-MTHF (Quatrefolic®)","mg":0.8},{"name":"Liposomal Methylcobalamin (B12)","mg":1},{"name":"Liposomal Curcumin (95% Curcuminoids)","mg":150},{"name":"Liposomal L-Theanine","mg":100},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":629},
  {"name_clean":"GST+ Cellular Detox","ingredients":[
    {"name":"Liposomal Glutathione (Reduced)","mg":150},{"name":"Liposomal N-Acetylcysteine (NAC)","mg":100},{"name":"Liposomal Alpha-Lipoic Acid (R-ALA)","mg":100},{"name":"Selenium (L-Selenomethionine)","mg":0.2},{"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Liposomal Vitamin B6 (Pyridoxal-5-Phosphate)","mg":25},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin + Hydroxocobalamin)","mg":1},{"name":"Liposomal Broccoli Seed Extract (Sulforaphane-rich)","mg":150},{"name":"Liposomal Curcumin (95% Curcuminoids)","mg":100},{"name":"Liposomal Quercetin","mg":100},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":757},
  {"name_clean":"MAOA+ Neurochemical Balance","ingredients":[
    {"name":"SAMe (S-Adenosyl Methionine)","mg":100},{"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Methylated Vitamin B6 (Pyridoxal-5-Phosphate)","mg":25},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin + Hydroxocobalamin)","mg":1},{"name":"Liposomal L-Theanine","mg":50},{"name":"Liposomal Magnesium (Bisglycinate)","mg":50},{"name":"Liposomal GABA (Gamma-Aminobutyric Acid)","mg":100},{"name":"Micellar Ashwagandha Extract (Sensoril®)","mg":125},{"name":"Micellar Rhodiola Rosea (3% Rosavins)","mg":100},{"name":"Liposomal PQQ (Pyrroloquinoline Quinone)","mg":20},{"name":"Liposomal CoQ10 (Ubiquinol)","mg":50},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":651.8},
  {"name_clean":"MTHFR+ Folate Metabolism","ingredients":[
    {"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Methylated Vitamin B6 (Pyridoxal-5-Phosphate)","mg":30},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":1},{"name":"Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin)","mg":2},{"name":"SAMe (S-Adenosyl Methionine)","mg":200},{"name":"Liposomal Magnesium (Bisglycinate)","mg":100},{"name":"Liposomal Choline (as Alpha-GPC)","mg":150},{"name":"Zinc (Bisglycinate)","mg":20},{"name":"Liposomal NAC (N-Acetylcysteine)","mg":250},{"name":"Molybdenum (Glycinate)","mg":0.2},{"name":"Betaine Anhydrous (Trimethylglycine)","mg":200},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":983.2},
  {"name_clean":"MTR+ Methylation Matrix","ingredients":[
    {"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Methylated Vitamin B6 (Pyridoxal-5-Phosphate)","mg":25},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin + Hydroxocobalamin)","mg":1.5},{"name":"SAMe (S-Adenosyl Methionine)","mg":200},{"name":"Betaine Anhydrous (Trimethylglycine)","mg":300},{"name":"Liposomal Magnesium (Bisglycinate)","mg":100},{"name":"Liposomal Choline (as Alpha-GPC)","mg":100},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Liposomal NAC (N-Acetylcysteine)","mg":150},{"name":"Liposomal PQQ (Pyrroloquinoline Quinone)","mg":20},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":942.3},
  {"name_clean":"MTRR+ Methylcobalamin Regen","ingredients":[
    {"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Methylated Vitamin B3 (Nicotinamide Riboside)","mg":100},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin)","mg":1.5},{"name":"SAMe (S-Adenosyl Methionine)","mg":200},{"name":"Liposomal Magnesium (Bisglycinate)","mg":100},{"name":"Liposomal Choline (as Alpha-GPC)","mg":100},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Liposomal NAC (N-Acetylcysteine)","mg":150},{"name":"Molybdenum (Glycinate)","mg":0.2},{"name":"Liposomal PQQ (Pyrroloquinoline Quinone)","mg":10},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":707.5},
  {"name_clean":"NAT Support+ Acetylation","ingredients":[
    {"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Vitamin B5 (Pantethine)","mg":100},{"name":"Methylated Vitamin B6 (Pyridoxal-5-Phosphate)","mg":30},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin)","mg":1},{"name":"Liposomal Acetyl-L-Carnitine (ALCAR)","mg":150},{"name":"Liposomal Magnesium (Bisglycinate)","mg":100},{"name":"Liposomal Choline (as Alpha-GPC)","mg":100},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Liposomal NAC (N-Acetylcysteine)","mg":200},{"name":"Liposomal Quercetin","mg":100},{"name":"Calcium-D-Glucarate","mg":100},{"name":"Liposomal Sulforaphane (Broccoli Seed Extract)","mg":50},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":976.8},
  {"name_clean":"NOS+ Vascular Integrity","ingredients":[
    {"name":"MethylB Complete+ B Complex","mg":80},{"name":"L-Citrulline Malate (2:1)","mg":150},{"name":"L-Arginine","mg":100},{"name":"L-Norvaline","mg":50},{"name":"Liposomal Magnesium (Bisglycinate)","mg":50},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"NeuroCalm BH4 Complex","mg":175},{"name":"Liposomal CoQ10 (Ubiquinol)","mg":50},{"name":"Liposomal Trans-Resveratrol (98%)","mg":25},{"name":"Liposomal Grape Seed Extract (95% OPC)","mg":10},{"name":"Astaxanthin","mg":10},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":720},
  {"name_clean":"RFC1 Support+ Folate Transport","ingredients":[
    {"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Methylated Vitamin B6 (Pyridoxal-5-Phosphate)","mg":30},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":1},{"name":"Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin)","mg":1.5},{"name":"Folinic Acid (Calcium Folinate)","mg":0.8},{"name":"Trimethylglycine (TMG)","mg":150},{"name":"Liposomal Magnesium (Bisglycinate)","mg":100},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Liposomal L-Tyrosine","mg":100},{"name":"Liposomal DHA (Algal-Based, Vegan)","mg":100},{"name":"Liposomal N-Acetylcysteine (NAC)","mg":100},{"name":"Liposomal Curcumin (95% Curcuminoids)","mg":50},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":678.3},
  {"name_clean":"SHMT+ Glycine-Folate Balance","ingredients":[
    {"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Methylated Vitamin B6 (Pyridoxal-5-Phosphate)","mg":30},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin + Adenosylcobalamin)","mg":1},{"name":"Folinic Acid (Calcium Folinate)","mg":0.8},{"name":"L-Glycine","mg":100},{"name":"Liposomal Magnesium (Bisglycinate)","mg":50},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Serine","mg":100},{"name":"Liposomal DHA (Algal-Based, Vegan)","mg":100},{"name":"Liposomal N-Acetylcysteine (NAC)","mg":100},{"name":"Betaine (Trimethylglycine - TMG)","mg":100},{"name":"Liposomal Curcumin (95% Curcuminoids)","mg":100},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":727.6},
  {"name_clean":"SOD+ Antioxidant Defense","ingredients":[
    {"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Methylated Vitamin B6 (Pyridoxal-5-Phosphate)","mg":25},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin)","mg":1},{"name":"Superoxide Dismutase (SOD)","mg":50},{"name":"Selenium (L-selenomethionine)","mg":0.2},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Manganese (Gluconate)","mg":2},{"name":"Liposomal CoQ10 (Ubiquinol)","mg":25},{"name":"Liposomal N-Acetylcysteine (NAC)","mg":200},{"name":"Liposomal Curcumin (95% Curcuminoids)","mg":100},{"name":"Liposomal Alpha-Lipoic Acid (ALA)","mg":100},{"name":"Liposomal PQQ (Pyrroloquinoline Quinone)","mg":20},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":569},
  {"name_clean":"SUOX+ Sulfite Clearance","ingredients":[
    {"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":25},{"name":"Methylated Vitamin B6 (Pyridoxal-5-Phosphate)","mg":25},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin)","mg":1},{"name":"Molybdenum (as Glycinate Chelate)","mg":0.5},{"name":"Selenium (L-selenomethionine)","mg":100},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Liposomal Glutathione (Reduced Form)","mg":100},{"name":"Liposomal CoQ10 (Ubiquinol)","mg":50},{"name":"Liposomal N-Acetylcysteine (NAC)","mg":50},{"name":"Liposomal Taurine","mg":100},{"name":"Liposomal Alpha-Lipoic Acid (ALA)","mg":100},{"name":"MSM (Methylsulfonylmethane)","mg":100},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":672.3},
  {"name_clean":"TCN2+ B12 Transport","ingredients":[
    {"name":"Methylated Vitamin B2 (Riboflavin-5-Phosphate)","mg":20},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Methylcobalamin (Vitamin B12)","mg":2},{"name":"Liposomal Adenosylcobalamin (Vitamin B12)","mg":1},{"name":"Liposomal Hydroxocobalamin (Vitamin B12)","mg":0.5},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Liposomal Magnesium (as Bisglycinate)","mg":100},{"name":"Trimethylglycine (TMG)","mg":250},{"name":"Liposomal DHA (Algal-Based)","mg":150},{"name":"Liposomal Alpha-Lipoic Acid (ALA)","mg":100},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":644.3},
  {"name_clean":"VDR+ Receptor Activation","ingredients":[
    {"name":"Liposomal Vitamin D3 (Cholecalciferol)","mg":0.5},{"name":"Liposomal Vitamin K2 (MK-7)","mg":0.2},{"name":"Liposomal Methyl Folate (5-MTHF)","mg":0.8},{"name":"Liposomal Vitamin B12 (Methylcobalamin)","mg":1},{"name":"Liposomal Magnesium (Bisglycinate)","mg":50},{"name":"Boron (Citrate Complex)","mg":3},{"name":"Zinc (Bisglycinate)","mg":15},{"name":"Liposomal Quercetin (Aglycone)","mg":100},{"name":"Liposomal Trans-Resveratrol (98%)","mg":50},{"name":"Proprietary Omega-3 DHA (Algal-Based)","mg":150},{"name":"Liposomal Curcumin (95% Curcuminoids)","mg":100},{"name":"Micellar Bioperine® (Black Pepper Extract)","mg":5}
  ],"total_mg_per_serving":475.5},
  {"name_clean":"Chaga Mushroom Capsules","ingredients":[
    {"name":"Micellar Chaga Mushroom Extract (10:1, Organic)","mg":500},{"name":"Liposomal Phospholipids (Sunflower Lecithin)","mg":15}
  ],"total_mg_per_serving":515},
  {"name_clean":"Cordyceps Mushroom Capsules","ingredients":[
    {"name":"Micellar Cordyceps Extract (7% Polysaccharides)","mg":500},{"name":"Liposomal Phospholipids (Sunflower Lecithin)","mg":15}
  ],"total_mg_per_serving":515},
  {"name_clean":"Lion's Mane Mushroom Capsules","ingredients":[
    {"name":"Micellar Lion's Mane Extract (30% Polysaccharides)","mg":500},{"name":"Liposomal Phospholipids (Sunflower Lecithin)","mg":15}
  ],"total_mg_per_serving":515},
  {"name_clean":"Reishi Mushroom Capsules","ingredients":[
    {"name":"Micellar Reishi Extract (30% Polysaccharides)","mg":500},{"name":"Liposomal Phospholipids (Sunflower Lecithin)","mg":15}
  ],"total_mg_per_serving":515},
  {"name_clean":"Turkey Tail Mushroom Capsules","ingredients":[
    {"name":"Micellar Turkey Tail Extract (30% Polysaccharides)","mg":500},{"name":"Liposomal Phospholipids (Sunflower Lecithin)","mg":15}
  ],"total_mg_per_serving":515}
]
$JSON$::jsonb;
    v_match_count integer;
    v_orphan_count integer;
BEGIN
    CREATE TEMP TABLE phase_d5_canonical ON COMMIT DROP AS
    SELECT
        elem->>'name_clean' AS name_clean,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', ing->>'name',
                    'dose', (ing->>'mg')::numeric,
                    'unit', 'mg',
                    'role', ''
                )
            )
            FROM jsonb_array_elements(elem->'ingredients') ing
        ) AS ingredients,
        (elem->>'total_mg_per_serving')::numeric AS total_mg_per_serving
    FROM jsonb_array_elements(v_canonical) elem;

    WITH updated AS (
        UPDATE public.products p
        SET ingredients = c.ingredients
        FROM phase_d5_canonical c
        WHERE (p.name = c.name_clean OR replace(p.name, E'™', '') = c.name_clean)
          AND p.category != 'peptide'
          AND (p.ingredients IS NULL OR jsonb_array_length(p.ingredients) = 0)
        RETURNING p.id, p.sku, p.name, c.name_clean, c.total_mg_per_serving
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id, 'phase_d5_ingredients_seed', 'products', u.sku, u.id,
        jsonb_build_object(
            'column', 'ingredients',
            'method', 'name_match_canonical_export',
            'matched_canonical_name', u.name_clean,
            'total_mg_per_serving', u.total_mg_per_serving,
            'product_name', u.name
        )
    FROM updated u;
    GET DIAGNOSTICS v_match_count = ROW_COUNT;

    SELECT count(*) INTO v_orphan_count
    FROM phase_d5_canonical c
    WHERE NOT EXISTS (
        SELECT 1 FROM public.products p
        WHERE (p.name = c.name_clean OR replace(p.name, E'™', '') = c.name_clean)
          AND p.category != 'peptide'
    );

    RAISE NOTICE 'Phase D.5 ingredients: matched=%, canonical_orphans=%; run_id=%',
        v_match_count, v_orphan_count, v_run_id;
END $$;
