-- =============================================================================
-- Search Agent Housekeeping (Prompt #59 — replaces seed_88_brands)
-- =============================================================================
-- Diagnosis: Prompt #59 framed the work as "seed 88 missing brands", but every
-- brand on the master list is already present in supplement_brand_registry.
-- The 88 are pending enrichment, not pending insertion. So this migration:
--   1. Adds 3 alias variants from the master list paste (mbg, Vthrive, Sam's)
--   2. Collapses 6 duplicate brand pairs (AG1, Seed, Equate, Kirkland, Member's
--      Mark, Kyolic) — preserves the canonical row, migrates FK references via
--      cascade-aware DELETE, adds the deleted variant as an alias
--   3. Backfills the 1 orphan registry row missing from brand_enrichment_state
--      (FarmCeutica Wellness LLC — marks as 'enriched' so the agent skips it)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ALIAS VARIANTS — fuzzy search hits for spelling/marketing variants
-- ---------------------------------------------------------------------------
INSERT INTO public.supplement_brand_aliases (brand_registry_id, alias, normalized_alias, alias_type)
SELECT r.id, v.alias, lower(regexp_replace(v.alias, '[^a-zA-Z0-9]', '', 'g')), v.alias_type
FROM (VALUES
  ('mindbodygreen',           'mbg',                       'abbreviation'),
  ('mindbodygreen',           'mbg (mindbodygreen)',       'common'),
  ('Vitamin Shoppe',          'Vthrive',                   'common'),
  ('Vitamin Shoppe',          'Vitamin Shoppe (Vthrive)',  'common'),
  ('Member''s Mark',          'Member''s Mark (Sam''s)',   'common'),
  ('Member''s Mark',          'Sam''s Club',               'parent_company')
) AS v(canonical, alias, alias_type)
JOIN public.supplement_brand_registry r ON r.brand_name = v.canonical
ON CONFLICT (normalized_alias) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. DUPLICATE COLLAPSE
-- For each pair, choose the canonical row, repoint FK references where the
-- delete_rule is NOT CASCADE (brand_agent_log), then DELETE the duplicate.
-- The CASCADE FKs (top_products, aliases, enrichment_state) will follow.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_pair RECORD;
BEGIN
  FOR v_pair IN
    -- (canonical_id, dup_id, alias_to_record)
    SELECT * FROM (VALUES
      -- AG1: keep tier-2 "AG1", drop tier-1 "AG1 (Athletic Greens)"
      ('60c274d2-b391-49b6-b395-c0b8f633e614'::uuid,
       '995aeef1-693e-4e11-89b8-e844b0d638ce'::uuid,
       'AG1 (Athletic Greens)', 'common'),
      ('60c274d2-b391-49b6-b395-c0b8f633e614'::uuid,
       NULL::uuid,
       'Athletic Greens', 'former_name'),
      -- Equate: keep "Equate", drop "Equate (Walmart)"
      ('f991b4ad-102b-4659-a2a0-ce53a8d36136'::uuid,
       'cbd16865-3a85-447b-92d9-20ec5d5a8c5e'::uuid,
       'Equate (Walmart)', 'common'),
      -- Kirkland: keep "Kirkland Signature", drop "Kirkland (Costco)"
      ('3bbbea97-d1c8-4b61-b67e-90a37a016c51'::uuid,
       '15b57f1b-d3ac-4d65-939e-b87f76f22bf6'::uuid,
       'Kirkland (Costco)', 'common'),
      ('3bbbea97-d1c8-4b61-b67e-90a37a016c51'::uuid,
       NULL::uuid,
       'Kirkland', 'abbreviation'),
      -- Kyolic: keep "Kyolic", drop "Kyolic (Wakunaga)"
      ('0ed7038c-57c6-4e24-a9c3-83357f15273d'::uuid,
       '9bf07a29-685a-4de6-a540-650e623eb258'::uuid,
       'Kyolic (Wakunaga)', 'common'),
      ('0ed7038c-57c6-4e24-a9c3-83357f15273d'::uuid,
       NULL::uuid,
       'Wakunaga', 'parent_company'),
      -- Member's Mark: keep canonical, drop "(Sam's Club)"
      ('bc754ae1-b685-49d4-92c4-0b8f9722708c'::uuid,
       '1916ca0c-013a-408c-b8be-8627b1ee0ccf'::uuid,
       'Member''s Mark (Sam''s Club)', 'common'),
      -- Seed: keep tier-2 "Seed" (DTC), drop tier-1 "Seed"
      ('f788c09a-868f-40ac-b347-0dd89be07e16'::uuid,
       '31d7c2e6-b737-48cb-bc0b-4c650cafcba9'::uuid,
       'Seed Health', 'common')
    ) AS p(canonical_id, dup_id, alias_text, alias_type)
  LOOP
    -- Repoint brand_agent_log (no cascade) before deleting the dup row
    IF v_pair.dup_id IS NOT NULL THEN
      UPDATE public.brand_agent_log
        SET brand_id = v_pair.canonical_id
        WHERE brand_id = v_pair.dup_id;
    END IF;

    -- Record the dup name (or alternate spelling) as an alias on the canonical
    INSERT INTO public.supplement_brand_aliases
      (brand_registry_id, alias, normalized_alias, alias_type)
    VALUES (
      v_pair.canonical_id,
      v_pair.alias_text,
      lower(regexp_replace(v_pair.alias_text, '[^a-zA-Z0-9]', '', 'g')),
      v_pair.alias_type
    )
    ON CONFLICT (normalized_alias) DO NOTHING;

    -- Now drop the duplicate (CASCADE will clean up the matching
    -- brand_enrichment_state, top_products, and any aliases attached to it)
    IF v_pair.dup_id IS NOT NULL THEN
      DELETE FROM public.supplement_brand_registry WHERE id = v_pair.dup_id;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. ORPHAN BACKFILL — FarmCeutica is the customer brand; mark as 'enriched'
--    so the cron agent never picks it up for external enrichment.
-- ---------------------------------------------------------------------------
INSERT INTO public.brand_enrichment_state (
  brand_id, brand_name, tier, enrichment_status,
  seed_product_count, enriched_product_count, total_sku_target,
  enrichment_score, enrichment_notes
)
SELECT r.id, r.brand_name, r.tier, 'enriched',
       0, 0, 0, 1.0,
       'House brand — managed manually, agent skips'
FROM public.supplement_brand_registry r
LEFT JOIN public.brand_enrichment_state s ON s.brand_id = r.id
WHERE s.id IS NULL;
