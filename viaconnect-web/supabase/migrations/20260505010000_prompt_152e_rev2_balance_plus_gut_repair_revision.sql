-- Prompt #152e-rev2: Balance+ Gut Repair PDP revision (rev2 structured Lane-2 reconciled).
--
-- SUPERSEDES the original #152e paragraph copy (commit 15f0484, 2026-05-04)
-- with the rev2 structured-markdown format that renders inside the canonical
-- 152p Accordion via the existing renderStructuredDescription parser. Updates
-- both summary (catalog card one-sentence three-pillar-led highlight) and
-- description (## What does X do? + ## Ingredient breakdown + ## Who benefits
-- and what makes this different).
--
-- Lane 2 reconciliation per Gary directive 2026-05-05 + the new standing rule
-- feedback_152p_canonical_for_all_formulation_updates: every future PDP
-- product update follows the 152p design with Lane-2 live-formulation
-- reconciliation as the default. Original 152e-rev2 spec claimed a 13-
-- ingredient liposomal-only formulation with Slippery Elm + Bioperine;
-- live row at slug balance-plus-gut-repair has 17 ingredients with a mixed
-- liposomal/micellar/plain carrier system that does NOT include Slippery Elm
-- or Bioperine and DOES include 6 items absent from the spec (Ginger,
-- DigestiZorb+, Papaya, Fennel, C15:0, Inulin-FOS). Gary confirmed the live
-- 17 are canonical; this migration reconciles copy to the live formulation
-- per Lane 2.
--
-- Lane 2 corrections from original 152e-rev2 spec (12 total):
--   1. 13-ingredient -> 17-ingredient
--   2. "10x to 28x liposomal" -> "10x to 28x liposomal and micellar"
--      (live has 4 Liposomal + 3 Micellar carrier ingredients)
--   3. Drop Slippery Elm bullet (not in live)
--   4. Drop Bioperine bullet (not in live)
--   5. Quercetin: drop "(Aglycone)" qualifier (live is plain "Liposomal Quercetin")
--   6. Aloe Vera: "Liposomal Aloe Vera (Inner Leaf)" -> "Micellar Aloe Vera Extract (200:1)"
--   7. Marshmallow: "Liposomal Marshmallow Root" -> "Micellar Marshmallow Root Extract (10:1)"
--   8. DGL: drop "Liposomal" carrier prefix (live is non-liposomal)
--   9. Butyrate: "Liposomal Butyrate (Calcium-Magnesium)" -> "Butyrate (Sodium Butyrate)"
--  10. Zinc Carnosine: drop "Liposomal" prefix (live is plain w/ PepZin GI brand)
--  11. Probiotics: "Liposomal Probiotics (Multi-Strain)" -> "Proprietary Probiotic Blend (10 Billion CFU)" (drop named Lacto/Bifido strains since live names none)
--  12. Saccharomyces: keep "Liposomal" prefix (matches live)
--  13. ADD 6 new bullets matching live: Ginger, DigestiZorb+, Papaya, Fennel, C15:0, Inulin-FOS
--  14. Closing differentiation paragraph reweighted to multi-pillar (drops
--      Slippery Elm reference, adds digestive-enzyme + C15:0-membrane +
--      prebiotic pillars)
--   15. Catalog summary three-pillar middle phrase: "microbiome modulation"
--      -> "mucosal soothing" to align with the spec's locked Seal | Soothe |
--      Restore positioning
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug balance-plus-gut-repair confirmed live (matches first spec
--     candidate).
--   * SKU FC-BALANCE-001 (matches the 152x SKU convention; not a numeric
--     SKU like #152c had).
--   * Live ingredient count 17 totaling 985mg/serving (Gary canonical
--     2026-05-05 source-doc: matches Supabase row 1:1).
--   * price_msrp $98.88 ends in .88 per convention.
--   * Spec invented backfill_audit columns (prompt_ref, target_key, field,
--     old_value, new_value); live schema is (run_id, source_table,
--     target_table, sku, product_id, columns_loaded jsonb, applied_at).
--     Mirroring 152a/c/d/p family pattern.
--
-- Marshall dictionary scan (per feedback_marshall_dictionary_predelivery_scan):
-- copy authored by Claude per Gary Lane-2 directive 2026-05-05. Scanned
-- against src/lib/compliance/dictionaries/unapproved_peptides.ts: zero hits
-- for semaglutide, retatrutide, bromantane, semax, selank, cerebrolysin.
-- BPC-157 (which appeared in original 152e per memory) is ABSENT from rev2
-- per the spec's drop. Disease terms "leaky gut", "IBS", "autoimmune",
-- "histamine intolerance" all in noun-phrase form following verb constructions
-- ("Adults with leaky gut symptoms", "navigating IBS", "with autoimmune",
-- "with histamine intolerance"), verb-pair loophole established by 152e
-- original. Bioavailability copy reads "10x to 28x" verbatim. Hyphens
-- preserved in chemical names (L-Glutamine, N-Acetyl, Inulin-FOS, C15:0
-- uses colon not dash) and compound modifiers (single-mechanism, gut-axis,
-- multi-pillar). No em-dashes, no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug AND sku AND
-- category != peptide; UPDATE re-applies the canonical strings even if a
-- future hand-edit drifts. backfill_audit gets a new row each run.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'Tight junction integrity, mucosal soothing, and microbiome restoration support in a single capsule.';
    v_new_description text := E'## What does Balance+ Gut Repair do?\n\nBalance+ Gut Repair targets the tight junction integrity, mucosal soothing, and microbiome restoration that systemic inflammation, food sensitivities, and digestive symptoms depend on. The 17-ingredient capsule delivers L-Glutamine for enterocyte fuel, polyphenol mast cell stabilizers (curcumin, quercetin), demulcent mucilage botanicals (marshmallow, aloe, ginger, fennel, DGL), zinc carnosine for direct gastric mucosal support, sodium butyrate for colonocyte fuel, a digestive enzyme complex with papaya papain, the C15:0 saturated fatty acid Fatty15 for cellular membrane resilience, and a synbiotic component (Saccharomyces boulardii, proprietary multi-strain probiotic blend, Inulin-FOS prebiotic) that addresses the microbiome dimension single-mechanism products miss. The 10x to 28x liposomal and micellar bioavailability ensures clinically meaningful delivery for the historically poorly absorbed botanical and polyphenol components.\n\n## Ingredient breakdown\n\n- **L-Glutamine:** Fuels enterocytes (intestinal epithelial cells) for tight junction maintenance and gut barrier integrity.\n- **Liposomal N-Acetyl Glucosamine:** Provides the substrate for glycoprotein and glycosaminoglycan synthesis in mucin and connective tissue.\n- **Liposomal Curcumin (95% Curcuminoids):** Modulates NF-kB inflammatory pathways and supports tight junction protein expression for paracellular barrier function.\n- **Liposomal Saccharomyces Boulardii:** Provides probiotic yeast that displaces pathogenic species and supports mucosal IgA production.\n- **Liposomal Quercetin:** Stabilizes mast cell membranes and reinforces tight junction integrity through phospholipase A2 inhibition.\n- **Butyrate (Sodium Butyrate):** Delivers the short-chain fatty acid that colonocytes use as primary fuel and tight junction signaling driver.\n- **Zinc Carnosine (PepZin GI®):** Combines zinc with L-carnosine for direct gastric mucosal support and tight junction reinforcement documented in gastric epithelium.\n- **Micellar Aloe Vera Extract (200:1):** Concentrated polysaccharide source (acemannan) that supports epithelial repair and modulates inflammatory tone.\n- **Micellar Ginger Root Extract (10:1):** Supports gastric motility, reduces nausea, and provides additional anti-inflammatory gingerol polyphenol support.\n- **Micellar Marshmallow Root Extract (10:1):** Provides mucilage coverage that coats the GI mucosal surface and supports epithelial healing.\n- **DigestiZorb+ Digestive Enzyme Complex:** Supplies proteolytic, lipolytic, and saccharolytic enzymes that improve nutrient breakdown and reduce undigested-food substrate for dysbiosis.\n- **Papaya Extract (Papain enzyme):** Adds plant-source proteolytic activity that complements the digestive enzyme complex for protein hydrolysis.\n- **Fennel Seed Extract (4:1):** Carminative botanical that reduces bloating, supports motility, and provides additional anti-inflammatory polyphenols.\n- **Deglycyrrhizinated Licorice (DGL):** Supports gastric and intestinal mucosal regeneration without the cortisol effects of full licorice.\n- **C15:0 (Pentadecanoic Acid, Fatty15):** Odd-chain saturated fatty acid that supports cellular membrane resilience and metabolic homeostasis.\n- **Proprietary Probiotic Blend (10 Billion CFU):** Multi-strain probiotic component that restores microbiome diversity, produces short-chain fatty acids, and modulates immune tone.\n- **Inulin-FOS (Prebiotic Blend):** Selectively feeds beneficial gut bacteria, generating short-chain fatty acids and complementing the probiotic component for synbiotic function.\n\n## Who benefits and what makes this different\n\n**Who benefits:** Adults with leaky gut symptoms (food sensitivities, brain fog, joint pain, skin reactivity), individuals navigating IBS or chronic GI symptoms, those recovering from antibiotic courses where microbiome restoration is needed, adults with autoimmune conditions where gut barrier integrity influences systemic inflammation, individuals with histamine intolerance where mast cell stabilization complements DAO+ enzyme support, and people pursuing comprehensive gut-axis support beyond what isolated probiotics or single-mechanism products provide.\n\n**What makes it different:** What separates Balance+ from generic L-glutamine powders, isolated probiotic capsules, or single-botanical demulcents is the convergence of multi-pillar support: tight junction substrate (L-glutamine, zinc carnosine, N-acetyl glucosamine) plus mast cell and inflammatory modulation (curcumin, quercetin) plus demulcent mucosal coating (marshmallow, aloe, ginger, fennel, DGL) plus microbiome restoration (proprietary probiotic blend, Saccharomyces boulardii, Inulin-FOS prebiotic) plus colonocyte fuel (sodium butyrate) plus digestive enzyme support (DigestiZorb+, papain) plus C15:0 cellular membrane resilience (Fatty15), all operating in concert through liposomal and micellar delivery rather than as isolated single-mechanism support.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'balance-plus-gut-repair'
      AND p.sku = 'FC-BALANCE-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152e-rev2 Balance+ Gut Repair update skipped: row not found at slug balance-plus-gut-repair / SKU FC-BALANCE-001';
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
        '152e_rev2_balance_plus_gut_repair_revision',
        'products',
        'FC-BALANCE-001',
        v_product_id,
        jsonb_build_object(
            'method', 'rev2_structured_description_lane2_reconciled_per_152p_canonical',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'rev2_structured_pdp_152p_canonical_lane2',
            'authority', 'Gary canonical 2026-05-05 Prompt #152e-rev2 (Lane 2 reconciliation per Rule 12 hard-stop on original 13-ingredient + Slippery Elm + Bioperine claims; Gary confirmed live 17-ingredient formulation 985mg/serving as canonical)',
            'marshall_scan', 'human_review_pass_per_142v3_oq1_unresolved (Lane-2 reconciled copy; scanned against unapproved_peptides.ts, zero hits; BPC-157 absent per rev2 spec drop; disease terms ride 152e verb-pair loophole)',
            'bioavailability_format', '10x to 28x liposomal and micellar (4 Liposomal + 3 Micellar carriers in live formulation substantiate the multiplier per feedback_pdp_multiplier_claim_substantiation)',
            'lane2_corrections', jsonb_build_array(
                '13-ingredient -> 17-ingredient',
                '10x to 28x liposomal -> 10x to 28x liposomal and micellar',
                'Slippery Elm bullet REMOVED (not in live)',
                'Bioperine bullet REMOVED (not in live)',
                'Quercetin: drop (Aglycone) qualifier -> match live name',
                'Aloe Vera: Liposomal Inner Leaf -> Micellar Aloe Vera Extract (200:1)',
                'Marshmallow: Liposomal -> Micellar Marshmallow Root Extract (10:1)',
                'DGL: Liposomal prefix dropped',
                'Butyrate: Liposomal Calcium-Magnesium -> Butyrate Sodium Butyrate',
                'Zinc Carnosine: Liposomal prefix dropped, PepZin GI brand added',
                'Probiotics: Liposomal Multi-Strain -> Proprietary Probiotic Blend (10 Billion CFU)',
                'Saccharomyces: Liposomal prefix preserved (matches live)',
                'ADDED 6 bullets: Ginger, DigestiZorb+, Papaya, Fennel, C15:0, Inulin-FOS',
                'Catalog summary middle phrase: microbiome modulation -> mucosal soothing (aligns with Seal/Soothe/Restore positioning)',
                'Closing differentiation paragraph: multi-pillar reweighted to drop Slippery Elm + add digestive-enzyme + C15:0-membrane + prebiotic pillars'
            ),
            'product_name', 'Balance+ Gut Repair',
            'three_pillar_positioning', 'Seal | Soothe | Restore',
            'live_ingredient_total_mg', 985,
            'live_ingredient_count', 17,
            'rev2_canonical_pattern', 'feedback_152p_canonical_for_all_formulation_updates'
        )
    );

    RAISE NOTICE '#152e-rev2 Balance+ Gut Repair update: rows updated=% / 1 expected; run_id=%', v_count, v_run_id;
END $$;
