-- Prompt #142c §6: partial unique index to prevent canonical-slug duplicates
-- across all non-peptide categories.
--
-- The index keys on (category_slug, regexp_replace(slug, '-[0-9]+$', ''))
-- so any future seeding pass that tries to insert a slug whose canonical
-- base is already taken in the same category fails loudly at the DB
-- constraint level. This is the structural fix that prevents the #142c
-- failure mode from recurring across any category.
--
-- The CREATE INDEX is wrapped in an exception handler: if it fails due
-- to existing duplicates in OTHER categories (the methylation cleanup
-- already removed methylation duplicates), the handler raises a NOTICE
-- and does NOT silently skip. Other-category duplicates trigger a
-- follow-up #142d per the original spec §10.
--
-- Defensive partial index: WHERE category != 'peptide' since peptides
-- are explicitly out of scope and may have their own naming conventions.

DO $$
BEGIN
    BEGIN
        CREATE UNIQUE INDEX uniq_products_canonical_slug_per_category
            ON public.products (category_slug, (regexp_replace(slug, '-[0-9]+$', '')))
            WHERE category != 'peptide';
        RAISE NOTICE '142c canonical slug index created successfully; recurrence prevented across all non-peptide categories.';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE '142c canonical slug index BLOCKED by existing duplicates in non-methylation categories. Run a SELECT category_slug, regexp_replace(slug, ''-[0-9]+$'', '''') AS base, count(*) FROM public.products WHERE category != ''peptide'' GROUP BY 1, 2 HAVING count(*) > 1 to surface offenders. #142d follow-up required.';
        WHEN duplicate_table THEN
            RAISE NOTICE '142c canonical slug index already exists; idempotent no-op.';
    END;
END $$;
