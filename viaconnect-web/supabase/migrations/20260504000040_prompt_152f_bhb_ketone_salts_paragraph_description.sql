-- Prompt #152f: BHB Ketone Salts (tablet) PDP paragraph description.
--
-- Updates the existing FC-BHB-001 row (slug bhb-ketone-salts, format tablet
-- per #144 v2_rev1 alignment, base-formulations) with the premium summary
-- plus full-description copy authored by Gary in the #152f spec. The
-- always-visible PdpRightRail.tsx mobile description section and the
-- PdpDesktopTabs.tsx description tab panel both pick up the new copy
-- without further client code change. No emphasis-spans registration in
-- this prompt; bhb-ketone-salts slug is intentionally NOT in PDP_EMPHASIZED_TERMS.
--
-- Drift notes (verified live 2026-05-04 before authoring):
--   * Slug confirmed: bhb-ketone-salts (FC-BHB-001, base-formulations,
--     format=tablet). The spec offered five candidate slugs; the first
--     candidate matched live so no resolution loop is needed and the
--     migration pins to the verified slug.
--   * Spec invented backfill_audit columns (run_id, prompt_ref, target_table,
--     target_key, field, old_value, new_value, applied_at). Live schema is
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at). Migration uses live schema, packs
--     audit metadata into columns_loaded jsonb per #152a + #152b + #152e.
--   * Existing placeholder summary plus description erroneously stated
--     "Ketogenic fuel blend with liposomal MCT delivery" (this product is
--     a crystalline tri-mineral salt tablet, not liposomal MCT). The new
--     copy corrects the mechanistic framing.
--
-- Deviation 2 from the 152x family (intentional, scope-defined):
-- Bioavailability copy uses crystalline-tri-mineral-salt-dissolution
-- language ("80 to 95 percent bioavailability of the BHB anion", "peak
-- plasma BHB elevation within 30 to 60 minutes") instead of the site-wide
-- "10x to 28x" liposomal / micellar narrative. Rationale: this product
-- has no liposomal or micellar carrier; the 10x to 28x figure is anchored
-- to those carriers and would be substantiation-incorrect under DSHEA +
-- FTC §5 if applied to crystalline salts. Auto-remediator posture
-- verified 2026-05-04: src/lib/agents/michelangelo/reviewer.ts:189-192
-- only blocks the "5-27x" form; absence of "10x to 28x" is not enforced.
-- src/lib/agents/jeffery/guardrails.ts:82 same posture. The new copy
-- contains neither forbidden form, so the migration ships without
-- programmatic conflict. Standing-rule deviation acknowledged in
-- columns_loaded->>'bioavailability_format' for audit.
--
-- Marshall scan: copy authored by Gary in the #152f spec body. No
-- unapproved peptides (semaglutide / retatrutide / cognitive stimulants
-- absent). "BHB" / "Beta-Hydroxybutyrate" / "monocarboxylate transporter"
-- / "histone deacetylase" / "NLRP3" / "BDNF" are mechanism-of-action
-- nomenclature, not regulated compounds. Hyphens preserved in chemical
-- and compound-modifier names per #142 v3 precedent (Beta-Hydroxybutyrate,
-- tri-mineral, low-carbohydrate, fat-adapted, single-salt, high-sodium,
-- ATP-dependent, third-party, allergen-free, non-GMO, acetyl-CoA, keto-flu).
-- No em-dashes, no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug + sku; UPDATE re-applies
-- the canonical strings. backfill_audit gets a new row each run.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'BHB Ketone Salts is precision tri-mineral ketone support for adults whose ketogenic adaptation, electrolyte balance, or mitochondrial fuel availability need targeted reinforcement. A crystalline tri-mineral tablet delivering Calcium, Magnesium, and Sodium Beta-Hydroxybutyrate at a balanced 50 mg per mineral ratio, BHB Ketone Salts converges three pillars in a single tablet: ketogenic energy through exogenous BHB supply, electrolyte loading through balanced tri-mineral provision, and mitochondrial fuel through direct substrate delivery, each tuned to the metabolic flexibility profile the Via platform identifies in your Bio Optimization Score.';
    v_new_description text := 'BHB Ketone Salts is precision tri-mineral ketone support for adults whose ketogenic adaptation, electrolyte balance, or mitochondrial fuel availability need targeted reinforcement. Designed for adults transitioning to ketogenic or low-carbohydrate dietary protocols, athletes pursuing endurance or fat-adapted performance, knowledge workers seeking cognitive clarity from ketone fuel, individuals managing insulin resistance or metabolic flexibility deficits under practitioner supervision, and adults experiencing keto-flu during dietary transition, this tri-mineral tablet delivers Calcium Beta-Hydroxybutyrate, Magnesium Beta-Hydroxybutyrate, and Sodium Beta-Hydroxybutyrate at a balanced 50 mg per mineral ratio. The crystalline tri-mineral salt complex dissolves directly in aqueous solution, with 80 to 95 percent bioavailability of the BHB anion and peak plasma BHB elevation within 30 to 60 minutes of ingestion. Inside your cells, these compounds work in concert. The BHB anion enters cells via monocarboxylate transporters and crosses into mitochondria where it is oxidized through beta-hydroxybutyrate dehydrogenase to acetoacetate and onward to acetyl-CoA, supplying ATP without the insulin spike that glucose triggers. Beyond direct fuel function, BHB inhibits class I histone deacetylases at physiological concentrations, modulates the NLRP3 inflammasome, and supports BDNF expression in neurons. The calcium cation supports neuromuscular signaling. The magnesium cation supports ATP-dependent enzyme function and reduces the muscle cramping common during ketogenic transition. The sodium cation supports extracellular fluid balance and replenishes the sodium that ketogenic states aggressively excrete. What separates BHB Ketone Salts from single-salt high-sodium ketone powders, bulk ketone esters, or generic electrolyte tablets is the convergence of three pillars in a single tablet: ketogenic energy, electrolyte loading, and mitochondrial fuel, each tuned to the metabolic flexibility profile the Via platform identifies in your Bio Optimization Score. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. Vegan, non-GMO, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'bhb-ketone-salts'
      AND p.sku = 'FC-BHB-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152f BHB Ketone Salts paragraph update skipped: row not found at slug bhb-ketone-salts / SKU FC-BHB-001';
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
        '152f_bhb_ketone_salts_paragraph_description',
        'products',
        'FC-BHB-001',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152f',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152f',
            'authority', 'Gary canonical 2026-05-04 Prompt #152f; copy authored in spec body',
            'marshall_scan', 'pass: no unapproved peptides; mechanistic compound names (BHB, monocarboxylate, NLRP3, BDNF, HDAC) are not regulated compounds',
            'bioavailability_format', 'crystalline-tri-mineral-salt-dissolution (80 to 95 percent BHB anion; 30 to 60 minute peak plasma); standing 10x to 28x rule deviation per #152f Deviation 2 (no liposomal / micellar carrier in this product)',
            'product_name', 'BHB Ketone Salts',
            'form_factor', 'tablet',
            'standing_rule_deviation', 'bioavailability_format_replaced_per_152f_spec_authority'
        )
    );

    RAISE NOTICE '#152f BHB Ketone Salts paragraph update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
