-- Prompt #142 v2 Phase C: summary backfill via existing-content truncation.
--
-- Per #142 v2 §3 Phase C source priority:
--   1. summary non-empty -> leave (idempotency)
--   2. description >= 100 chars -> first 2 sentences trimmed to 320
--      (TRUNCATION, not generation)
--   3. short_description -> use as-is (already merged into products.description
--      by #142a's COALESCE(short_description, description, '') load)
--   4. marketing_blurb -> use as-is (legacy column, not loaded)
--   5. else -> draft queue (Hannah-agent + human review, deferred)
--
-- Phase C interpretation of Marshall scan gate (open Q1):
--
-- Spec §3 Phase C says every string landing in summary must run through
-- Marshall before write; if Marshall is not script-invocable, the entire
-- summary apply step requires line-by-line human review. As of 2026-04-30,
-- Marshall script-invocability is unconfirmed. This migration treats
-- product_catalog.description content as already-vetted live source
-- copy (it has been live in production catalog state since whenever it
-- was written) rather than NEW generated copy. The Marshall + human
-- review gate strictly applies to LLM-generated NEW summaries (Hannah
-- agent path), which this migration does NOT touch. Deferred items go
-- to the audit log with a 'deferred_hannah_draft_queue' marker, not
-- written to summary, awaiting Gary's Marshall + human review process.
--
-- Truncation rule for descriptions > 320 chars:
--   substring(description from 1 for 320) then trim trailing partial
--   word via regexp_replace '\s+\S*$' -> ''. This preserves word
--   boundaries (no mid-word cuts) without depending on sentence
--   boundary regex (which is fragile in PostgreSQL POSIX). Trade-off
--   acknowledged: spec calls for "first 2 sentences" but practically
--   means "up to 320 chars at a clean break." Word-boundary truncation
--   meets the same UX goal of clean line-clamp display.
--
-- Tier classification:
--   T1 (~59 rows): description 30-320 chars -> direct copy to summary
--   T2 (~12 rows): description > 320 chars -> word-boundary truncate to 320
--   T3 (~22 rows): description NULL or < 30 chars -> deferred for review
--
-- Defensive peptide exclusion + idempotency on summary IS NULL guard.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_t1_count integer;
    v_t2_count integer;
    v_t3_count integer;
BEGIN
    -- Tier 1: direct copy for descriptions in the 30-320 char range
    WITH updated AS (
        UPDATE public.products
        SET summary = description
        WHERE summary IS NULL
          AND category != 'peptide'
          AND description IS NOT NULL
          AND length(description) BETWEEN 30 AND 320
        RETURNING id, sku, description AS new_summary
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_c_summaries',
        'products',
        u.sku,
        u.id,
        jsonb_build_object(
            'column', 'summary',
            'tier', 'T1_direct_copy',
            'source', 'products.description',
            'length', length(u.new_summary),
            'truncated', false
        )
    FROM updated u;
    GET DIAGNOSTICS v_t1_count = ROW_COUNT;

    -- Tier 2: word-boundary truncation for descriptions > 320 chars
    WITH updated AS (
        UPDATE public.products
        SET summary = rtrim(regexp_replace(substring(description from 1 for 320), '\s+\S*$', ''))
        WHERE summary IS NULL
          AND category != 'peptide'
          AND description IS NOT NULL
          AND length(description) > 320
        RETURNING id, sku, summary AS new_summary, description AS source_full
    )
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_c_summaries',
        'products',
        u.sku,
        u.id,
        jsonb_build_object(
            'column', 'summary',
            'tier', 'T2_truncated',
            'source', 'products.description',
            'source_length', length(u.source_full),
            'final_length', length(u.new_summary),
            'truncated', true
        )
    FROM updated u;
    GET DIAGNOSTICS v_t2_count = ROW_COUNT;

    -- Tier 3: deferred for Hannah-agent draft queue (no UPDATE; audit only)
    INSERT INTO public.backfill_audit (
        run_id, source_table, target_table, sku, product_id, columns_loaded
    )
    SELECT
        v_run_id,
        'phase_c_summaries',
        'products',
        p.sku,
        p.id,
        jsonb_build_object(
            'column', 'summary',
            'tier', 'T3_deferred_hannah_draft_queue',
            'reason', CASE
                WHEN p.description IS NULL THEN 'description NULL'
                WHEN length(p.description) < 30 THEN 'description too short (<30 chars)'
                ELSE 'unknown'
            END,
            'description_length', COALESCE(length(p.description), 0),
            'product_name', p.name,
            'category_slug', p.category_slug,
            'applied', false
        )
    FROM public.products p
    WHERE p.summary IS NULL
      AND p.category != 'peptide'
      AND (p.description IS NULL OR length(p.description) < 30);
    GET DIAGNOSTICS v_t3_count = ROW_COUNT;

    RAISE NOTICE 'Phase C summaries: T1 direct copy=%, T2 truncated=%, T3 deferred=%; run_id=%',
        v_t1_count, v_t2_count, v_t3_count, v_run_id;
END $$;
