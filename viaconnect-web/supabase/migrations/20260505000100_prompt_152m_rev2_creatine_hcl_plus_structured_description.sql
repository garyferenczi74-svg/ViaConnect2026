-- Prompt #152m-rev2: Creatine HCL+ PDP rev2 (structured Full Description, scoop powder format).
-- Supersedes original #152m paragraph copy (commit 5ad... 20260505000010 migration).
-- Updates summary (catalog card one-sentence three-pillar-led highlight) and description
-- (structured three-section Full Description: opening paragraph + 13-ingredient bullet list +
-- closing two-paragraph differentiation section) to render inside the canonical #152p Accordion
-- with heading "Full Description" matching the existing Formulation accordion pattern.
-- Append-only; data-only migration (no schema changes).
-- Format deviation note: scoop powder (NOT capsule, NOT liposomal); the "10x to 28x" anchor does
-- NOT apply per the established multiplier-claim-substantiation rule for scoop powder formats.
-- Pure structured-format swap (no Lane-2 corrections needed): live formulation matches spec's
-- 13 description bullets and Gary's authoritative paste at the bottom of the rev2 spec exactly
-- (Creatine Hydrochloride 2,000 mg + HMB-FA 1,000 mg + Beta-Alanine CarnoSyn 800 mg + R-ALA 300 mg
-- + Glycine 100 mg + L-Ergothioneine 12 mg + BioPerine 10 mg + Niacinamide 15 mg + Thiamine HCL 10 mg
-- + P5P 5 mg + R5P 5 mg + Methylcobalamin 0.5 mg + Methylfolate 0.4 mg = 4,257.9 mg/scoop;
-- 8,515.8 mg/day at recommended 2-scoop protocol).

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_pre_row jsonb;
    v_post_row jsonb;
    v_product_id uuid;
    v_live_ingredient_count int;
    v_live_total_dose numeric;
    v_new_summary text := 'Phosphocreatine saturation, anti-catabolic muscle protection, and methylation-cofactor performance support in a single scoop.';
    v_new_description text := $desc$## What does Creatine HCL+ do?

Creatine HCL+ targets phosphocreatine saturation, anti-catabolic muscle protection, and methylation-cofactor performance support through a 13-ingredient pharmaceutical-grade scoop powder. The formula pairs Creatine Hydrochloride with HMB Free Acid for the documented additive synergy on lean mass and strength, CarnoSyn beta-alanine for acid-base buffering, R-Alpha Lipoic Acid for glucose disposal amplification, glycine for endogenous creatine substrate, L-ergothioneine for mitochondrial antioxidant protection, and the methylated B-complex (5-MTHF, methylcobalamin, P5P, R5P, plus B1, B3) that supports the SAMe pool that endogenous creatine synthesis consumes at high rates. The scoop powder format provides 4,257.9 mg of actives per scoop and 8,515.8 mg per day at the recommended 2-scoop protocol.

## Ingredient breakdown

- **Creatine Hydrochloride:** Saturates muscle phosphocreatine through the SLC6A8 transporter for rapid ATP regeneration during high-intensity efforts.
- **HMB Free Acid (Beta-Hydroxy Beta-Methylbutyrate):** Activates mTOR for muscle protein synthesis and inhibits ubiquitin-proteasome breakdown for the anti-catabolic dimension creatine alone misses.
- **Beta-Alanine (CarnoSyn):** Combines with histidine to form muscle carnosine for acid-base buffering during high-intensity work.
- **R-Alpha Lipoic Acid:** Supports glucose disposal through GLUT4 translocation, amplifying creatine and amino acid uptake in the bioactive R-enantiomer.
- **Glycine:** Provides the upstream substrate for endogenous creatine biosynthesis through the GATM step.
- **L-Ergothioneine:** Concentrates in mitochondria-rich tissues through OCTN1 transport for cellular antioxidant protection.
- **Bioperine (Black Pepper Extract):** Extends systemic exposure for the amino acid and polyphenol components through CYP3A4 inhibition.
- **Niacin (as Niacinamide):** Provides NAD+ precursor for mitochondrial energy production and DNA repair.
- **Thiamine HCL (B1):** Cofactors pyruvate dehydrogenase, the gateway enzyme connecting glycolysis to the TCA cycle.
- **Pyridoxal-5-Phosphate (P5P):** Cofactors over a hundred amino acid metabolism enzymes in the active form.
- **Riboflavin-5-Phosphate (R5P):** Provides FAD for MTHFR activity and the mitochondrial electron transport chain.
- **Methylcobalamin (B12):** Cofactors methionine synthase for the homocysteine remethylation that creatine biosynthesis depletes.
- **Methylfolate (5-MTHF):** Provides active methylated folate that bypasses MTHFR polymorphism bottlenecks for SAMe regeneration.

## Who benefits and what makes this different

**Who benefits:** Strength and power athletes pursuing phosphocreatine saturation, endurance athletes seeking ATP regeneration support and acid-base buffering, active adults pursuing the creatine-plus-HMB synergy that produces additive effects on lean mass beyond either compound alone, adults over 40 maintaining muscle mass where age-related elevated muscle protein breakdown benefits from HMB-mediated anti-catabolic support, individuals with GI sensitivity to creatine monohydrate where HCL form reduces distress, vegetarians and vegans whose dietary creatine intake is constrained, and those with MTHFR variants whose methylation-linked endogenous creatine synthesis benefits from active-form B vitamins.

