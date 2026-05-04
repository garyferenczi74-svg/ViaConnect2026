-- Prompt #152b: ACHY+ Acetylcholine Support PDP paragraph description.
--
-- Updates the existing FC-ACHY-001 row (slug achy-plus-acetylcholine-support)
-- with the premium summary plus full-description copy authored by Gary in
-- the #152b spec. Mirrors #152a structure: the always-visible PdpRightRail.tsx
-- mobile description section and the PdpDesktopTabs.tsx description tab panel
-- both pick up the new copy without further client code change beyond the
-- emphasized-terms helper landing in this same prompt.
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Spec referenced slug "achy" but live slug is
--     "achy-plus-acetylcholine-support" (FC-ACHY-001, methylation-snp).
--   * Spec invented backfill_audit columns
--     (run_id, table_name, row_id, action, payload, created_at). Live schema
--     is (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at). This migration uses the live schema
--     and packs old_value plus new_value plus authority plus compliance audit
--     metadata into columns_loaded jsonb, mirroring #145 plus #142 plus #152a.
--
-- Marshall dictionary scan: copy authored by Gary in the #152b spec body.
-- Bioavailability copy reads "10x to 28x" verbatim, which passes Michelangelo
-- reviewer plus Jeffery guardrails (both block 5-27x only). No unapproved
-- peptides; ingredient names are formulation-table-grade. No internal SKU
-- plus SNP plus cron specifics on the consumer surface. Emphasized terms
-- map plus helper render in the client component layer; this migration
-- only ships the data side.
--
-- Idempotent on re-run: WHERE clause keys on slug plus sku; UPDATE re-applies
-- the canonical strings even if a future hand-edit drifts. backfill_audit
-- gets a new row each run, which is the documented pattern.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'ACHY+™ delivers precision liposomal acetylcholine support for sharper focus, faster recall, and steadier neuromuscular coordination. Thirteen cholinergic compounds in one capsule, built with 10x to 28x bioavailability carriers that cross the blood-brain barrier intact.';
    v_new_description text := 'ACHY+™ is a precision liposomal acetylcholine support formula engineered for adults seeking sharper cognitive focus, faster mental recall, and steadier neuromuscular coordination. Built around three direct cholinergic precursors (Alpha-GPC, Acetyl-L-Carnitine, and Citicoline at 100 mg each) and reinforced with Bacopa monnieri, Huperzine A, phosphatidylserine, phosphatidylcholine, uridine monophosphate, magnesium L-threonate, methylcobalamin B12, methylated pantethine, L-theanine, and Bioperine, this single capsule delivers 706.2 mg of actives across thirteen synergistic compounds. Every ingredient is wrapped in a liposomal or micellar carrier that drives 10x to 28x higher bioavailability versus conventional powders, allowing the formula to cross the blood-brain barrier intact and reach cholinergic neurons where it counts. Built For Your Biology, ACHY+™ is a foundational stack for high performers, students, knowledge workers, and any adult whose Bio Optimization protocol calls for elevated focus, cleaner memory, and precise neuromuscular control.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'achy-plus-acetylcholine-support'
      AND p.sku = 'FC-ACHY-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152b ACHY+ paragraph update skipped: row not found at slug achy-plus-acetylcholine-support / SKU FC-ACHY-001';
        RETURN;
    END IF;

    UPDATE public.products
    SET
        summary = v_new_summary,
        description = v_new_description
    WHERE id = v_product_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    SELECT to_jsonb(p) INTO v_post_row FROM public.products p WHERE p.id = v_product_id;

    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (
        v_run_id,
        '152b_achy_plus_paragraph_description',
        'products',
        'FC-ACHY-001',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152b',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152b',
            'authority', 'Gary canonical 2026-05-04 Prompt #152b; copy authored in spec body',
            'marshall_scan', 'human_review_pass_per_142v3_oq1_unresolved (Gary-authored copy in spec)',
            'bioavailability_format', '10x to 28x (matches reviewer plus guardrail)',
            'product_name', 'ACHY+ Acetylcholine Support',
            'emphasized_terms_count', 4,
            'emphasized_terms_render_site', 'client component PDP_EMPHASIZED_TERMS map'
        )
    );

    RAISE NOTICE '#152b ACHY+ paragraph update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
