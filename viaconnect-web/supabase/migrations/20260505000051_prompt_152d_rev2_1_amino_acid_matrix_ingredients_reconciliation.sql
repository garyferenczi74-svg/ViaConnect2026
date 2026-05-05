-- Prompt #152d-rev2.1: Amino Acid Matrix+ ingredients column reconciliation.
--
-- PAIRED with #152d-rev2 description migration (20260505000050) per Path C
-- (Gary canonical 2026-05-05): description migration claims 29 ingredients
-- @ 12,180 mg total; this migration brings the live `ingredients` jsonb
-- column to match by replacing the prior #145 9-essential formulation
-- (2,000 mg total) with the full 29-ingredient architecture (12,180 mg
-- total).
--
-- WITHOUT this paired migration, the PDP Formulation accordion would show
-- 9 ingredients @ 2,000 mg while the Full Description would claim 29 @
-- 12,180 mg; user-visible inconsistency and Rule 12 (claims match reality)
-- block per Jeffery NO-GO audit. Path C resolves by applying both
-- migrations together so day-one is consistent.
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug + SKU + format match #152d-rev2 (amino-acid-matrix-plus /
--     FC-AMINO-001 / powder).
--   * Live ingredients column pre-#152d-rev2.1 had 9 entries totaling
--     2,000 mg (per #145 canonicalization 2026-05-02): L-Leucine 500 +
--     L-Isoleucine 250 + L-Valine 250 + L-Lysine HCl 250 + L-Threonine
--     200 + L-Phenylalanine 200 + L-Methionine 175 + L-Histidine 100 +
--     L-Tryptophan 75 = 2,000 mg.
--
-- DOSE DISTRIBUTION AUTHORSHIP DISCLOSURE:
-- The #152d-rev2 spec specified 29 ingredients @ 12,180 mg total but did
-- NOT specify per-ingredient doses. Per Path C execution, this migration
-- proposes a clinically-reasonable distribution that sums exactly to
-- 12,180 mg using standard amino acid + cofactor dose ranges. Doses are
-- AUTHORED BY CLAUDE (not Gary) and are subject to Gary's revision
-- authority via follow-up prompt. The categorical breakdown is:
--   * BCAAs (Leucine + Isoleucine + Valine) = 4,000 mg
--   * Other 6 essentials = 2,500 mg
--   * 11 proteinogenic non-essentials = 3,500 mg
--   * 3 non-proteinogenic AAs (Citrulline + Taurine + Ornithine) = 750 mg
--   * 6 cofactors (Beta-Alanine + Creatine + B6 + Mg + Zn + Bioperine)
--     = 1,430 mg
--   * Sum: 4,000 + 2,500 + 3,500 + 750 + 1,430 = 12,180 mg ✓
--
-- Each per-ingredient dose sits within established clinical or supportive
-- supplemental ranges:
--   * L-Leucine 2,000 mg (clinical mTOR-trigger range 1-2.5 g)
--   * BCAA total 4,000 mg (typical 2:1:1 BCAA scoop dose)
--   * Beta-Alanine 800 mg (below clinical 3.2 g for peak carnosine
--     effect; supportive)
--   * Creatine Monohydrate 500 mg (below clinical 3-5 g; supplementary)
--   * Vitamin B6 (P5P) 5 mg (within RDA range)
--   * Magnesium Bisglycinate 100 mg (supportive)
--   * Zinc Bisglycinate 15 mg (at RDA)
--   * Bioperine 10 mg (standard)
--   * Other amino acids in 250-500 mg supplemental ranges
--
-- Idempotent on re-run: WHERE clause keys on slug + sku + category!=peptide.
-- Snapshots prior 9-ingredient ingredients into backfill_audit columns_loaded
-- for rollback traceability.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_ingredients jsonb;
    v_post_ingredients jsonb;
    v_product_id uuid;
    v_pre_count integer;
    v_post_count integer;
    v_post_total_mg integer;
    v_new_ingredients jsonb := jsonb_build_array(
        jsonb_build_object('name', 'L-Leucine',             'dose', 2000, 'unit', 'mg', 'role', 'BCAA mTOR primary trigger'),
        jsonb_build_object('name', 'L-Isoleucine',          'dose', 1000, 'unit', 'mg', 'role', 'BCAA glucose uptake balance'),
        jsonb_build_object('name', 'L-Valine',              'dose', 1000, 'unit', 'mg', 'role', 'BCAA nitrogen balance'),
        jsonb_build_object('name', 'L-Lysine',              'dose',  500, 'unit', 'mg', 'role', 'collagen + carnitine biosynthesis'),
        jsonb_build_object('name', 'L-Methionine',          'dose',  250, 'unit', 'mg', 'role', 'methyl donor precursor SAMe cycle'),
        jsonb_build_object('name', 'L-Phenylalanine',       'dose',  500, 'unit', 'mg', 'role', 'tyrosine + catecholamine precursor'),
        jsonb_build_object('name', 'L-Threonine',           'dose',  500, 'unit', 'mg', 'role', 'collagen + immunoglobulin synthesis'),
        jsonb_build_object('name', 'L-Tryptophan',          'dose',  250, 'unit', 'mg', 'role', 'serotonin + melatonin precursor'),
        jsonb_build_object('name', 'L-Histidine',           'dose',  500, 'unit', 'mg', 'role', 'pairs with beta-alanine for carnosine'),
        jsonb_build_object('name', 'L-Glutamine',           'dose',  500, 'unit', 'mg', 'role', 'enterocyte fuel + nitrogen carrier'),
        jsonb_build_object('name', 'L-Arginine',            'dose',  500, 'unit', 'mg', 'role', 'nitric oxide synthase substrate'),
        jsonb_build_object('name', 'L-Citrulline',          'dose',  250, 'unit', 'mg', 'role', 'converts to arginine in kidneys'),
        jsonb_build_object('name', 'L-Taurine',             'dose',  250, 'unit', 'mg', 'role', 'membrane stabilization + bile acid conjugation'),
        jsonb_build_object('name', 'L-Glycine',             'dose',  500, 'unit', 'mg', 'role', 'GABA + collagen + GATM creatine biosynthesis'),
        jsonb_build_object('name', 'L-Tyrosine',            'dose',  250, 'unit', 'mg', 'role', 'catecholamine + thyroid hormone precursor'),
        jsonb_build_object('name', 'L-Cysteine',            'dose',  250, 'unit', 'mg', 'role', 'glutathione synthesis sulfur'),
        jsonb_build_object('name', 'L-Serine',              'dose',  250, 'unit', 'mg', 'role', 'phospholipid synthesis + one-carbon folate'),
        jsonb_build_object('name', 'L-Alanine',             'dose',  250, 'unit', 'mg', 'role', 'glucose-alanine cycle nitrogen shuttle'),
        jsonb_build_object('name', 'L-Aspartic Acid',       'dose',  250, 'unit', 'mg', 'role', 'urea cycle + purine pyrimidine biosynthesis'),
        jsonb_build_object('name', 'L-Glutamic Acid',       'dose',  250, 'unit', 'mg', 'role', 'excitatory neurotransmitter + GABA precursor'),
        jsonb_build_object('name', 'L-Proline',             'dose',  250, 'unit', 'mg', 'role', 'collagen + connective tissue'),
        jsonb_build_object('name', 'L-Asparagine',          'dose',  250, 'unit', 'mg', 'role', 'glycoprotein synthesis + asparagine-aspartate shuttle'),
        jsonb_build_object('name', 'L-Ornithine',           'dose',  250, 'unit', 'mg', 'role', 'urea cycle ammonia clearance + GH secretion'),
        jsonb_build_object('name', 'Beta-Alanine',          'dose',  800, 'unit', 'mg', 'role', 'carnosine substrate for muscle acid-base buffering'),
        jsonb_build_object('name', 'Creatine Monohydrate',  'dose',  500, 'unit', 'mg', 'role', 'phosphocreatine ATP regeneration'),
        jsonb_build_object('name', 'Vitamin B6 (P5P)',      'dose',    5, 'unit', 'mg', 'role', 'amino acid metabolism cofactor'),
        jsonb_build_object('name', 'Magnesium Bisglycinate', 'dose', 100, 'unit', 'mg', 'role', 'amino acid metabolism enzyme cofactor'),
        jsonb_build_object('name', 'Zinc Bisglycinate',     'dose',   15, 'unit', 'mg', 'role', 'protein synthesis enzyme cofactor'),
        jsonb_build_object('name', 'Bioperine (Black Pepper Extract)', 'dose', 10, 'unit', 'mg', 'role', 'systemic exposure extension via CYP3A4 modulation')
    );
BEGIN
    SELECT id, ingredients
      INTO v_product_id, v_pre_ingredients
    FROM public.products
    WHERE slug = 'amino-acid-matrix-plus'
      AND sku = 'FC-AMINO-001'
      AND category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152d-rev2.1 Amino Acid Matrix+ ingredient reconciliation skipped: row not found at slug amino-acid-matrix-plus / SKU FC-AMINO-001';
        RETURN;
    END IF;

    v_pre_count := jsonb_array_length(coalesce(v_pre_ingredients, '[]'::jsonb));

    -- Defensive guard: refuse to apply if new ingredients jsonb count is
    -- not 29 or sum is not 12,180 mg (these are the contract values that
    -- the rev2 description claims).
    SELECT COUNT(*)::integer, COALESCE(SUM((elem->>'dose')::numeric)::integer, 0)
      INTO v_post_count, v_post_total_mg
    FROM jsonb_array_elements(v_new_ingredients) elem;

    IF v_post_count != 29 THEN
        RAISE EXCEPTION '#152d-rev2.1 ABORT: new ingredients array has % entries; rev2 description claims 29. Aborting before UPDATE.', v_post_count;
    END IF;

    IF v_post_total_mg != 12180 THEN
        RAISE EXCEPTION '#152d-rev2.1 ABORT: new ingredients total = % mg; rev2 description claims 12,180 mg. Aborting before UPDATE.', v_post_total_mg;
    END IF;

    UPDATE public.products
    SET
        ingredients = v_new_ingredients
    WHERE id = v_product_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    SELECT ingredients INTO v_post_ingredients FROM public.products WHERE id = v_product_id;

    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (
        v_run_id,
        '152d_rev2_1_amino_acid_matrix_ingredients_reconciliation',
        'products',
        'FC-AMINO-001',
        v_product_id,
        jsonb_build_object(
            'method', 'ingredients_reconciliation_per_152d_rev2_1_path_c',
            'columns', jsonb_build_array('ingredients'),
            'old_value', v_pre_ingredients,
            'new_value', v_post_ingredients,
            'rule_applied', 'paragraph_pdp_152d_rev2_1',
            'authority', 'Gary canonical 2026-05-05 Path C decision; paired with #152d-rev2 description migration to resolve formulation-description mismatch (Jeffery NO-GO Rule 12 claims-match-reality block)',
            'paired_with', '152d_rev2_amino_acid_matrix_structured_description (run 20260505000050)',
            'product_name', 'Amino Acid Matrix+',
            'pre_ingredient_count', v_pre_count,
            'pre_total_mg', 2000,
            'post_ingredient_count', v_post_count,
            'post_total_mg', v_post_total_mg,
            'reconciliation_target', '29 ingredients @ 12180 mg per #152d-rev2 description claim',
            'dose_distribution_authorship', 'AUTHORED BY CLAUDE (not Gary); spec specified 29 ingredients + 12180 mg total but did NOT specify per-ingredient doses; clinically-reasonable distribution proposed with all doses within established supportive or clinical ranges; Gary revision authority preserved via follow-up prompt',
            'dose_categorical_breakdown', jsonb_build_object(
                'bcaas_leucine_isoleucine_valine_mg', 4000,
                'other_six_essentials_mg', 2500,
                'eleven_proteinogenic_nonessentials_mg', 3500,
                'three_nonproteinogenic_aas_citrulline_taurine_ornithine_mg', 750,
                'six_cofactors_betaalanine_creatine_b6_mg_zn_bioperine_mg', 1430,
                'total_mg', 12180
            ),
            'dose_clinical_range_notes', jsonb_build_object(
                'leucine_2000_mg', 'within clinical mTOR-trigger range 1-2.5 g',
                'bcaa_total_4000_mg', 'typical 2:1:1 BCAA scoop dose',
                'beta_alanine_800_mg', 'below clinical 3.2 g for peak carnosine; supportive (matches #152m Creatine HCL+ pattern)',
                'creatine_500_mg', 'below clinical 3-5 g; supplementary',
                'b6_p5p_5_mg', 'within RDA range',
                'magnesium_100_mg', 'supportive',
                'zinc_15_mg', 'at RDA',
                'bioperine_10_mg', 'standard',
                'other_aas_250_to_500_mg_each', 'supplemental supportive ranges'
            ),
            'compliance_followups_recommended', jsonb_build_array(
                'gary_review_per_ingredient_doses_revise_via_follow_up_prompt_if_desired',
                'beta_alanine_higher_dose_supplementation_for_peak_carnosine_3200_mg_clinical_protocol',
                'creatine_higher_dose_for_phosphocreatine_saturation_3000_to_5000_mg_clinical_protocol'
            ),
            'rev2_description_consistency_verified', 'description claims 29 @ 12180 mg; this migration produces 29 @ 12180 mg; PDP Formulation accordion will now agree with Full Description text on day one'
        )
    );

    RAISE NOTICE '#152d-rev2.1 Amino Acid Matrix+ ingredient reconciliation: rows updated=% / 1 expected; run_id=%; pre=% ingredients @ 2000 mg, post=% ingredients @ % mg', v_count, v_run_id, v_pre_count, v_post_count, v_post_total_mg;
END $$;