**What makes it different:** What separates Creatine HCL+ from monohydrate alone, isolated creatine HCL products, or generic pre-workouts is the convergence of three pillars: creatine-plus-HMB synergy at clinically meaningful doses, CarnoSyn beta-alanine acid-base buffering, and methylation-cofactor coverage that single-ingredient products miss, plus the higher water solubility of the HCL form (~600 mg/mL versus monohydrate ~14 mg/mL) for tolerability. Note: Vitamin D3 is not included in this product; athletes pursuing D3 supplementation should obtain it through Catalyst+ Energy Multivitamin or a separate dedicated D3 supplement.$desc$;
BEGIN
    -- Resolve product row (slug + sku + non-peptide guard)
    SELECT id, to_jsonb(p)
    INTO v_product_id, v_pre_row
    FROM public.products p
    WHERE p.slug = 'creatine-hcl-plus'
      AND p.sku = 'FC-CREATINE-001'
      AND p.category != 'peptide';

    IF v_product_id IS NULL THEN
        RAISE NOTICE 'Prompt 152m-rev2: products row for Creatine HCL+ (slug=creatine-hcl-plus, sku=FC-CREATINE-001, category!=peptide) not found. Aborting without changes.';
        RETURN;
    END IF;

    -- Defensive Lane-2 protection: confirm live formulation matches Gary's authoritative paste
    -- (13 ingredients @ 4,257.9 mg total per scoop). Abort if drift detected to force re-audit.
    SELECT
        jsonb_array_length(coalesce(p.ingredients, '[]'::jsonb)),
        COALESCE((SELECT SUM((e->>'dose')::numeric) FROM jsonb_array_elements(coalesce(p.ingredients, '[]'::jsonb)) e), 0)
    INTO v_live_ingredient_count, v_live_total_dose
    FROM public.products p
    WHERE p.id = v_product_id;

    IF v_live_ingredient_count != 13 THEN
        RAISE EXCEPTION 'Prompt 152m-rev2: live ingredient count mismatch. Expected 13 (per Gary authoritative paste), found %. Re-audit before re-running.', v_live_ingredient_count;
    END IF;

    IF v_live_total_dose != 4257.9 THEN
        RAISE EXCEPTION 'Prompt 152m-rev2: live total dose mismatch. Expected 4,257.9 mg/scoop (per Gary authoritative paste), found % mg. Re-audit before re-running.', v_live_total_dose;
    END IF;

    -- Defensive content guards: rev2 description must contain three-section structure markers
    -- and the SAMe-cofactor + 600/14 solubility specifics that uniquely identify this copy.
    -- Bioavailability "10x to 28x" anchor must NOT appear (scoop powder format deviation).
    IF v_new_description NOT ILIKE '%## What does Creatine HCL+ do?%' THEN
        RAISE EXCEPTION 'Prompt 152m-rev2: description missing structured opening section heading.';
    END IF;

    IF v_new_description NOT ILIKE '%## Ingredient breakdown%' THEN
        RAISE EXCEPTION 'Prompt 152m-rev2: description missing structured ingredient breakdown section heading.';
    END IF;

    IF v_new_description NOT ILIKE '%## Who benefits and what makes this different%' THEN
        RAISE EXCEPTION 'Prompt 152m-rev2: description missing structured closing section heading.';
    END IF;

    IF v_new_description NOT ILIKE '%600 mg/mL%' OR v_new_description NOT ILIKE '%14 mg/mL%' THEN
        RAISE EXCEPTION 'Prompt 152m-rev2: description missing 600/14 mg/mL water solubility anchor (scoop format inherent-bioavailability substantiation).';
    END IF;

    IF v_new_description NOT ILIKE '%4,257.9 mg%' OR v_new_description NOT ILIKE '%8,515.8 mg%' THEN
        RAISE EXCEPTION 'Prompt 152m-rev2: description missing per-scoop or per-day dose totals.';
    END IF;

    IF v_new_description ILIKE '%10x to 28x%' OR v_new_description ILIKE '%10x-28x%' OR v_new_description ILIKE '%10 to 28%' THEN
        RAISE EXCEPTION 'Prompt 152m-rev2: 10x to 28x anchor present but format=powder; this anchor does NOT apply to scoop format. Remove before re-running.';
    END IF;

    -- Apply update
    UPDATE public.products
    SET summary = v_new_summary,
        description = v_new_description
    WHERE id = v_product_id;

    -- Capture post-state
    SELECT to_jsonb(p) INTO v_post_row FROM public.products p WHERE p.id = v_product_id;

    -- Audit row (live backfill_audit schema, not the spec's invented schema)
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    VALUES (
        v_run_id,
        '152m_rev2_creatine_hcl_plus_structured_description',
        'products',
        'FC-CREATINE-001',
        v_product_id,
        jsonb_build_object(
            'prompt_ref', '152m-rev2',
            'supersedes_152m_run_id', null,
            'columns', jsonb_build_array('summary', 'description'),
            'pre', jsonb_build_object(
                'summary', v_pre_row->>'summary',
                'description', v_pre_row->>'description'
            ),
            'post', jsonb_build_object(
                'summary', v_post_row->>'summary',
                'description', v_post_row->>'description'
            ),
            'lane2_status', 'no_corrections_needed',
            'live_ingredient_count', v_live_ingredient_count,
            'live_total_dose_mg_per_scoop', v_live_total_dose,
            'format', 'powder',
            'multiplier_anchor_applied', false,
            'multiplier_anchor_reason', 'scoop powder format; bioavailability rests on Creatine HCL water solubility 600 mg/mL vs monohydrate 14 mg/mL plus HMB-FA absorption kinetics versus calcium salt'
        )
    );

    RAISE NOTICE 'Prompt 152m-rev2: Creatine HCL+ summary+description updated (run_id=%, product_id=%, live_ingredients=%, total_dose=% mg)', v_run_id, v_product_id, v_live_ingredient_count, v_live_total_dose;
END $$;
