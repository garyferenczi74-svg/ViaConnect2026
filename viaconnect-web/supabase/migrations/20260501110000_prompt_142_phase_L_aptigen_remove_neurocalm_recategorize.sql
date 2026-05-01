-- Prompt #142 v3 Phase L: remove Aptigen Complex; recategorize NeuroCalm+ to base-formulations.
--
-- Per Gary directive 2026-04-30: "remove Aptigen Complex and move NeuroCalm+
-- (capsule) $34.99 Adaptogenic stress formula with Ashwagandha KSM-66
-- (registered), Rhodiola, and L-Theanine to Base Formulations to replace it.
-- It is not an Advanced Formulation."
--
-- Phase L actions:
--   1. DELETE FC-APTIGEN-001 (Aptigen Complex). Inserted 2026-04-30 via
--      Phase G as canonical orphan resolution; Gary now deauthorizes.
--      Audit log captures full to_jsonb of deleted row for rollback.
--
--   2. UPDATE FC-CALM-001 (NeuroCalm+) category_slug from advanced-formulas
--      to base-formulations + clear status_tags TIER 3 (since base-formulations
--      does not trigger TIER 3 per #142 v2 Phase E rule).
--      Other fields (format=capsule, price=34.99, description, summary,
--      ingredients) already match Gary's spec; no change needed.
--
-- Defensive: WHERE category != 'peptide' on every UPDATE/DELETE.
-- Audit trail: per-row backfill_audit captures method + old/new values
-- + authority Gary canonical 2026-04-30.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count_deleted integer := 0;
    v_count_recategorized integer := 0;
BEGIN
    -- Step 1: Audit-log Aptigen Complex before delete (full row to_jsonb for rollback)
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_L_aptigen_remove_neurocalm_recategorize', 'products', sku, id,
        jsonb_build_object(
            'method', 'aptigen_unauthorized_delete_per_gary_directive',
            'old_value', to_jsonb(p),
            'new_value', NULL,
            'rule_applied', '142_phase_L_aptigen_remove',
            'audit_mode', 'force_destructive_post_directive',
            'authority', 'Gary canonical 2026-04-30 remove Aptigen Complex; replaced by NeuroCalm+ in base-formulations'
        )
    FROM public.products p
    WHERE p.sku = 'FC-APTIGEN-001'
      AND p.category != 'peptide'
      AND NOT EXISTS (
          SELECT 1 FROM public.backfill_audit ba
          WHERE ba.product_id = p.id
            AND ba.source_table = 'phase_L_aptigen_remove_neurocalm_recategorize'
      );

    -- Step 2: DELETE Aptigen Complex
    WITH deleted AS (
        DELETE FROM public.products
        WHERE sku = 'FC-APTIGEN-001'
          AND category != 'peptide'
        RETURNING 1
    )
    SELECT count(*) INTO v_count_deleted FROM deleted;

    -- Step 3: Recategorize NeuroCalm+ to base-formulations + clear TIER 3
    WITH updated AS (
        UPDATE public.products
        SET
            category_slug = 'base-formulations',
            status_tags = '[]'::jsonb
        WHERE sku = 'FC-CALM-001'
          AND category_slug = 'advanced-formulas'
          AND category != 'peptide'
        RETURNING id, sku, name
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, 'phase_L_aptigen_remove_neurocalm_recategorize', 'products', sku, id,
        jsonb_build_object(
            'columns', jsonb_build_array('category_slug', 'status_tags'),
            'method', 'neurocalm_recategorize_to_base_formulations',
            'audit_mode', 'force',
            'old_category_slug', 'advanced-formulas',
            'new_category_slug', 'base-formulations',
            'old_status_tags', jsonb_build_array('TIER 3'),
            'new_status_tags', '[]'::jsonb,
            'rule_applied', '142_phase_L_neurocalm_recategorize',
            'authority', 'Gary canonical 2026-04-30 NeuroCalm+ is not an Advanced Formulation; move to base-formulations to replace Aptigen'
        )
    FROM updated;
    GET DIAGNOSTICS v_count_recategorized = ROW_COUNT;

    RAISE NOTICE 'Phase L: aptigen_deleted=% neurocalm_recategorized=% run_id=%',
        v_count_deleted, v_count_recategorized, v_run_id;
END $$;
