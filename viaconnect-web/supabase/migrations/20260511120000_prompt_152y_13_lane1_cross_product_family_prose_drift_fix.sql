-- Prompt #152y.13: MAOA+ Neurochemical Balance Lane 1 prose drift fix.
--
-- Closes the 152y.13 deferred Lane 1 follow-up logged in the original
-- 152y backfill_audit row (commit 86b1dc3 2026-05-07 run_id 34d9208c
-- product_id 367fb6dd-06a3-46e1-9fd9-7e8193353ce8).
--
-- DRIFT BEING CORRECTED
-- ---------------------
-- The 152y migration preserved a source-doc claim verbatim inside the
-- "What makes it different" parenthetical of MAOA+ Neurochemical Balance
-- PDP description:
--
--   "the formulation is the first product in the planned Via Cura
--    Methylation and Neurogenetic Series, designed specifically to
--    support MAOA-mediated monoamine catabolism and methylation cycle
--    turnover; future products COMT+ for downstream catechol metabolism
--    support and CBS Support+ for sulfur metabolism support are planned
--    to extend the family"
--
-- Both COMT+ and CBS Support+ were ALREADY live in the catalog at the
-- time 152y shipped:
--   * 152j CBS Support+ Sulfur Pathway shipped 2026-05-04 commit 346c487
--   * 152l COMT+ Neurotransmitter Balance shipped 2026-05-04 commit cbc5fa0
--
-- The 152y migration preserved the prose verbatim per Lane 2 reconciliation
-- discipline (Lane 2 does not rewrite marketing prose) and logged the
-- drift as 152y.13 deferred Lane 1 follow-up. This migration closes it.
--
-- WORDING CHOSEN
-- --------------
-- Gary canonical 2026-05-11 (3-option AskUserQuestion):
-- "companion-products framing" (Option A).
--
-- Old:
--   "the formulation is the first product in the planned Via Cura
--    Methylation and Neurogenetic Series, designed specifically to
--    support MAOA-mediated monoamine catabolism and methylation cycle
--    turnover; future products COMT+ for downstream catechol metabolism
--    support and CBS Support+ for sulfur metabolism support are planned
--    to extend the family"
--
-- New:
--   "the formulation is positioned within the Via Cura Methylation and
--    Neurogenetic Series, designed specifically to support MAOA-mediated
--    monoamine catabolism and methylation cycle turnover; companion
--    products in the series include COMT+ for downstream catechol
--    metabolism support and CBS Support+ for sulfur metabolism support"
--
-- Changes:
--   1. "the first product in the planned" -> "positioned within the"
--   2. "future products COMT+ ... CBS Support+ ... are planned to extend
--      the family" -> "companion products in the series include COMT+ ...
--      CBS Support+ ..."
--
-- All technical mechanism language preserved verbatim:
--   - MAOA-mediated monoamine catabolism
--   - methylation cycle turnover
--   - downstream catechol metabolism support
--   - sulfur metabolism support
--
-- METHOD
-- ------
-- Surgical REPLACE() of the full target parenthetical substring against
-- the products.description column on the MAOA+ row keyed on
-- slug + sku + category. Idempotent on re-run: if the target substring
-- is absent (i.e., migration already applied), the LIKE guard short-
-- circuits and the UPDATE is skipped.
--
-- STANDING RULES COMPLIANCE (Michelangelo / Jeffery pre-delivery audit)
-- --------------------------------------------------------------------
--   - No em-dashes anywhere.
--   - No en-dashes anywhere.
--   - No arrow characters anywhere.
--   - No curly quotes anywhere (straight quotes only).
--   - No emojis.
--   - ASCII hyphen-minus only in compound modifiers (MAOA-mediated).
--   - No source-doc legacy artifacts ("FarmCeutica Inc", "FarmCeutica
--     Wellness Ltd", "Building Performance Through Science", "171.8 mg",
--     "away from tyramine-rich meals", excessive hedging) introduced.
--   - Marshall scan NOT TRIGGERED: no ingredient or peptide content
--     in changed prose; only product names COMT+ and CBS Support+
--     which are existing 152 catalog products.
--   - No package.json change. No email template change.
--   - Append-only migration.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_description text;
    v_post_description text;
    v_product_id uuid;
    v_old_fragment text := 'the formulation is the first product in the planned Via Cura Methylation and Neurogenetic Series, designed specifically to support MAOA-mediated monoamine catabolism and methylation cycle turnover; future products COMT+ for downstream catechol metabolism support and CBS Support+ for sulfur metabolism support are planned to extend the family';
    v_new_fragment text := 'the formulation is positioned within the Via Cura Methylation and Neurogenetic Series, designed specifically to support MAOA-mediated monoamine catabolism and methylation cycle turnover; companion products in the series include COMT+ for downstream catechol metabolism support and CBS Support+ for sulfur metabolism support';
