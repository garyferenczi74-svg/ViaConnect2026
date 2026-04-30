-- Prompt #142 v2 Phase D.5.1: close the 10 unmatched Phase D.5 rows.
--
-- Phase D.5 matched 71/93 non-peptide products. Remaining 22 unmatched
-- broke down as:
--   - 8 case mismatches (advanced-formulas all-caps leading word):
--       BLAST+, CATALYST+, FLEX+, FOCUS+, IRON+, RELAX+, RISE+, SHRED+
--     vs canonical Title-case Blast+/Catalyst+/Flex+/Focus+/Iron+/Relax+/Rise+/Shred+
--   - 1 apostrophe mismatch:
--       "Lions Mane Mushroom Capsules" vs canonical "Lion's Mane Mushroom Capsules"
--   - 1 name divergence:
--       production "GLP-1 Activator Complex" vs canonical "Inferno + GLP-1 Activator Complex"
--   - 8 GeneX360 testing kits: no canonical (expected per spec, ingredients=[] correct)
--   - 2 SNP rows: APOE+, CYP450+ — no canonical (expected per spec design)
--   - 2 base-formulations: AMINO ACID MATRIX+, NeuroCalm BH4 Complex — no canonical
--     (Gary override #142 v2 Phase B.2; expected ingredients=[] until manual seed)
--
-- This patch closes the 10 fixable rows via SKU-keyed direct UPDATEs with
-- hardcoded ingredient arrays in the {name, dose, unit, role} schema.
-- Pattern mirrors Phase D.1's T3/T4 hardcoded specials.
--
-- Mushroom mg corrections (Gary override 2026-04-30) baked in: extract
-- 500 mg + lecithin 15 mg = 515 mg/serving for Lion's Mane (the 4 other
-- mushrooms already received 500 mg via Phase D.5 name-match success).
--
-- Idempotent: WHERE ingredients IS NULL OR jsonb_array_length(ingredients) = 0.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_match_count integer := 0;
    v_pass integer;
