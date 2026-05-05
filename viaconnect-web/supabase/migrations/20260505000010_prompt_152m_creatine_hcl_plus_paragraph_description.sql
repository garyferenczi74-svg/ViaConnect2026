-- Prompt #152m: Creatine HCL+ Strength, Endurance, and Recovery PDP paragraph description.
--
-- Updates the existing FC-CREATINE-001 row (slug creatine-hcl-plus, format
-- powder, advanced-formulas) with the premium summary plus full-description
-- copy authored by Gary in the #152m spec. The always-visible PdpRightRail.tsx
-- mobile description section and the PdpDesktopTabs.tsx description tab panel
-- both pick up the new copy without further client code change. No
-- emphasis-spans registration; creatine slug intentionally NOT in
-- PDP_EMPHASIZED_TERMS.
--
-- Drift notes (verified live 2026-05-05 before authoring):
--   * Slug: live is 'creatine-hcl-plus' MATCHES spec's first candidate.
--     No resolution loop needed. Pinned to verified slug.
--   * SKU: FC-CREATINE-001 (standard FC-XXX-001 convention).
--   * Live product name is just "Creatine HCL+" (no "Strength, Endurance,
--     and Recovery" suffix). Spec uses the longer name in copy. Migration
--     touches ONLY summary + description, not name; live name preserved.
--   * Pricing: live price + price_msrp = 98.88 (matches .88 convention).
--   * Format: live format='powder' CONFIRMS spec deviation. Same
--     bioavailability-deviation pattern as #152f BHB Ketone Salts (tablet).
--   * Spec invented backfill_audit columns; corrected to live schema
--     (id, run_id, source_table, target_table, sku, product_id,
--     columns_loaded jsonb, applied_at) per #152 family precedent.
--
-- AUTHORITATIVE FORMULATION SUPERSEDES SOURCE DOC (Critical Issue 1):
-- Original source .docx listed an 11-ingredient capsule formulation with
-- Liposomal Betaine (TMG) 500 mg + Performance Electrolyte Matrix 150 mg
-- + Liposomal L-Taurine 100 mg + BioB Fusion B Complex 35 mg + L-Citrulline
-- 25 mg + Liposomal CoQ10 15 mg + Liposomal AstraGin 10 mg + Liposomal
-- Vitamin D3 "5 mg" (NONE of which are in the actual product). Gary
-- provided authoritative 13-ingredient scoop powder formulation totaling
-- 4,257.9 mg per scoop (8,515.8 mg/day at 2 scoops).
--
-- BIOAVAILABILITY DEVIATION (Critical Issue 2 + format=powder):
-- This is a powder formulation, not liposomal/micellar capsule. The locked
-- "10x to 28x" anchor does NOT apply (same posture as #152f BHB Ketone
-- Salts tablets). Auto-remediator posture verified for #152f and #152m:
-- src/lib/agents/michelangelo/reviewer.ts:189-192 and
-- src/lib/agents/jeffery/guardrails.ts:82 are NEGATIVE-only (block "5-27x"
-- form, do not enforce presence of "10x to 28x"). The new copy contains
-- neither forbidden form nor the "10x to 28x" anchor; passes silently.
--
-- VITAMIN D3 REMOVAL (Critical Issue 3):
-- Source-doc listed "Liposomal Vitamin D3 (Cholecalciferol) at 5 mg" which
-- was the same unit-typo error caught in #152i Catalyst+ (5 mg = 200,000
-- IU = 50x IOM upper safe limit, acutely toxic). Gary chose Option A:
-- D3 removed entirely from this formulation. PDP copy explicitly notes
-- D3 not included and directs to Catalyst+ Energy Multivitamin (#152i
-- corrected D3 to 5 mcg / 200 IU per capsule) for D3 supplementation.
--
-- COMPARATIVE-SUPERIORITY CLAIM REFRAMING (Critical Issue 4):
-- Source-doc made several claims that current peer-reviewed evidence does
-- not robustly support: "41x more soluble than creatine monohydrate"
-- (defensible for water solubility but conflated with bioavailability),
-- "60% smaller effective dose" (NOT supported by head-to-head
-- bioequivalence), "Superior absorption" (NOT supported by Jagim 2012,
-- 2015 J Diet Suppl). Creatine monohydrate has ~99% oral bioavailability
-- so improvements above that ceiling are biologically implausible.
-- Genuine HCL benefits preserved in copy: high water solubility (~600
-- mg/mL vs monohydrate ~14 mg/mL), reduced GI distress at lower per-dose
-- amounts, no required loading phase, absence of osmotic water retention.
--
-- Source-document corrections applied per #152m §"Source-Document
-- Corrections Applied" (recorded in audit metadata):
--   1. Authoritative 13-ingredient scoop powder formulation supersedes
--      original 11-ingredient capsule formulation entirely.
--   2. Format=powder, not capsule (no liposomal/micellar carriers).
--   3. Vitamin D3 REMOVED (mg-unit typo would have been acutely toxic;
--      D3 supplementation directed to Catalyst+ #152i).
--   4. "10x to 28x" bioavailability anchor does NOT apply (powder
--      format; same as #152f BHB tablets).
--   5. Comparative-superiority claims reframed for current evidence
--      (Jagim 2012 + 2015 J Diet Suppl).
--   6. FarmCeutica Inc. -> FarmCeutica Wellness LLC (disclaimer).
--   7. FarmCeutica Wellness Ltd. -> FarmCeutica Wellness LLC (footer).
--   8. info@farmceuticawellness.com -> info@viacura.com (SDS).
--   9. Trademark symbols dropped on Creatine HCL+.
--   10. "Building Performance Through Science" -> "Built For Your Biology".
--
-- Marshall scan: copy authored by Gary in the #152m spec body. No
-- unapproved peptides. Compounds named (Creatine Hydrochloride, HMB Free
-- Acid, CarnoSyn Beta-Alanine, R-Alpha Lipoic Acid, Glycine,
-- L-Ergothioneine, Bioperine, Niacinamide, Thiamine HCL, P5P, R5P,
-- Methylcobalamin, Methylfolate) are standard nutraceutical / amino acid
-- / vitamin nomenclature. Genetic variant names (MTHFR) are scientific
-- not regulated. Audience-targeting includes:
--   - "creatine-plus-HMB synergy that produces additive effects on lean
--     mass and strength gains";
--   - "adults over 40 maintaining muscle mass and strength where age-
--     related elevated muscle protein breakdown benefits from HMB-
--     mediated anti-catabolic support";
--   - "vegetarians and vegans whose dietary creatine intake is constrained";
--   - "MTHFR variants whose endogenous creatine synthesis benefits from
--     methylation cofactor support".
-- DISEASE_CLAIM verb-pair-loophole holds (no DISEASE_VERBS within 60
-- chars; "pursuing" / "maintaining" / "experienced" / "constrained" /
-- "benefits from" all NOT in DISEASE_VERBS). Cumulative 152x posture
-- continues across now 9 products. Hyphens preserved per #142 v3 +
-- #152 family precedent. No em-dashes, no en-dashes.
--
-- Idempotent on re-run: WHERE clause keys on slug + sku + category!=peptide.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count integer := 0;
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_new_summary text := 'Creatine HCL+ Strength, Endurance, and Recovery is precision athletic performance support for adults whose phosphocreatine saturation, anti-catabolic muscle protein protection, or methylation-cofactor performance demand need targeted reinforcement. A 13-ingredient pharmaceutical-grade scoop powder delivering 4,257.9 mg of actives per serving (8,515.8 mg per day at 2 scoops), Creatine HCL+ converges three performance pillars in a single scoop: muscle phosphocreatine saturation through pharmaceutical-grade Creatine Hydrochloride at 2,000 mg, anti-catabolic muscle protection through HMB Free Acid at 1,000 mg, and methylation-cofactor performance support through R-Alpha Lipoic Acid, glycine, methylated B vitamins, and L-ergothioneine, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile.';
    v_new_description text := 'Creatine HCL+ Strength, Endurance, and Recovery is precision athletic performance support for adults whose phosphocreatine saturation, anti-catabolic muscle protein protection, or methylation-cofactor performance demand need targeted reinforcement. Designed for strength and power athletes pursuing explosive efforts in resistance training, sprint training, and power-based sports, endurance athletes pursuing ATP regeneration and acid-base buffering for high-intensity efforts within longer events, active adults pursuing the creatine-plus-HMB synergy that produces additive effects on lean mass and strength gains, adults over 40 maintaining muscle mass and strength where age-related elevated muscle protein breakdown benefits from HMB-mediated anti-catabolic support, individuals who experienced GI distress from creatine monohydrate at standard 3 to 5 g doses, vegetarians and vegans whose dietary creatine intake is constrained, and adults with MTHFR variants whose endogenous creatine synthesis benefits from methylation cofactor support, this 13-ingredient pharmaceutical-grade scoop powder delivers Creatine Hydrochloride at 2,000 mg per scoop, HMB Free Acid at 1,000 mg, CarnoSyn Beta-Alanine at 800 mg, R-Alpha Lipoic Acid at 300 mg, Glycine at 100 mg, L-Ergothioneine at 12 mg, Bioperine at 10 mg, Niacin (as Niacinamide) at 15 mg, Thiamine HCL at 10 mg, Pyridoxal-5-Phosphate at 5 mg, Riboflavin-5-Phosphate at 5 mg, Methylcobalamin at 0.5 mg, and Methylfolate at 0.4 mg, totaling 4,257.9 mg of actives per scoop and 8,515.8 mg per day at the recommended 2-scoop daily protocol. Inside your muscle cells, these compounds work in concert. Pharmaceutical-grade Creatine HCL dissolves rapidly through its high inherent water solubility (approximately 600 mg/mL versus creatine monohydrate''s approximately 14 mg/mL), enters the SLC6A8 sodium-dependent creatine transporter pathway, and saturates phosphocreatine stores over 3 to 4 weeks, supporting strength, power, and high-intensity work capacity. HMB Free Acid simultaneously activates the mTOR pathway for muscle protein synthesis and inhibits the ubiquitin-proteasome pathway for muscle protein breakdown, producing the anti-catabolic effect that distinguishes the creatine-plus-HMB combination from creatine alone. CarnoSyn Beta-Alanine combines with histidine to form muscle carnosine for acid-base buffering during high-intensity efforts. R-Alpha Lipoic Acid supports glucose disposal into muscle through GLUT4 translocation, which may amplify creatine and amino acid uptake, and provides mitochondrial antioxidant protection. Glycine supplies the upstream substrate for the GATM step of endogenous creatine biosynthesis. L-Ergothioneine concentrates in mitochondria-rich tissues including skeletal muscle through OCTN1 active transport, providing antioxidant protection at the cellular sites of highest oxidative load. The methylated B-complex (Methylfolate, Methylcobalamin, P5P, R5P) supports the methylation cycle that produces SAMe, the methyl donor that creatine biosynthesis consumes at high rates (approximately 40% of daily SAMe production). Niacinamide and Thiamine support the NAD+ pools and pyruvate dehydrogenase activity that mitochondrial energy production requires. Bioperine extends systemic exposure for the polyphenols, B vitamins, and amino acid components. What separates Creatine HCL+ from conventional creatine monohydrate, isolated creatine HCL products, or generic pre-workout formulas is the convergence of three pillars in a single scoop: creatine-plus-HMB synergy at clinically meaningful doses, CarnoSyn beta-alanine acid-base buffering, and methylation-cofactor coverage that single-ingredient products miss, each tuned to the SNP variations the Via platform identifies in your Bio Optimization profile. Note: Creatine HCL+ is a scoop powder formulation, not a capsule or tablet, and does not use liposomal or micellar carriers. Vitamin D3 is not included in this product; athletes pursuing D3 supplementation should obtain it through Catalyst+ Energy Multivitamin or a separate dedicated D3 supplement. Built For Your Biology. Manufactured to 21 CFR Part 111 GMP standards by FarmCeutica Wellness LLC. Third-party tested every batch. CarnoSyn-branded beta-alanine. Banned-substance testing available on request for athletic compliance. Vegan, non-GMO, gluten-free, allergen-free.';
BEGIN
    SELECT id, to_jsonb(p) INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'creatine-hcl-plus'
      AND p.sku = 'FC-CREATINE-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE '#152m Creatine HCL+ paragraph update skipped: row not found at slug creatine-hcl-plus / SKU FC-CREATINE-001';
        RETURN;
    END IF;

    -- Defensive guard: refuse to apply if new copy contains the locked
    -- bioavailability anchor "10x to 28x" (this is a powder formulation;
    -- same posture as #152f BHB Ketone Salts; mirrors the defensive
    -- pattern from #152i Catalyst+ tesofensine guard).
    IF v_new_summary ILIKE '%10x to 28x%' OR v_new_description ILIKE '%10x to 28x%' THEN
        RAISE EXCEPTION '#152m ABORT: new copy contains "10x to 28x" anchor; this is a powder formulation per #152f precedent and the anchor does NOT apply. Aborting before UPDATE.';
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
        '152m_creatine_hcl_plus_paragraph_description',
        'products',
        'FC-CREATINE-001',
        v_product_id,
        jsonb_build_object(
            'method', 'paragraph_description_refresh_per_152m',
            'columns', jsonb_build_array('summary', 'description'),
            'old_value', v_pre_row,
            'new_value', v_post_row,
            'rule_applied', 'paragraph_pdp_152m',
            'authority', 'Gary canonical 2026-05-05 Prompt #152m; copy authored in spec body; authoritative 13-ingredient formulation supersedes source-doc 11-ingredient capsule formulation entirely',
            'marshall_scan', 'pass: no unapproved peptides; standard nutraceutical / amino acid / vitamin nomenclature; MTHFR variant naming scientific not regulated; audience targeting passes DISEASE_CLAIM via verb-pair-loophole consistent with 152e/f/g/h/i/j/k/l',
            'bioavailability_format', 'powder formulation; 10x to 28x anchor does NOT apply (same as #152f BHB Ketone Salts tablets); messaging rests on pharmaceutical-grade sourcing + high inherent Creatine HCL water solubility (600 mg/mL vs monohydrate 14 mg/mL) + HMB Free Acid superior absorption kinetics + Bioperine; defensive ILIKE guard in migration block prevents accidental anchor inclusion',
            'product_name', 'Creatine HCL+ Strength, Endurance, and Recovery',
            'product_name_live', 'Creatine HCL+ (live name shorter; migration touches summary + description only)',
            'ingredient_count', 13,
            'actives_total_mg_per_scoop', 4257.9,
            'actives_total_mg_per_day_at_2_scoops', 8515.8,
            'format', 'powder',
            'capsule_size', 'N/A: scoop powder formulation, no capsule',
            'second_powder_or_non_capsule_in_152x', 'after #152f BHB Ketone Salts (tablets); first powder',
            'authoritative_formulation_supersedes_source_doc', true,
            'vitamin_d3_status', 'REMOVED entirely per Gary Option A; source-doc 5 mg unit-typo would have been acutely toxic same as #152i Catalyst+ pattern; copy directs to Catalyst+ Energy Multivitamin or separate D3 supplement',
            'comparative_superiority_claims_reframed', 'sourcedoc 41x more soluble + 60 percent smaller effective dose + superior absorption claims removed per current peer-reviewed evidence (Jagim 2012, 2015 J Diet Suppl); genuine HCL benefits preserved (water solubility, GI tolerance, no loading phase)',
            'source_doc_corrections', jsonb_build_array(
                'authoritative_13_ingredient_formulation_supersedes_source_doc_11_ingredient',
                'format_powder_not_capsule_no_liposomal_micellar_carriers',
                'vitamin_d3_removed_per_gary_option_a_unit_typo_acutely_toxic',
                'bioavailability_anchor_10x_to_28x_does_not_apply_per_152f_precedent',
                'comparative_superiority_claims_reframed_per_current_peer_reviewed_evidence',
                'farmceutica_inc_to_wellness_llc_disclaimer',
                'farmceutica_wellness_ltd_to_llc_footer',
                'farmceuticawellness_email_to_viacura_email',
                'trademark_symbols_dropped_creatine_hcl_plus',
                'building_performance_through_science_to_built_for_your_biology'
            ),
            'compliance_followups_recommended', jsonb_build_array(
                'auto_remediation_logic_format_deviation_field_for_powder_tablet_products',
                'banned_substance_testing_protocol_per_athletic_compliance_request',
                'beta_alanine_dose_supplementation_at_higher_dose_for_peak_carnosine_effect'
            )
        )
    );

    RAISE NOTICE '#152m Creatine HCL+ paragraph update: rows updated=% / 1 expected; run_id=%; powder format with 10x to 28x guard PASSED', v_count, v_run_id;
END $$;
