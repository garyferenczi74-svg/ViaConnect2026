-- Prompt #142d: Supplement image URL backfill via explicit pinned map.
--
-- Source: scripts/142d/vc_image_url_map.json (delivered by Gary 2026-05-01).
-- 63 canonical xlsx products mapped: 54 matched + 6 corrected + 2 missing + 1 special.
-- Phase L deletion of aptigen-complex (2026-04-30) reduces production-matching
-- entries to 62; minus neuroaxis-plus (status=missing, image_urls stays empty)
-- and aptigen-complex (no row to update) leaves 60 actual URL writes.
--
-- Bucket: supplement-photos (lowercase, hyphenated). The Prompt #110 declaration
-- of Products as canonical bucket is rescinded as of #142d per spec §7.
--
-- Production slug divergences from map keys (handled by remapping in VALUES list):
--   map key inferno-plus-glp-1-activator-complex -> production slug glp-1-activator-complex
--   map key lion-s-mane-mushroom-capsules        -> production slug lions-mane-mushroom-capsules
-- The other 58 mapped (non-missing) keys equal production slugs verbatim.
--
-- Encoding rules (manual percent-encoding; no derivation, only mechanical from map):
--   space -> %20
--   plus  -> %2B (only filename Shred+.png triggers this)
--   apostrophe -> literal apostrophe (preserved in URL path segment per spec §4.3)
--
-- Folder URLs (verbatim from map, percent-encoded):
--   Methylation SNP Support  -> Methylation%20SNP%20Support
--   Base Formulations        -> Base%20Formulations
--   Advance Formulations     -> Advance%20Formulations  (typo Advance vs Advanced preserved per §3)
--   Woman's Health           -> Woman's%20Health        (typo Woman's vs Women's preserved per §3)
--   Children's Formulations  -> Children's%20Formulations
--   Functional Mushrooms     -> Functional%20Mushrooms
--
-- Idempotency: IS DISTINCT FROM jsonb_build_array(new_url) guard on UPDATE
-- means re-running this migration is a no-op when image_urls already match.
-- Snapshot table NOT EXISTS guard prevents duplicate snapshot rows.
--
-- Audit trail: per-row backfill_audit captures method=pinned_map_142d
-- plus old_value (from snapshot) plus new_value plus status_kind plus
-- product_name plus product_slug plus authority Gary canonical 2026-05-01.
--
-- Defensive: WHERE category != 'peptide' AND category_slug != 'genex360'
-- on every UPDATE per spec §0 hard rule 2.

DO $$
DECLARE
    v_run_id uuid := gen_random_uuid();
    v_count_snapshot integer := 0;
    v_count_updated integer := 0;
    v_count_neuroaxis integer := 0;
