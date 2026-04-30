-- Prompt #142 v2 Phase B.1: targeted overrides for Phase B review-pending rows
-- plus revert of one HIGH miscategorization caught in post-flight review.
--
-- Phase B (20260430930000) auto-applied 88 of 93 category_slug assignments
-- via the 7-priority heuristic. 5 rows landed in MEDIUM/LOW confidence and
-- were correctly NOT auto-applied per spec design. Post-flight review by
-- Hannah identified targeted overrides for 3 of those 5 rows plus one
-- additional revert: Magnesium Synergy Matrix was Phase B HIGH confidence
-- (priority 7 + legacy 'base') and got auto-applied to base-formulations,
-- but #141b §G working assumption explicitly excludes both Magnesium
-- Synergy Matrix AND NeuroCalm BH4 Complex from storefront (internal-only
-- component formulas). Phase B.1 reverts Magnesium Synergy Matrix to NULL
-- and writes an audit row confirming NeuroCalm BH4 Complex's deliberate
-- exclusion (it was already NULL via Phase B MEDIUM-no-apply path).
--
-- Decisions applied:
--
--   1. MethylB Complete+ B Complex (FC-METHYLB-001):
--      Phase B heuristic: methylation-snp (MEDIUM, legacy='base')
--      Override: base-formulations per #141b §12.2 (Proprietary Base list)
--
--   2. SHRED+ (FC-SHRED-001):
--      Phase B heuristic: advanced-formulas (MEDIUM, legacy='core')
--      Override: advanced-formulas per #141b §12.3 (Advanced Formulations
--      list); legacy 'core' is just a different naming convention
--
--   3. 30 Day Custom Vitamin Package (FC-CUSTOM-VIT-001):
--      Phase B heuristic: base-formulations (LOW, legacy='supplement')
--      Override: genex360 per #141b §12.1 (Testing & Diagnostics list)
--
--   4. Magnesium Synergy Matrix (FC-MAG-001):
--      Phase B applied: base-formulations (HIGH, legacy='base')
--      Revert: category_slug = NULL per #141b §G (internal-only excluded)
--
--   5. NeuroCalm BH4 Complex (FC-NEUROCALM-001):
--      Phase B did NOT apply: stayed NULL (MEDIUM)
--      Confirmation: NULL is the correct state per #141b §G; audit row
--      written documenting the deliberate exclusion
--
-- Decisions deferred:
--
--   AMINO ACID MATRIX+ (FC-AMINO-001):
--      Phase B heuristic: base-formulations (LOW, legacy='core')
--      Stays NULL pending Gary's category decision; out-of-scope vs
--      #141b §12 product list.
--
-- Audit trail: each override writes a backfill_audit row with the prior
-- and new category_slug values for rollback reference.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_methylb_id uuid;
    v_shred_id uuid;
    v_custom_vit_id uuid;
    v_mag_id uuid;
    v_neurocalm_id uuid;
BEGIN
    -- Capture product ids first for the audit log writes
    SELECT id INTO v_methylb_id FROM public.products WHERE sku = 'FC-METHYLB-001';
    SELECT id INTO v_shred_id FROM public.products WHERE sku = 'FC-SHRED-001';
    SELECT id INTO v_custom_vit_id FROM public.products WHERE sku = 'FC-CUSTOM-VIT-001';
    SELECT id INTO v_mag_id FROM public.products WHERE sku = 'FC-MAG-001';
    SELECT id INTO v_neurocalm_id FROM public.products WHERE sku = 'FC-NEUROCALM-001';

    -- Override 1: MethylB Complete+ B Complex -> base-formulations
    UPDATE public.products
    SET category_slug = 'base-formulations'
    WHERE sku = 'FC-METHYLB-001';

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    ) VALUES (
        v_run_id, 'phase_b1_overrides', 'products', 'FC-METHYLB-001', v_methylb_id,
        jsonb_build_object(
            'column', 'category_slug',
            'old', null,
            'new', 'base-formulations',
            'reason', '#141b §12.2 Proprietary Base list; heuristic methyl keyword fire was incorrect',
            'phase_b_heuristic', 'methylation-snp',
            'phase_b_confidence', 'MEDIUM'
        )
    );

    -- Override 2: SHRED+ -> advanced-formulas
    UPDATE public.products
    SET category_slug = 'advanced-formulas'
    WHERE sku = 'FC-SHRED-001';

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    ) VALUES (
        v_run_id, 'phase_b1_overrides', 'products', 'FC-SHRED-001', v_shred_id,
        jsonb_build_object(
            'column', 'category_slug',
            'old', null,
            'new', 'advanced-formulas',
            'reason', '#141b §12.3 Advanced Formulations list; legacy core is naming convention only',
            'phase_b_heuristic', 'advanced-formulas',
            'phase_b_confidence', 'MEDIUM'
        )
    );

    -- Override 3: 30 Day Custom Vitamin Package -> genex360
    UPDATE public.products
    SET category_slug = 'genex360'
    WHERE sku = 'FC-CUSTOM-VIT-001';

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    ) VALUES (
        v_run_id, 'phase_b1_overrides', 'products', 'FC-CUSTOM-VIT-001', v_custom_vit_id,
        jsonb_build_object(
            'column', 'category_slug',
            'old', null,
            'new', 'genex360',
            'reason', '#141b §12.1 Testing & Diagnostics service product',
            'phase_b_heuristic', 'base-formulations',
            'phase_b_confidence', 'LOW'
        )
    );

    -- Revert 4: Magnesium Synergy Matrix back to NULL (was Phase B HIGH miscategorization)
    UPDATE public.products
    SET category_slug = NULL
    WHERE sku = 'FC-MAG-001';

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    ) VALUES (
        v_run_id, 'phase_b1_overrides', 'products', 'FC-MAG-001', v_mag_id,
        jsonb_build_object(
            'column', 'category_slug',
            'old', 'base-formulations',
            'new', null,
            'reason', '#141b §G internal-only component formula; excluded from storefront',
            'phase_b_heuristic', 'base-formulations',
            'phase_b_confidence', 'HIGH (incorrect, post-flight reverted)'
        )
    );

    -- Confirmation 5: NeuroCalm BH4 Complex stays NULL (audit-only, no UPDATE needed)
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    ) VALUES (
        v_run_id, 'phase_b1_overrides', 'products', 'FC-NEUROCALM-001', v_neurocalm_id,
        jsonb_build_object(
            'column', 'category_slug',
            'old', null,
            'new', null,
            'reason', '#141b §G internal-only component formula; excluded from storefront, NULL is correct state',
            'phase_b_heuristic', 'advanced-formulas',
            'phase_b_confidence', 'MEDIUM (correct non-apply confirmed)'
        )
    );

    RAISE NOTICE 'Phase B.1 overrides applied: 3 categorized + 1 reverted to NULL + 1 NULL confirmed; AMINO ACID MATRIX+ deferred. run_id=%', v_run_id;
END $$;