BEGIN
    SELECT id, description INTO v_product_id, v_pre_description
    FROM public.products
    WHERE slug = 'maoa-plus-neurochemical-balance'
      AND sku = '40'
      AND category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152y.13 Lane 1 prose drift fix skipped: MAOA+ Neurochemical Balance row not found at slug maoa-plus-neurochemical-balance / SKU 40 / category != peptide';
        RETURN;
    END IF;

    IF v_pre_description IS NULL OR position(v_old_fragment IN v_pre_description) = 0 THEN
        RAISE NOTICE '#152y.13 Lane 1 prose drift fix skipped: target fragment not found in current description (likely already applied on a prior run, or description has been modified by a later migration); run_id=%', v_run_id;
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
        '152y_13_lane1_cross_product_family_prose_drift_fix',
        'products',
        '40',
        v_product_id,
        jsonb_build_object(
            'method', 'lane1_prose_drift_fix_surgical_replace',
            'columns', jsonb_build_array('description'),
            'old_fragment', v_old_fragment,
            'new_fragment', v_new_fragment,
            'rule_applied', 'lane1_marketing_prose_reconciliation',
            'authority', 'Gary canonical 2026-05-11 Prompt #152y.13 (Lane 1 follow-up logged in original 152y backfill_audit run_id 34d9208c product_id 367fb6dd-06a3-46e1-9fd9-7e8193353ce8 commit 86b1dc3; corrected source-doc "future products COMT+ and CBS Support+ planned" prose against live drift: 152j CBS Support+ Sulfur Pathway shipped 2026-05-04 commit 346c487 + 152l COMT+ Neurotransmitter Balance shipped 2026-05-04 commit cbc5fa0; both products already live in methylation-snp catalog at time 152y itself shipped)',
            'wording_choice', 'companion-products framing per Gary 2026-05-11 (3-option AskUserQuestion: companion-products / anchor / tier-architecture); drops "first product in the planned" -> "positioned within the" and drops "future products COMT+ ... CBS Support+ ... are planned to extend the family" -> "companion products in the series include COMT+ ... CBS Support+ ..."',
            'tech_mechanism_preserved', 'MAOA-mediated monoamine catabolism + methylation cycle turnover + downstream catechol metabolism support + sulfur metabolism support all preserved verbatim',
            'previous_pdp_description_length', length(v_pre_description),
            'current_pdp_description_length', length(v_post_description),
            'expected_byte_delta', length(v_new_fragment) - length(v_old_fragment),
            'standing_rules_compliance', 'zero em-dashes + zero en-dashes + zero arrow characters + zero curly quotes + zero emojis + ASCII hyphen-minus only in compound modifiers (MAOA-mediated)',
            'marshall_scan', 'NOT TRIGGERED (no ingredient content in changed prose; only product names COMT+ and CBS Support+ both existing 152 catalog methylation-snp products; Marshall reviews ingredient claims not product cross-references)',
            'closes_152y_13_deferred_flag', true,
            'lane', 'Lane 1 (marketing prose reconciliation)',
            'idempotent_on_rerun', 'true (position() guard short-circuits if substring absent)'
        )
    );

    RAISE NOTICE '#152y.13 MAOA+ Neurochemical Balance Lane 1 prose drift fix: rows updated=% / 1 expected; run_id=%; pre_length=%; post_length=%; byte_delta=%', v_count, v_run_id, length(v_pre_description), length(v_post_description), length(v_post_description) - length(v_pre_description);
END $$;
