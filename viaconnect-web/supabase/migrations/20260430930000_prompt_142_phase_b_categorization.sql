-- Prompt #142 v2 Phase B: heuristic categorization with confidence levels.
--
-- Per #142 v2 §3 Phase B, assign category_slug to non-peptide products
-- via 7-priority keyword bucket heuristic. Priority order:
--   1. category='test_kit' + GeneX360-family name -> genex360
--   2. SNP gene name keyword + category='supplement' -> methylation-snp
--   3. mushroom keyword -> functional-mushrooms
--   4. womens-related keyword -> womens-health
--   5. childrens keyword -> childrens-formulations
--   6. advanced-formula keyword -> advanced-formulas
--   7. category='supplement' default -> base-formulations
--   8. category='peptide' -> NULL (excluded)
--
-- Confidence levels per spec:
--   HIGH: priority 1-7 fired AND legacy category from product_catalog
--     aligns with the priority's expected set. Auto-applied.
--   MEDIUM: priority 1-6 fired but legacy category is unexpected.
--     Logged in backfill_audit; NOT auto-applied; Gary reviews.
--   LOW: priority 7 default fired but legacy category is not 'base'.
--     Logged in backfill_audit; NOT auto-applied; Gary reviews.
--
-- Spec amendments documented:
--
--   Amendment 1 (CYP and APOE keywords in priority 2): The spec lists
--     20 SNP names (MTHFR, COMT, ..., TCN2) plus 'methyl' for priority 2.
--     Production data also has APOE+ and CYP450+ in the legacy 'genetic'
--     category. These products would otherwise fall to priority 7
--     (base-formulations default) with LOW confidence. Including APOE
--     and CYP-prefix names in the priority 2 keyword set captures them
--     as methylation-snp HIGH confidence (legacy='genetic' aligns).
--     CYP requires `^CYP` start-of-word matching since the regex \M
--     end-of-word boundary fails between letters and digits (CYP450).
--
--   Amendment 2 (legacy 'Testing' = 'test_kit' for priority 1 expected
--     set): product_catalog has both 'test_kit' (5 rows) and 'Testing'
--     (2 rows: CannabisIQ, PeptidesIQ) categories. Both map to test_kit
--     in #142a's collapse and both belong to genex360. Treat both
--     legacy values as priority-1-expected.
--
-- Pre-flight verified via Supabase MCP:
--   - 93 rows in products with NULL category_slug
--   - Heuristic produces: 87 HIGH (auto-apply), 3 MEDIUM (MethylB
--     Complete+, NeuroCalm BH4, SHRED+), 3 LOW (30 Day Custom Vitamin
--     Package, AMINO ACID MATRIX+, CYP450+ before Amendment 1).
--     With Amendment 1, CYP450+ moves to HIGH; final split is 88/3/2.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_high_count integer;
    v_medium_count integer;
    v_low_count integer;
