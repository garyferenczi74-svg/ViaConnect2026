-- Prompt #142 v3 Phase H: reconcile v2 work against v3 canonical spec.
--
-- v3 was delivered 2026-04-30 superseding v2. Most v2 work aligns with
-- v3, but four v3-specific deltas need write-back to production:
--
--   1. format=NULL on FC-APTIGEN-001 + FC-NEUROAXIS-001 (Phase G insert
--      did not set format). Both are capsule per canonical export.
--      COALESCE-style fill (NULL -> capsule), no overwrite.
--
--   2. FC-SPROUT-TOD format=chewable -> tablet. v3 §3 Phase C explicitly
--      flags Sproutables Toddler Tablets as tablet form (the product name
--      itself contains "Tablets"). v3 calls this a #141 v3 amendment Q3
--      pending, but the production data should match the v3 canonical
--      regardless. FORCE overwrite with audit_mode='force'.
--
--   3. FC-FOCUS-001 format=capsule -> powder. v3 §2.4 documents this as
--      a v1->v2 xlsx data change (capsule -> powder reformulation). v3 Q9
--      flags it as needing written confirmation; Gary's "reconcile v2 work
--      against v3 spec" directive 2026-04-30 is the written confirmation.
--      FORCE overwrite with audit_mode='force'.
--
--   4. Em-dash (U+2014) and en-dash (U+2013) sweep on description +
--      summary columns across 9 rows where #142a load inherited them
--      from product_catalog source. v3 §0 hard rule 3 forbids U+2013
--      and U+2014 anywhere on the public surface. Normalize to ", "
--      via regexp_replace ' *[—–] *' -> ', ' with global flag.
--      Affected SKUs: FC-CHAGA-001, FC-CORDYCEPS-001, FC-LIONSMANE-001,
--      FC-OMEGA-001, FC-REISHI-001, FC-TURKEYTAIL-001, FC-WH-CYCLESYNC,
--      FC-WH-RADIANCE, FC-WH-THYROBALANCE. FORCE overwrite (replace
--      existing text), audit_mode='force_dash_normalization'.
--
-- Defensive: WHERE category != 'peptide' on every UPDATE.
-- Audit: per-row entry captures old_value + new_value + v3_section
-- citing the spec authority for each force-overwrite.
--
-- Open items still pending after Phase H (not addressed here):
--   - Q1 Marshall scanner script-invocability (description Marshall
--     validation on FC-APTIGEN-001 + FC-NEUROAXIS-001)
--   - FC-APTIGEN-001 + FC-NEUROAXIS-001 price_msrp NULL (admin CSV)
--   - FC-APTIGEN-001 + FC-NEUROAXIS-001 image_urls=[] (manual upload)
--   - Section 11 standing xlsx revision protocol (memorialized as
--     feedback memory, no DB write)

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count_pass1 integer;
    v_count_pass2 integer;
    v_count_pass3 integer;
    v_count_pass4 integer;
BEGIN
    -- Pass 1: format=capsule for Aptigen + NeuroAxis (NULL fill)
    WITH updated AS (
        UPDATE public.products
        SET format = 'capsule'
        WHERE sku IN ('FC-APTIGEN-001', 'FC-NEUROAXIS-001')
          AND format IS NULL
          AND category != 'peptide'
        RETURNING id, sku, name
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id, 'phase_h_v3_reconciliation', 'products', sku, id,
        jsonb_build_object(
            'column', 'format',
            'method', 'v3_phase_g_orphan_format_fill',
            'audit_mode', 'coalesce_null_fill',
            'old_value', NULL,
            'new_value', 'capsule',
            'v3_section', 'Phase G orphan products from canonical export both formulated as capsule',
            'product_name', name
        )
    FROM updated;
    GET DIAGNOSTICS v_count_pass1 = ROW_COUNT;

    -- Pass 2: FC-SPROUT-TOD format chewable -> tablet (force overwrite)
    WITH updated AS (
        UPDATE public.products
        SET format = 'tablet'
        WHERE sku = 'FC-SPROUT-TOD'
          AND format = 'chewable'
          AND category != 'peptide'
        RETURNING id, sku, name
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id, 'phase_h_v3_reconciliation', 'products', sku, id,
        jsonb_build_object(
            'column', 'format',
            'method', 'v3_phase_c_tablet_amendment',
            'audit_mode', 'force',
            'old_value', 'chewable',
            'new_value', 'tablet',
            'v3_section', '§3 Phase C: Sproutables Toddler Tablets uses tablet form; #141 v3 amendment Q3',
            'product_name', name
        )
    FROM updated;
    GET DIAGNOSTICS v_count_pass2 = ROW_COUNT;

    -- Pass 3: FC-FOCUS-001 format capsule -> powder (force overwrite)
    WITH updated AS (
        UPDATE public.products
        SET format = 'powder'
        WHERE sku = 'FC-FOCUS-001'
          AND format = 'capsule'
          AND category != 'peptide'
        RETURNING id, sku, name
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id, 'phase_h_v3_reconciliation', 'products', sku, id,
        jsonb_build_object(
            'column', 'format',
            'method', 'v3_xlsx_v2_format_reformulation',
            'audit_mode', 'force',
            'old_value', 'capsule',
            'new_value', 'powder',
            'v3_section', '§2.4 v1->v2 xlsx data change: Focus+ Nootropic Formula reformulated capsule to powder; Q9 confirmed by Gary 2026-04-30 reconcile directive',
            'product_name', name
        )
    FROM updated;
    GET DIAGNOSTICS v_count_pass3 = ROW_COUNT;

    -- Pass 4: em/en-dash normalization on description + summary
    -- Pattern: optional spaces around U+2013 or U+2014, replace with ", "
    WITH updated AS (
        UPDATE public.products
        SET
            description = regexp_replace(description, ' *[—–] *', ', ', 'g'),
            summary = CASE
                WHEN summary IS NOT NULL THEN regexp_replace(summary, ' *[—–] *', ', ', 'g')
                ELSE summary
            END
        WHERE category != 'peptide'
          AND (description ~ '[—–]' OR summary ~ '[—–]')
        RETURNING id, sku, name, description, summary
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id, 'phase_h_v3_reconciliation', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('description', 'summary'),
            'method', 'v3_dash_normalization',
            'audit_mode', 'force_dash_normalization',
            'pattern', ' *[U+2013 U+2014] *',
            'replacement', ', ',
            'v3_section', '§0 hard rule 3: no em-dashes (U+2014) or en-dashes (U+2013) anywhere on public surface',
            'final_description', description,
            'final_summary', summary,
            'product_name', name
        )
    FROM updated;
    GET DIAGNOSTICS v_count_pass4 = ROW_COUNT;

    RAISE NOTICE 'Phase H v3 reconciliation: format_null_fill=% + sprout_tablet=% + focus_powder=% + dash_normalize=%; run_id=%',
        v_count_pass1, v_count_pass2, v_count_pass3, v_count_pass4, v_run_id;
END $$;
