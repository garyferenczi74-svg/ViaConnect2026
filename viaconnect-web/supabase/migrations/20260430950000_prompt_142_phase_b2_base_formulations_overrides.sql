-- Prompt #142 v2 Phase B.2: Gary override for the 3 NULL base-formulations rows.
--
-- Context: #141b §G working assumption stated Magnesium Synergy Matrix
-- and NeuroCalm BH4 Complex were "internal-only component formulas
-- excluded from storefront" because they had "no retail pricing in v8
-- spreadsheet". Gary's authoritative override 2026-04-30: production
-- now has retail pricing for both ($58.88 and $88.88 in master_skus),
-- so the exclusion condition no longer applies. All 3 of the previously
-- NULL rows belong in base-formulations:
--
--   FC-MAG-001       Magnesium Synergy Matrix    -> base-formulations
--   FC-NEUROCALM-001 NeuroCalm BH4 Complex       -> base-formulations
--   FC-AMINO-001     AMINO ACID MATRIX+          -> base-formulations
--
-- Phase B.1 had reverted FC-MAG-001 to NULL (per the §G exclusion read),
-- left FC-NEUROCALM-001 NULL (audit-confirmed exclusion), and deferred
-- FC-AMINO-001 (out-of-scope vs §12). Phase B.2 reverses Phase B.1's
-- §G-driven exclusions and resolves the AMINO deferral. After this
-- migration all 93 non-peptide products have category_slug populated.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_mag_id uuid;
    v_neurocalm_id uuid;
    v_amino_id uuid;
BEGIN
    SELECT id INTO v_mag_id FROM public.products WHERE sku = 'FC-MAG-001';
    SELECT id INTO v_neurocalm_id FROM public.products WHERE sku = 'FC-NEUROCALM-001';
    SELECT id INTO v_amino_id FROM public.products WHERE sku = 'FC-AMINO-001';

    UPDATE public.products SET category_slug = 'base-formulations' WHERE sku = 'FC-MAG-001';
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (v_run_id, 'phase_b2_gary_override', 'products', 'FC-MAG-001', v_mag_id,
        jsonb_build_object(
            'column', 'category_slug',
            'old', null,
            'new', 'base-formulations',
            'reason', 'Gary override 2026-04-30: production has retail pricing $58.88; #141b §G exclusion no longer applies'
        ));

    UPDATE public.products SET category_slug = 'base-formulations' WHERE sku = 'FC-NEUROCALM-001';
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (v_run_id, 'phase_b2_gary_override', 'products', 'FC-NEUROCALM-001', v_neurocalm_id,
        jsonb_build_object(
            'column', 'category_slug',
            'old', null,
            'new', 'base-formulations',
            'reason', 'Gary override 2026-04-30: production has retail pricing $88.88; #141b §G exclusion no longer applies'
        ));

    UPDATE public.products SET category_slug = 'base-formulations' WHERE sku = 'FC-AMINO-001';
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (v_run_id, 'phase_b2_gary_override', 'products', 'FC-AMINO-001', v_amino_id,
        jsonb_build_object(
            'column', 'category_slug',
            'old', null,
            'new', 'base-formulations',
            'reason', 'Gary override 2026-04-30: AMINO ACID MATRIX+ classified as base-formulations (deferred decision resolved)'
        ));

    RAISE NOTICE 'Phase B.2 Gary overrides applied: 3 rows set to base-formulations; run_id=%', v_run_id;
END $$;
