-- Prompt #152z.E: MethylB Complete+ B Complex Lane 1 prose drift fix.
--
-- Closes the 152z.E deferred Lane 1 follow-up logged in the original
-- 152z backfill_audit row (commit d37a2e7 2026-05-07 run_id fc22e8ea
-- product_id c486ce88-5f27-4f2c-9a24-1df641c1420e).
--
-- Parallels the 152y.13 fix shipped 2026-05-11 (commit 6572687, run_id
-- to be assigned at apply). Both 152y MAOA+ and 152z MethylB Complete+
-- carried a verbatim source-doc "future planned products" claim about
-- the Methylation and Neurogenetic Series companion products; all three
-- companions are now live in catalog.
--
-- DRIFT BEING CORRECTED
-- ---------------------
-- The 152z migration preserved a source-doc claim verbatim inside the
-- "What makes it different" parenthetical of MethylB Complete+ B Complex
-- PDP description:
--
--   "MethylB Complete+ as Tier 1 foundational tier; MAOA+ Neurochemical
--    Balance as Tier 2 comprehensive methylation cycle support tier;
--    future planned products COMT+ for downstream catechol metabolism
--    support, CBS Support+ for sulfur metabolism support, and MTHFR+
--    for severe variant-specific dosing protocols"
--
-- All three companion products were already live in the catalog at the
-- time 152z shipped, or shortly after:
--   * 152j CBS Support+ Sulfur Pathway shipped 2026-05-04 commit 346c487
--   * 152l COMT+ Neurotransmitter Balance shipped 2026-05-04 commit cbc5fa0
--   * 152aa MTHFR+ Folate Metabolism shipped 2026-05-07 commit 34573f2
--
-- The 152z migration preserved the prose verbatim per Lane 2 reconciliation
-- discipline (Lane 2 does not rewrite marketing prose) and logged the
-- drift as 152z.E deferred Lane 1 follow-up. This migration closes it.
--
-- WORDING CHOSEN
-- --------------
-- Gary canonical 2026-05-11 (parallel to 152y.13 companion-products
-- framing pattern): drop "future planned products" -> "companion
-- products in the series include". Preserve all other prose verbatim
-- including the tier architecture framing for MethylB Complete+ Tier 1
-- and MAOA+ Tier 2, and the per-product mechanism descriptors for COMT+
-- downstream catechol metabolism, CBS Support+ sulfur metabolism, and
-- MTHFR+ severe variant-specific dosing protocols. The "severe variant-
-- specific" framing for MTHFR+ is spec-author wording that may not
-- perfectly align with live MTHFR+ positioning (152aa positions MTHFR+
-- as "Tier 5 Variant-Specific" without the "severe" qualifier); this
-- minor sub-drift is preserved per Lane 1 minimal-surgery discipline
-- and is logged as 152z.E.1 for future follow-up if Gary chooses to
-- harmonize the MTHFR+ positioning prose across MethylB+ and MTHFR+
-- PDPs.
--
-- Old:
--   "MethylB Complete+ as Tier 1 foundational tier; MAOA+ Neurochemical
--    Balance as Tier 2 comprehensive methylation cycle support tier;
--    future planned products COMT+ for downstream catechol metabolism
--    support, CBS Support+ for sulfur metabolism support, and MTHFR+
--    for severe variant-specific dosing protocols"
--
-- New:
--   "MethylB Complete+ as Tier 1 foundational tier; MAOA+ Neurochemical
--    Balance as Tier 2 comprehensive methylation cycle support tier;
--    companion products in the series include COMT+ for downstream
--    catechol metabolism support, CBS Support+ for sulfur metabolism
--    support, and MTHFR+ for severe variant-specific dosing protocols"
--
-- METHOD
-- ------
-- Surgical REPLACE() of the target substring against products.description
-- on the MethylB Complete+ B Complex row keyed on slug + sku + category.
-- Idempotent on re-run: if the target substring is absent (i.e.,
-- migration already applied), the position() guard short-circuits and
-- the UPDATE is skipped.
--
-- STANDING RULES COMPLIANCE (Michelangelo / Jeffery pre-delivery audit)
-- --------------------------------------------------------------------
--   - No em-dashes anywhere.
--   - No en-dashes anywhere.
--   - No arrow characters anywhere.
--   - No curly quotes anywhere (straight quotes only).
--   - No emojis.
--   - ASCII hyphen-minus only in compound modifiers (variant-specific).
--   - No source-doc legacy artifacts ("FarmCeutica Inc", "FarmCeutica
--     Wellness Ltd", "Building Performance Through Science", "5 mg"
--     5-MTHF, "2 mg" methylcobalamin, "82 mg", "Powder based formulation
--     additive", "250 mg liposomal+ micellar powder", excessive hedging)
--     introduced.
--   - Marshall scan NOT TRIGGERED: no ingredient or peptide content
--     in changed prose; only product names COMT+, CBS Support+, and
--     MTHFR+ which are existing 152 catalog methylation-pathway products.
--   - No package.json change. No email template change.
--   - Append-only migration.
--
-- LIVE ROW TARGET
-- ---------------
-- id c486ce88-5f27-4f2c-9a24-1df641c1420e
-- slug methylb-complete-plus-b-complex
-- sku FC-METHYLB-001
-- category base-formulations (NOT methylation-snp; the live category
--   placement diverges from the tier-architecture framing in the PDP
--   prose; category re-architecture deferred to 152z.C follow-up;
--   this 152z.E fix does NOT touch the category column)

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_description text;
    v_post_description text;
    v_product_id uuid;
    v_old_fragment text := 'MethylB Complete+ as Tier 1 foundational tier; MAOA+ Neurochemical Balance as Tier 2 comprehensive methylation cycle support tier; future planned products COMT+ for downstream catechol metabolism support, CBS Support+ for sulfur metabolism support, and MTHFR+ for severe variant-specific dosing protocols';
    v_new_fragment text := 'MethylB Complete+ as Tier 1 foundational tier; MAOA+ Neurochemical Balance as Tier 2 comprehensive methylation cycle support tier; companion products in the series include COMT+ for downstream catechol metabolism support, CBS Support+ for sulfur metabolism support, and MTHFR+ for severe variant-specific dosing protocols';
BEGIN
    SELECT id, description INTO v_product_id, v_pre_description
    FROM public.products
    WHERE slug = 'methylb-complete-plus-b-complex'
      AND sku = 'FC-METHYLB-001'
      AND category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152z.E Lane 1 prose drift fix skipped: MethylB Complete+ B Complex row not found at slug methylb-complete-plus-b-complex / SKU FC-METHYLB-001 / category != peptide';
        RETURN;
    END IF;

    IF v_pre_description IS NULL OR position(v_old_fragment IN v_pre_description) = 0 THEN
        RAISE NOTICE '#152z.E Lane 1 prose drift fix skipped: target fragment not found in current description (likely already applied on a prior run, or description has been modified by a later migration); run_id=%', v_run_id;
        RETURN;
    END IF;

    UPDATE public.products
    SET description = REPLACE(description, v_old_fragment, v_new_fragment)
    WHERE id = v_product_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;

    SELECT description INTO v_post_description FROM public.products WHERE id = v_product_id;

    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    VALUES (
        v_run_id,
        '152z_E_lane1_cross_product_family_prose_drift_fix',
        'products',
        'FC-METHYLB-001',
        v_product_id,
        jsonb_build_object(
            'method', 'lane1_prose_drift_fix_surgical_replace',
            'columns', jsonb_build_array('description'),
            'old_fragment', v_old_fragment,
            'new_fragment', v_new_fragment,
            'rule_applied', 'lane1_marketing_prose_reconciliation',
            'authority', 'Gary canonical 2026-05-11 Prompt #152z.E (Lane 1 follow-up logged in original 152z backfill_audit run_id fc22e8ea product_id c486ce88-5f27-4f2c-9a24-1df641c1420e commit d37a2e7; corrected source-doc "future planned products COMT+ CBS Support+ MTHFR+ planned" prose against live drift: 152j CBS Support+ Sulfur Pathway shipped 2026-05-04 commit 346c487 + 152l COMT+ Neurotransmitter Balance shipped 2026-05-04 commit cbc5fa0 + 152aa MTHFR+ Folate Metabolism shipped 2026-05-07 commit 34573f2; all three companion products already live in catalog at time 152z itself shipped or shortly after; parallels 152y.13 MAOA+ Lane 1 fix commit 6572687 2026-05-11)',
            'wording_choice', 'companion-products framing per Gary 2026-05-11 (parallel to 152y.13 pattern; drops "future planned products" -> "companion products in the series include"; preserves all other prose verbatim including Tier 1 foundational tier and Tier 2 comprehensive methylation cycle support tier framing and the per-product mechanism descriptors for COMT+ downstream catechol metabolism + CBS Support+ sulfur metabolism + MTHFR+ severe variant-specific dosing protocols)',
            'tech_mechanism_preserved', 'Tier 1 foundational tier + Tier 2 comprehensive methylation cycle support tier + downstream catechol metabolism support + sulfur metabolism support + severe variant-specific dosing protocols all preserved verbatim',
            'sub_drift_152z_E_1_logged', 'MTHFR+ positioned as "severe variant-specific" in MethylB+ PDP body but as "Tier 5 Variant-Specific" without severe qualifier in live 152aa MTHFR+ migration; minor sub-drift preserved per Lane 1 minimal-surgery discipline; logged as 152z.E.1 for future harmonization follow-up if Gary chooses to align MTHFR+ positioning prose across MethylB+ and MTHFR+ PDPs',
            'previous_pdp_description_length', length(v_pre_description),
            'current_pdp_description_length', length(v_post_description),
            'expected_byte_delta', length(v_new_fragment) - length(v_old_fragment),
            'standing_rules_compliance', 'zero em-dashes + zero en-dashes + zero arrow characters + zero curly quotes + zero emojis + ASCII hyphen-minus only in compound modifiers (variant-specific)',
            'marshall_scan', 'NOT TRIGGERED (no ingredient content in changed prose; only product names COMT+ CBS Support+ MTHFR+ all existing 152 catalog methylation-pathway products; Marshall reviews ingredient claims not product cross-references)',
            'closes_152z_E_deferred_flag', true,
            'parallels_152y_13_fix', 'commit 6572687 2026-05-11; same pattern applied to MAOA+ where companion products were COMT+ and CBS Support+',
            'lane', 'Lane 1 (marketing prose reconciliation)',
            'idempotent_on_rerun', 'true (position() guard short-circuits if substring absent)'
        )
    );

    RAISE NOTICE '#152z.E MethylB Complete+ B Complex Lane 1 prose drift fix: rows updated=% / 1 expected; run_id=%; pre_length=%; post_length=%; byte_delta=%', v_count, v_run_id, length(v_pre_description), length(v_post_description), length(v_post_description) - length(v_pre_description);
END $$;