BEGIN
    -- FC-BLAST-001 → canonical Blast+ Nitric Oxide Stack
    UPDATE public.products
    SET ingredients = jsonb_build_array(
        jsonb_build_object('name','Liposomal L-Citrulline Malate (25% active)','dose',250,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Methylfolate (5-MTHF)','dose',0.8,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Methylcobalamin (B12)','dose',1,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Pyridoxal-5-Phosphate (B6)','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Vitamin C','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Beetroot Extract (40% active)','dose',200,'unit','mg','role',''),
        jsonb_build_object('name','Micellar BioPerine® (50% active)','dose',5,'unit','mg','role',''),
        jsonb_build_object('name','Nitrosigine® (Bonded Complex)','dose',150,'unit','mg','role','')
    )
    WHERE sku = 'FC-BLAST-001'
      AND (ingredients IS NULL OR jsonb_array_length(ingredients) = 0);
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_match_count := v_match_count + v_pass;

    -- FC-CATALYST-001 → canonical Catalyst+ Energy Multivitamin
    UPDATE public.products
    SET ingredients = jsonb_build_array(
        jsonb_build_object('name','Magnesium Bisglycinate','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','Magnesium Citrate','dose',75,'unit','mg','role',''),
        jsonb_build_object('name','Magnesium Malate','dose',75,'unit','mg','role',''),
        jsonb_build_object('name','Magnesium Orotate','dose',50,'unit','mg','role',''),
        jsonb_build_object('name','Magnesium Taurate','dose',50,'unit','mg','role',''),
        jsonb_build_object('name','Magnesium L-Threonate','dose',50,'unit','mg','role',''),
        jsonb_build_object('name','Methylfolate (5-MTHF)','dose',0.8,'unit','mg','role',''),
        jsonb_build_object('name','Methylcobalamin (B12)','dose',0.5,'unit','mg','role',''),
        jsonb_build_object('name','Pyridoxal-5-Phosphate (B6)','dose',25,'unit','mg','role',''),
        jsonb_build_object('name','Riboflavin-5-Phosphate (B2)','dose',25,'unit','mg','role',''),
        jsonb_build_object('name','Thiamine HCL (B1)','dose',25,'unit','mg','role',''),
        jsonb_build_object('name','Niacin (as Niacinamide)','dose',50,'unit','mg','role',''),
        jsonb_build_object('name','NNB DILEUCINE (DL 185™)','dose',75,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal L-Valine','dose',50,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal L-Methionine','dose',50,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal L-Tryptophan','dose',50,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal N-Acetyl L-Cysteine','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal L-Ergothioneine','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Vitamin D3 (Cholecalciferol)','dose',0.125,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Vitamin K2 (MK-7)','dose',0.2,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Quercetin','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal L-Taurine','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','Selenium (L-selenomethionine)','dose',0.2,'unit','mg','role',''),
        jsonb_build_object('name','Zinc (Bisglycinate)','dose',15,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Bioperine®','dose',10,'unit','mg','role','')
    )
    WHERE sku = 'FC-CATALYST-001'
      AND (ingredients IS NULL OR jsonb_array_length(ingredients) = 0);
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_match_count := v_match_count + v_pass;

    -- FC-FLEX-001 → canonical Flex+ Joint & Inflammation
    UPDATE public.products
    SET ingredients = jsonb_build_array(
        jsonb_build_object('name','Proprietary Omega-3 Phospholipid Complex','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Curcumin Complex','dose',125,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Boswellia Serrata Extract (AprèsFlex®)','dose',150,'unit','mg','role',''),
        jsonb_build_object('name','Quercetin Phytosome (Quercefit®)','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Hyaluronic Acid (Low MW)','dose',60,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Type II Collagen (UC-II®)','dose',40,'unit','mg','role',''),
        jsonb_build_object('name','MSM (Methylsulfonylmethane)','dose',75,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Astaxanthin (AstaPure®)','dose',15,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Ginger Root Extract (20:1)','dose',50,'unit','mg','role','')
    )
    WHERE sku = 'FC-FLEX-001'
      AND (ingredients IS NULL OR jsonb_array_length(ingredients) = 0);
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_match_count := v_match_count + v_pass;

    -- FC-FOCUS-001 → canonical Focus+ Nootropic Formula
    UPDATE public.products
    SET ingredients = jsonb_build_array(
        jsonb_build_object('name','Lion''s Mane Extract (Micellar) 30% Polysaccharides','dose',500,'unit','mg','role',''),
        jsonb_build_object('name','Bacopa Monnieri Extract (Micellar) 50% Bacosides','dose',300,'unit','mg','role',''),
        jsonb_build_object('name','Paraxanthine (Liposomal) enfinity®','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','L-Theanine (Liposomal) Suntheanine®','dose',200,'unit','mg','role',''),
        jsonb_build_object('name','CoQ10 - Ubiquinol (Liposomal) Kaneka QH®','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','Ginkgo Biloba Extract (Micellar) 24% Flavone Glycosides','dose',120,'unit','mg','role',''),
        jsonb_build_object('name','Rhodiola Rosea Extract (Micellar) 5% Rosavins','dose',200,'unit','mg','role',''),
        jsonb_build_object('name','BioPerine® (Micellar) 95% Piperine','dose',10,'unit','mg','role','')
    )
    WHERE sku = 'FC-FOCUS-001'
      AND (ingredients IS NULL OR jsonb_array_length(ingredients) = 0);
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_match_count := v_match_count + v_pass;

    -- FC-IRON-001 → canonical Iron+ Red Blood Cell Support
    UPDATE public.products
    SET ingredients = jsonb_build_array(
        jsonb_build_object('name','Liposomal Vitamin D3 (Cholecalciferol)','dose',0.25,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Vitamin K2 (Menaquinone-7)','dose',0.05,'unit','mg','role',''),
        jsonb_build_object('name','Selenium (L-Selenomethionine)','dose',0.1,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Vitamin C (Ascorbic Acid)','dose',250,'unit','mg','role',''),
        jsonb_build_object('name','Quercetin (Sophora japonica)','dose',125,'unit','mg','role',''),
        jsonb_build_object('name','Micellar BioPerine® (Black Pepper Extract)','dose',25,'unit','mg','role',''),
        jsonb_build_object('name','Copper (Bisglycinate Chelate)','dose',1,'unit','mg','role',''),
        jsonb_build_object('name','Zinc (Bisglycinate Chelate)','dose',7.5,'unit','mg','role',''),
        jsonb_build_object('name','Molybdenum (Glycinate Chelate)','dose',0.75,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal L-Glutathione (Reduced)','dose',125,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal N-Acetylcysteine (NAC)','dose',150,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Alpha-Lipoic Acid (ALA)','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal L-Ergothioneine','dose',50,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Phosphatidylserine','dose',50,'unit','mg','role','')
    )
    WHERE sku = 'FC-IRON-001'
      AND (ingredients IS NULL OR jsonb_array_length(ingredients) = 0);
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_match_count := v_match_count + v_pass;

    -- FC-RELAX-001 → canonical Relax+ Sleep Support
    UPDATE public.products
    SET ingredients = jsonb_build_array(
        jsonb_build_object('name','Liposomal Melatonin (Extended-Release)','dose',3,'unit','mg','role',''),
        jsonb_build_object('name','Tart Cherry Extract (10:1 Concentrate)','dose',200,'unit','mg','role',''),
        jsonb_build_object('name','5-HTP (Griffonia simplicifolia Extract)','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','L-Glycine (Pure, Pharmaceutical Grade)','dose',500,'unit','mg','role',''),
        jsonb_build_object('name','Apigenin (Chamomile Extract)','dose',50,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Magnesium Bisglycinate','dose',200,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Broad-Spectrum CBD','dose',25,'unit','mg','role',''),
        jsonb_build_object('name','Micellar CBN Isolate','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Micellar BioPerine® (Black Pepper Extract)','dose',5,'unit','mg','role','')
    )
    WHERE sku = 'FC-RELAX-001'
      AND (ingredients IS NULL OR jsonb_array_length(ingredients) = 0);
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_match_count := v_match_count + v_pass;

    -- FC-RISE-001 → canonical Rise+ Male Testosterone
    UPDATE public.products
    SET ingredients = jsonb_build_array(
        jsonb_build_object('name','Micellar Tongkat Ali (40% active)','dose',200,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Fadogia Agrestis (40% active)','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Ashwagandha (40% active)','dose',150,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Horny Goat Weed (40% active)','dose',50,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Shilajit (40% active)','dose',100,'unit','mg','role',''),
        jsonb_build_object('name','L-Citrulline Malate (2:1)','dose',150,'unit','mg','role',''),
        jsonb_build_object('name','Zinc Bisglycinate','dose',15,'unit','mg','role',''),
        jsonb_build_object('name','DIM (99% pure)','dose',100,'unit','mg','role','')
    )
    WHERE sku = 'FC-RISE-001'
      AND (ingredients IS NULL OR jsonb_array_length(ingredients) = 0);
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_match_count := v_match_count + v_pass;

    -- FC-SHRED-001 → canonical Shred+
    UPDATE public.products
    SET ingredients = jsonb_build_array(
        jsonb_build_object('name','Liposomal Phospholipids (Sunflower Lecithin)','dose',80,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Alpha Lipoic Acid (R-ALA)','dose',15,'unit','mg','role',''),
        jsonb_build_object('name','BHB Ketone Salts','dose',500,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Bioperine® (Black Pepper Extract)','dose',5,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Choline (Alpha-GPC)','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal CoQ10 (Ubiquinone)','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal L-Ergothioneine','dose',2,'unit','mg','role',''),
        jsonb_build_object('name','Natural GLP-1 Activator Complex','dose',350,'unit','mg','role',''),
        jsonb_build_object('name','Glycine (USP)','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Probiotic Blend (10 Billion CFU)','dose',250,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Tesofensine','dose',0.5,'unit','mg','role','')
    )
    WHERE sku = 'FC-SHRED-001'
      AND (ingredients IS NULL OR jsonb_array_length(ingredients) = 0);
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_match_count := v_match_count + v_pass;

    -- FC-LIONSMANE-001 → canonical Lion's Mane Mushroom Capsules (apostrophe-stripped match)
    -- Mushroom mg correction (Gary 2026-04-30): extract 500 mg, total 515 mg/serving
    UPDATE public.products
    SET ingredients = jsonb_build_array(
        jsonb_build_object('name','Micellar Lion''s Mane Extract (30% Polysaccharides)','dose',500,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Phospholipids (Sunflower Lecithin)','dose',15,'unit','mg','role','')
    )
    WHERE sku = 'FC-LIONSMANE-001'
      AND (ingredients IS NULL OR jsonb_array_length(ingredients) = 0);
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_match_count := v_match_count + v_pass;

    -- FC-GLP1-001 → canonical Inferno + GLP-1 Activator Complex (name divergence)
    UPDATE public.products
    SET ingredients = jsonb_build_array(
        jsonb_build_object('name','Berberine HCl (98% purity)','dose',30,'unit','mg','role',''),
        jsonb_build_object('name','BHB Salts (Magnesium, Calcium, Sodium)','dose',150,'unit','mg','role',''),
        jsonb_build_object('name','L-Carnitine Tartrate','dose',25,'unit','mg','role',''),
        jsonb_build_object('name','Chromium Picolinate (elemental)','dose',2,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Cinnamon Bark Extract (10:1)','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Conjugated Linoleic Acid (CLA)','dose',15,'unit','mg','role',''),
        jsonb_build_object('name','Probiotic Blend (10 Billion CFU)','dose',150,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal EGCG (Green Tea Extract, 50%)','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Moringa Leaf Extract (10:1)','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Liposomal Paraxanthine (PureCaf®)','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Selenium (L-Selenomethionine)','dose',1,'unit','mg','role',''),
        jsonb_build_object('name','Tesofensine (botanical analog mimic)','dose',2,'unit','mg','role',''),
        jsonb_build_object('name','Micellar Artichoke Leaf Extract (5% Cynarin)','dose',10,'unit','mg','role',''),
        jsonb_build_object('name','Inulin-FOS (Prebiotic Blend)','dose',10,'unit','mg','role','')
    )
    WHERE sku = 'FC-GLP1-001'
      AND (ingredients IS NULL OR jsonb_array_length(ingredients) = 0);
    GET DIAGNOSTICS v_pass = ROW_COUNT;
    v_match_count := v_match_count + v_pass;

    -- Audit log: one row per SKU touched in this run
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_d5_1_ingredients_remap',
        'products',
        sku,
        id,
        jsonb_build_object(
            'column', 'ingredients',
            'method', CASE
                WHEN sku = 'FC-LIONSMANE-001' THEN 'apostrophe_normalized_remap'
                WHEN sku = 'FC-GLP1-001' THEN 'name_divergence_special_map'
                ELSE 'case_normalized_remap'
            END,
            'reason', CASE
                WHEN sku = 'FC-LIONSMANE-001' THEN 'production "Lions Mane" lacks apostrophe; canonical "Lion''s Mane" matched after strip'
                WHEN sku = 'FC-GLP1-001' THEN 'production name "GLP-1 Activator Complex" maps to canonical "Inferno + GLP-1 Activator Complex"'
                ELSE 'production all-caps leading word ("' || split_part(name, ' ', 1) || '") matched canonical Title-case after lower() compare'
            END,
            'final_ingredient_count', jsonb_array_length(ingredients),
            'product_name', name
        )
    FROM public.products
    WHERE sku IN (
        'FC-BLAST-001','FC-CATALYST-001','FC-FLEX-001','FC-FOCUS-001',
        'FC-IRON-001','FC-RELAX-001','FC-RISE-001','FC-SHRED-001',
        'FC-LIONSMANE-001','FC-GLP1-001'
    )
    AND jsonb_array_length(ingredients) > 0;

    RAISE NOTICE 'Phase D.5.1 ingredients remap: matched=% / 10 expected; run_id=%',
        v_match_count, v_run_id;
END $$;
