-- Prompt #142 v2 Phase F: testing_meta jsonb schema documentation + state validation.
--
-- Per #142 v2 §F, testing_meta is the explicit "admin CSV import" stub
-- column for the genex360 category. Phase F does NOT auto-derive any
-- values; it documents the jsonb schema, asserts the 8 genex360 rows
-- start at testing_meta='{}'::jsonb default state, and registers the
-- expected loader path. Gary fills the companion CSV file at
-- supabase/seeds/phase_f_testing_meta_stub.csv and admin CSV import
-- will UPDATE testing_meta from those values in a follow-up.
--
-- jsonb schema (per Phase F design, both kit_type variants):
--
-- Common keys (both test_kit and compounded_supplement):
--   kit_type                       enum: 'test_kit' | 'compounded_supplement'
--   requires_practitioner_order    boolean (mirrors top-level column for query convenience)
--   coverage_jurisdictions         array of ISO country codes ['US', 'CA']
--   price_includes_shipping        boolean
--
-- test_kit variant keys:
--   specimen_type                  text e.g. 'saliva' | 'capillary_blood' | 'urine_24hr' | 'hair' | 'cheek_swab'
--   collection_method              text e.g. 'self_swab' | 'finger_prick' | 'kit_collected_24hr_urine'
--   sample_size                    text e.g. '2 ml' | '4 swabs' | '24 hr urine'
--   prep_instructions              text free-form e.g. 'no food/drink 30 min before swab'
--   lab_partner                    text e.g. 'Spectracell Laboratories' | 'Precision Analytical (DUTCH)'
--   clia_certified                 boolean
--   turnaround_days                integer (business days from sample receipt to report)
--   markers_tested                 integer (gene/marker count for assay)
--   panel_focus                    text free-form e.g. 'methylation pathway SNPs (MTHFR, COMT, etc.)'
--   report_format                  text e.g. 'pdf' | 'interactive_portal' | 'kit_specific_html'
--   result_delivery_method         text e.g. 'patient_portal' | 'practitioner_portal' | 'email_pdf'
--
-- compounded_supplement variant keys (FC-CUSTOM-VIT-001 only currently):
--   test_dependency                text e.g. 'GeneXM' (which test results drive formulation)
--   supply_days                    integer (e.g. 30)
--   packets_per_day                integer (e.g. 1 or 2)
--   compounding_lab                text e.g. 'ViaCura Compounding Pharmacy'
--   requires_results_upload        boolean (true if patient must upload prior test results)
--
-- Loader path (admin CSV import, follow-up):
--   1. Gary fills supabase/seeds/phase_f_testing_meta_stub.csv per schema above
--   2. Admin CSV import endpoint reads each row
--   3. UPDATE public.products SET testing_meta = jsonb_build_object(...keys from row...)
--      WHERE sku = row.sku
--   4. Per-row backfill_audit entry with run_id and source CSV path
--
-- This Phase F migration:
--   - Asserts all 8 genex360 rows currently have testing_meta='{}'
--   - Inserts 8 audit rows under a Phase F run_id with a 'stub_acknowledged' method
--     so the absence of data is itself logged as expected state
--   - Out-of-scope: no UPDATEs to testing_meta (admin CSV will deliver)
--
-- Bioavailability_pct (#142 v2 Phase F-adjacent):
--   bioavailability_pct remains admin-CSV per spec §3 Phase E (clinical
--   claim per product, not derivable from formulation data). Distinct
--   from testing_meta but on the same admin import flow. Out of scope
--   for this migration; tracked as known residual.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_genex360_count integer;
    v_non_default_count integer;
BEGIN
    SELECT count(*) INTO v_genex360_count
    FROM public.products
    WHERE category_slug = 'genex360'
      AND category != 'peptide';

    IF v_genex360_count != 8 THEN
        RAISE EXCEPTION 'Phase F aborted: expected 8 genex360 category_slug rows, found %. Verify Phase B/B.1/B.2 categorization is intact.', v_genex360_count;
    END IF;

    SELECT count(*) INTO v_non_default_count
    FROM public.products
    WHERE category_slug = 'genex360'
      AND category != 'peptide'
      AND testing_meta != '{}'::jsonb;

    IF v_non_default_count > 0 THEN
        RAISE NOTICE 'Phase F notice: % genex360 rows already have non-default testing_meta. Phase F stub does not overwrite; admin CSV must merge or replace per ops decision.', v_non_default_count;
    END IF;

    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_f_testing_meta_stub',
        'products',
        sku,
        id,
        jsonb_build_object(
            'column', 'testing_meta',
            'method', 'stub_acknowledged_pending_admin_csv',
            'kit_type', CASE
                WHEN category = 'test_kit' THEN 'test_kit'
                WHEN sku = 'FC-CUSTOM-VIT-001' THEN 'compounded_supplement'
                ELSE 'unknown'
            END,
            'current_testing_meta', testing_meta,
            'csv_stub_path', 'supabase/seeds/phase_f_testing_meta_stub.csv',
            'product_name', name
        )
    FROM public.products
    WHERE category_slug = 'genex360'
      AND category != 'peptide'
    ORDER BY category, name;

    RAISE NOTICE 'Phase F testing_meta stub: 8 genex360 rows acknowledged at testing_meta=%; admin CSV pending; run_id=%',
        '{}', v_run_id;
END $$;