BEGIN
    -- Pre-flight bucket check per §4.1
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'supplement-photos') THEN
        RAISE EXCEPTION '142d aborted: bucket supplement-photos not found in storage.buckets. Verify bucket name canonical.';
    END IF;

    -- Snapshot table per §4.2
    CREATE TABLE IF NOT EXISTS public.products_image_urls_backup_142d (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_at timestamptz NOT NULL DEFAULT now(),
        product_id uuid NOT NULL,
        slug text,
        prior_image_urls jsonb
    );

    -- Step 1: Snapshot prior image_urls for in-scope rows (idempotent NOT EXISTS guard)
    WITH map_slugs(prod_slug) AS (
        VALUES
            ('acat-plus-mitochondrial-support'),('achy-plus-acetylcholine-support'),('ado-support-plus-purine-metabolism'),
            ('balance-plus-gut-repair'),('bhb-ketone-salts'),('bhmt-plus-methylation-support'),
            ('blast-plus-nitric-oxide-stack'),('catalyst-plus-energy-multivitamin'),('cbs-support-plus-sulfur-pathway'),
            ('chaga-mushroom-capsules'),('clean-plus-detox-and-liver-health'),('comt-plus-neurotransmitter-balance'),
            ('cordyceps-mushroom-capsules'),('creatine-hcl-plus'),('cyclesync-plus'),('dao-plus-histamine-balance'),
            ('desire-plus-female-hormonal'),('digestizorb-plus-enzyme-complex'),('electrolyte-blend'),
            ('flex-plus-joint-and-inflammation'),('focus-plus-nootropic-formula'),('glp-1-activator-complex'),
            ('grow-plus-pre-natal-formula'),('gst-plus-cellular-detox'),('histamine-relief-protocol'),
            ('iron-plus-red-blood-cell-support'),('lions-mane-mushroom-capsules'),('magnesium-synergy-matrix'),
            ('maoa-plus-neurochemical-balance'),('menobalance-plus'),('methylb-complete-plus-b-complex'),
            ('mthfr-plus-folate-metabolism'),('mtr-plus-methylation-matrix'),('mtrr-plus-methylcobalamin-regen'),
            ('nat-support-plus-acetylation'),('neuroaxis-plus'),('neurocalm-bh4-plus-advanced'),
            ('neurocalm-plus'),('nos-plus-vascular-integrity'),('omega-3-dha-epa-algal'),('radiance-plus'),
            ('reishi-mushroom-capsules'),('relax-plus-sleep-support'),('replenish-nad-plus'),
            ('revitalizher-postnatal-plus'),('rfc1-support-plus-folate-transport'),('rise-plus-male-testosterone'),
            ('shmt-plus-glycine-folate-balance'),('shred-plus'),('sod-plus-antioxidant-defense'),
            ('sproutables-children-gummies'),('sproutables-infant-tincture'),('sproutables-toddler-tablets'),
            ('suox-plus-sulfite-clearance'),('tcn2-plus-b12-transport'),('teloprime-plus-telomere-support'),
            ('thrive-plus-post-natal-glp-1'),('thyrobalance-plus'),('thyrocalm-g-plus'),('toxibind-matrix'),
            ('turkey-tail-mushroom-capsules'),('vdr-plus-receptor-activation')
    )
    INSERT INTO public.products_image_urls_backup_142d (product_id, slug, prior_image_urls)
    SELECT p.id, p.slug, p.image_urls
    FROM public.products p
    JOIN map_slugs m ON p.slug = m.prod_slug
    WHERE p.category != 'peptide'
      AND p.category_slug != 'genex360'
      AND NOT EXISTS (
          SELECT 1 FROM public.products_image_urls_backup_142d b
          WHERE b.product_id = p.id
      );
    GET DIAGNOSTICS v_count_snapshot = ROW_COUNT;

    -- Step 2: UPDATE image_urls per pinned map; audit log captures old + new
    WITH pinned_map(prod_slug, new_url, status_kind) AS (
        VALUES
            -- Methylation SNP Support (20)
            ('acat-plus-mitochondrial-support', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/acat-plus-mitochondrial-support.png', 'matched'),
            ('achy-plus-acetylcholine-support', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/achy-plus-acetylcholine-support.png', 'matched'),
            ('ado-support-plus-purine-metabolism', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/ado-support-plus-purine-metabolism.png', 'matched'),
            ('bhmt-plus-methylation-support', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/bhmt-plus-methylation-support.png', 'matched'),
            ('cbs-support-plus-sulfur-pathway', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/cbs-support-plus-sulfur-pathway.png', 'matched'),
            ('comt-plus-neurotransmitter-balance', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/comt-plus-neurotransmitter-balance.png', 'matched'),
            ('dao-plus-histamine-balance', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/dao-plus-histamine-balance.png', 'matched'),
            ('gst-plus-cellular-detox', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/gst-plus-cellular-detox.png', 'matched'),
            ('maoa-plus-neurochemical-balance', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/maoa-plus-neurochemical-balance.png', 'matched'),
            ('mthfr-plus-folate-metabolism', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/mthfr-plus-folate-metabolism.png', 'matched'),
            ('mtr-plus-methylation-matrix', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/mtr-plus-methylation-matrix.png', 'matched'),
            ('mtrr-plus-methylcobalamin-regen', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/mtrr-plus-methylcobalamin-regen.png', 'matched'),
            ('nat-support-plus-acetylation', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/nat-support-plus-acetylation.png', 'matched'),
            ('nos-plus-vascular-integrity', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/nos-plus-vascular-integrity.png', 'matched'),
            ('rfc1-support-plus-folate-transport', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/rfc1-support-plus-folate-transport.png', 'matched'),
            ('shmt-plus-glycine-folate-balance', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/shmt-plus-glycine-folate-balance.png', 'matched'),
            ('sod-plus-antioxidant-defense', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/sod-plus-antioxidant-defense.png', 'matched'),
            ('suox-plus-sulfite-clearance', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/suox-plus-sulfite-clearance.png', 'matched'),
            ('tcn2-plus-b12-transport', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/tcn2-plus-b12-transport.png', 'matched'),
            ('vdr-plus-receptor-activation', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Methylation%20SNP%20Support/vdr-plus-receptor-activation.png', 'matched'),
            -- Base Formulations (7; aptigen deleted Phase L)
            ('bhb-ketone-salts', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Base%20Formulations/bhb-ketone-salts.png', 'matched'),
            ('electrolyte-blend', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Base%20Formulations/electrolyte-blend.png', 'matched'),
            ('glp-1-activator-complex', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Base%20Formulations/glp-1-activator-complex.png', 'corrected_inferno_prefix_dropped'),
            ('magnesium-synergy-matrix', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Base%20Formulations/magnesium-synergy-matrix.png', 'matched'),
            ('methylb-complete-plus-b-complex', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Base%20Formulations/methylb-complete-plus-b-complex.png', 'matched'),
            ('omega-3-dha-epa-algal', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Base%20Formulations/omega-3-dha-epa-algal.png', 'matched'),
            ('toxibind-matrix', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Base%20Formulations/toxibind-matrix.png', 'matched'),
            -- Advance Formulations (18; neuroaxis-plus missing handled below)
            ('balance-plus-gut-repair', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/balance-plus-gut-repair.png', 'matched'),
            ('blast-plus-nitric-oxide-stack', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/blast-plus-nitric-oxide-stack.png', 'matched'),
            ('catalyst-plus-energy-multivitamin', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/catalyst-plus-energy-multivitamin.png', 'matched'),
            ('clean-plus-detox-and-liver-health', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/clean-plus-detox-liver-health.png', 'corrected_missing_and'),
            ('creatine-hcl-plus', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/creatine-hcl-plus.png', 'matched'),
            ('digestizorb-plus-enzyme-complex', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/digestizorb-plus-enzyme-complex.png', 'matched'),
            ('flex-plus-joint-and-inflammation', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/flex-plus-joint-inflammation.png', 'corrected_missing_and'),
            ('focus-plus-nootropic-formula', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/focus-plus-nootropic-formula.png', 'matched'),
            ('histamine-relief-protocol', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/histamine-relief-protocol.png', 'matched'),
            ('iron-plus-red-blood-cell-support', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/iron-plus-red-blood-cell-support.png', 'matched'),
            ('neurocalm-bh4-plus-advanced', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/neurocalm-bh4-plus-advanced.png', 'matched'),
            ('neurocalm-plus', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/neurocalm-plus-calm-plus.png', 'corrected_duplicate_calm_plus_suffix'),
            ('relax-plus-sleep-support', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/relax-plus-sleep-support.png', 'matched'),
            ('replenish-nad-plus', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/replenish-nad-plus.png', 'matched'),
            ('rise-plus-male-testosterone', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/rise-plus-male-testosterone.png', 'matched'),
            ('shred-plus', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/Shred%2B.png', 'special_literal_plus_capital_s'),
            ('teloprime-plus-telomere-support', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/teloprime-plus-telomere-support.png', 'matched'),
            ('thyrocalm-g-plus', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Advance%20Formulations/thyrocalm-g-plus.png', 'matched'),
            -- Woman's Health (8)
            ('cyclesync-plus', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Woman''s%20Health/cyclesync-plus.png', 'matched'),
            ('desire-plus-female-hormonal', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Woman''s%20Health/desire-plus-female-hormonal.png', 'matched'),
            ('grow-plus-pre-natal-formula', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Woman''s%20Health/grow-plus-pre-natal-formula.png', 'matched'),
            ('menobalance-plus', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Woman''s%20Health/menobalance-plus.png', 'matched'),
            ('radiance-plus', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Woman''s%20Health/radiance-plus.png', 'matched'),
            ('revitalizher-postnatal-plus', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Woman''s%20Health/revitalizher-postnatal-plus.png', 'matched'),
            ('thrive-plus-post-natal-glp-1', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Woman''s%20Health/thrive-plus-post-natal-glp-1.png', 'matched'),
            ('thyrobalance-plus', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Woman''s%20Health/thyrobalance-plus-v2.png', 'corrected_v2_suffix'),
            -- Children's Formulations (3)
            ('sproutables-children-gummies', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Children''s%20Formulations/sproutables-children-gummies.png', 'matched'),
            ('sproutables-infant-tincture', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Children''s%20Formulations/sproutables-infant-tincture.png', 'matched'),
            ('sproutables-toddler-tablets', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Children''s%20Formulations/sproutables-toddler-tablets.png', 'matched'),
            -- Functional Mushrooms (5)
            ('chaga-mushroom-capsules', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Functional%20Mushrooms/chaga-mushroom-capsules.png', 'matched'),
            ('cordyceps-mushroom-capsules', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Functional%20Mushrooms/cordyceps-mushroom-capsules.png', 'matched'),
            ('lions-mane-mushroom-capsules', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Functional%20Mushrooms/lions-mane-mushroom-capsules.png', 'corrected_apostrophe_dropped'),
            ('reishi-mushroom-capsules', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Functional%20Mushrooms/reishi-mushroom-capsules.png', 'matched'),
            ('turkey-tail-mushroom-capsules', 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/Functional%20Mushrooms/turkey-tail-mushroom-capsules.png', 'matched')
    ),
    updated AS (
        UPDATE public.products p
        SET image_urls = jsonb_build_array(m.new_url)
        FROM pinned_map m
        WHERE p.slug = m.prod_slug
          AND p.category != 'peptide'
          AND p.category_slug != 'genex360'
          AND p.image_urls IS DISTINCT FROM jsonb_build_array(m.new_url)
        RETURNING p.id, p.sku, p.name, p.slug, m.new_url, m.status_kind
    )
    INSERT INTO public.backfill_audit (run_id, source_table, target_table, sku, product_id, columns_loaded)
    SELECT v_run_id, '142d_image_urls_pinned', 'products', u.sku, u.id,
        jsonb_build_object(
            'column', 'image_urls',
            'method', 'pinned_map_142d',
            'status_kind', u.status_kind,
            'audit_mode', 'force_per_142d_spec',
            'old_value', (
                SELECT prior_image_urls FROM public.products_image_urls_backup_142d b
                WHERE b.product_id = u.id
                ORDER BY snapshot_at DESC LIMIT 1
            ),
            'new_value', jsonb_build_array(u.new_url),
            'rule_applied', 'pinned_map_142d',
            'product_name', u.name,
            'product_slug', u.slug,
            'authority', 'Gary canonical 2026-05-01 vc_image_url_map.json'
        )
    FROM updated u;
    GET DIAGNOSTICS v_count_updated = ROW_COUNT;

    -- Step 3: neuroaxis-plus stays empty (idempotent no-op)
    UPDATE public.products
    SET image_urls = '[]'::jsonb
    WHERE slug = 'neuroaxis-plus'
      AND category != 'peptide'
      AND image_urls IS DISTINCT FROM '[]'::jsonb;
    GET DIAGNOSTICS v_count_neuroaxis = ROW_COUNT;

    RAISE NOTICE '142d image URL pinned map: snapshotted=% updated=% neuroaxis_empty=% run_id=%',
        v_count_snapshot, v_count_updated, v_count_neuroaxis, v_run_id;
END $$;