BEGIN
    -- Compute heuristic + confidence into a temp table
    CREATE TEMP TABLE phase_b_classification ON COMMIT DROP AS
    WITH heuristic AS (
        SELECT
            p.id,
            p.sku,
            p.name,
            p.category AS products_category,
            pc.category AS legacy_category,
            CASE
                WHEN p.category = 'test_kit' AND (
                    p.name ILIKE '%GeneX360%' OR p.name ILIKE '%NutragenHQ%' OR
                    p.name ILIKE '%NutrigenDX%' OR p.name ILIKE '%HormoneIQ%' OR
                    p.name ILIKE '%EpiGenDX%' OR p.name ILIKE '%PeptidesIQ%' OR
                    p.name ILIKE '%CannabisIQ%' OR p.name ILIKE '%GeneX-M%' OR
                    p.name ILIKE '%GeneXM%' OR p.name ILIKE '%Biological Age%'
                ) THEN 1
                WHEN p.category = 'supplement' AND (
                    p.name ~* '\m(MTHFR|COMT|VDR|MTRR|MTR|BHMT|CBS|ACAT|ACHY|ADO|DAO|GST|MAOA|NAT|NOS|RFC1|SHMT|SOD|SUOX|TCN2|APOE)\M'
                    OR p.name ~* '\mCYP'
                    OR p.name ILIKE '%methyl%'
                ) THEN 2
                WHEN p.name ~* '(lion''s mane|reishi|cordyceps|chaga|turkey tail|maitake|shiitake|mushroom)' THEN 3
                WHEN p.name ~* '(prenatal|postnatal|preconception|menopause|menobalance|cyclesync|desire|revitalizher|thrive\+|grow\+|thyrobalance|radiance|pre-natal|post-natal|women|hormonal|cycle)' THEN 4
                WHEN p.name ~* '(infant|toddler|child|kid|pediatric|sproutables)' THEN 5
                WHEN p.name ~* '(performance|longevity|recovery|cognitive|metabolic|creatine|nad\+|catalyst|nitric oxide|nootropic|telomere|teloprime|detox|neurocalm|neuroaxis|histamine|thyrocalm|inferno|shred|focus\+|rise\+|flex\+|iron\+|replenish|relax\+|blast\+|balance\+|calm\+|clean\+|digestizorb|aptigen)' THEN 6
                WHEN p.category = 'supplement' THEN 7
                WHEN p.category = 'peptide' THEN 8
                ELSE NULL
            END AS matched_priority
        FROM public.products p
        LEFT JOIN public.product_catalog pc ON pc.sku = p.sku
        WHERE p.category_slug IS NULL AND p.category != 'peptide'
    )
    SELECT
        id,
        sku,
        name,
        legacy_category,
        matched_priority,
        CASE matched_priority
            WHEN 1 THEN 'genex360'
            WHEN 2 THEN 'methylation-snp'
            WHEN 3 THEN 'functional-mushrooms'
            WHEN 4 THEN 'womens-health'
            WHEN 5 THEN 'childrens-formulations'
            WHEN 6 THEN 'advanced-formulas'
            WHEN 7 THEN 'base-formulations'
            ELSE NULL
        END AS heuristic_slug,
        CASE
            WHEN matched_priority = 1 AND legacy_category IN ('test_kit', 'Testing') THEN 'HIGH'
            WHEN matched_priority = 2 AND legacy_category IN ('genetic', 'snp') THEN 'HIGH'
            WHEN matched_priority = 3 AND legacy_category = 'mushroom' THEN 'HIGH'
            WHEN matched_priority = 4 AND legacy_category = 'womens' THEN 'HIGH'
            WHEN matched_priority = 5 AND legacy_category = 'childrens' THEN 'HIGH'
            WHEN matched_priority = 6 AND legacy_category = 'advanced' THEN 'HIGH'
            WHEN matched_priority = 7 AND legacy_category = 'base' THEN 'HIGH'
            WHEN matched_priority BETWEEN 1 AND 6 THEN 'MEDIUM'
            WHEN matched_priority = 7 THEN 'LOW'
            ELSE 'NONE'
        END AS confidence
    FROM heuristic;

    -- Apply HIGH confidence only
    UPDATE public.products p
    SET category_slug = c.heuristic_slug
    FROM phase_b_classification c
    WHERE p.id = c.id
      AND c.confidence = 'HIGH'
      AND c.heuristic_slug IS NOT NULL;

    -- Audit ALL classifications, not just applied ones
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_b_categorization',
        'products',
        c.sku,
        c.id,
        jsonb_build_object(
            'column', 'category_slug',
            'heuristic_slug', c.heuristic_slug,
            'matched_priority', c.matched_priority,
            'legacy_category', c.legacy_category,
            'confidence', c.confidence,
            'applied', (c.confidence = 'HIGH'),
            'product_name', c.name
        )
    FROM phase_b_classification c;

    SELECT
        count(*) FILTER (WHERE confidence = 'HIGH'),
        count(*) FILTER (WHERE confidence = 'MEDIUM'),
        count(*) FILTER (WHERE confidence = 'LOW')
    INTO v_high_count, v_medium_count, v_low_count
    FROM phase_b_classification;

    RAISE NOTICE 'Phase B categorization complete: HIGH=% (auto-applied), MEDIUM=% (audit only), LOW=% (audit only); run_id=%',
        v_high_count, v_medium_count, v_low_count, v_run_id;
END $$;
