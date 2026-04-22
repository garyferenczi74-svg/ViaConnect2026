-- =============================================================================
-- Prompt #110 hotfix: seed product_catalog.image_url for SNP + GeneX360 rows.
-- =============================================================================
-- Gary reported 2026-04-21 that 26 images are blank in /shop's
-- "Methylation / GeneX360" and "Testing & Diagnostics" categories. Root
-- cause: product_catalog.image_url is NULL for all 20 SNP bottles and
-- all 6 GeneX360 service cards — no migration ever populated it.
--
-- /shop reads product_catalog.image_url (src/app/(app)/(consumer)/shop/
-- page.tsx line 242) and falls through to a gradient+SKU placeholder
-- when the column is NULL or empty. Populating the column with the
-- canonical bucket URL puts the rendering path in place; as soon as
-- the matching file lands in Supabase Storage bucket `Products`, the
-- shop renders the image without further DB intervention.
--
-- IDEMPOTENCY: every UPDATE is guarded by `(image_url IS NULL OR TRIM(image_url) = '')`
-- so re-running the migration never overwrites a manually-set URL. If
-- the 2026-04-21 §0 filename verification reveals that DAO+ / NAT+ use
-- a different convention than {code}-support.webp, admins can set those
-- rows by hand first and the migration will skip them.
--
-- FILENAME CONVENTION: {short-gene-code-lowercase}-support.webp at
-- bucket root for SNP bottles; {slug}.webp at root for service cards
-- (no services/ subfolder per Scope Addendum 2026-04-21).
--
-- SCOPE GUARD: every UPDATE also filters on the exact `name` the /shop
-- enrichment path resolves to. Service-card names use the NAME_ALIASES
-- convention from shop/page.tsx (GeneXM, NutragenHQ, etc. — NOT the
-- MASTER_SKUS marketing names).
--
-- AUDIT: affected-row counts are surfaced via RAISE NOTICE so CI logs
-- capture the delta. products_image_audit (migration 20260424000030)
-- is NOT written here because these are seeding writes, not sync
-- runner writes; the audit table is reserved for runner-initiated
-- changes so its history stays attributable to the scripted flow.
-- =============================================================================

DO $$
DECLARE
  v_count INTEGER := 0;
  v_total INTEGER := 0;
  v_base  TEXT    := 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Products/';
BEGIN
  -- -------------------------------------------------------------------------
  -- 20 SNP supplement bottles (Methylation / GeneX360 category)
  -- -------------------------------------------------------------------------

  UPDATE public.product_catalog SET image_url = v_base || 'acat-support.webp'
    WHERE name = 'ACAT+ Mitochondrial Support'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'achy-support.webp'
    WHERE name = 'ACHY+ Acetylcholine Support'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'ado-support.webp'
    WHERE name = 'ADO Support+ Purine Metabolism'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'bhmt-support.webp'
    WHERE name = 'BHMT+ Methylation Support'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'cbs-support.webp'
    WHERE name = 'CBS Support+ Sulfur Pathway'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'comt-support.webp'
    WHERE name = 'COMT+ Neurotransmitter Balance'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'dao-support.webp'
    WHERE name = 'DAO+ Histamine Balance'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'gst-support.webp'
    WHERE name = 'GST+ Cellular Detox'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'maoa-support.webp'
    WHERE name = 'MAOA+ Neurochemical Balance'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'mthfr-support.webp'
    WHERE name = 'MTHFR+ Folate Metabolism'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'mtr-support.webp'
    WHERE name = 'MTR+ Methylation Matrix'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'mtrr-support.webp'
    WHERE name = 'MTRR+ Methylcobalamin Regen'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'nat-support.webp'
    WHERE name = 'NAT Support+ Acetylation'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'nos-support.webp'
    WHERE name = 'NOS+ Vascular Integrity'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'rfc1-support.webp'
    WHERE name = 'RFC1 Support+ Folate Transport'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'shmt-support.webp'
    WHERE name = 'SHMT+ Glycine-Folate Balance'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'sod-support.webp'
    WHERE name = 'SOD+ Antioxidant Defense'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'suox-support.webp'
    WHERE name = 'SUOX+ Sulfite Clearance'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'tcn2-support.webp'
    WHERE name = 'TCN2+ B12 Transport'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'vdr-support.webp'
    WHERE name = 'VDR+ Receptor Activation'
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  RAISE NOTICE 'seed_snp_genex360_image_urls: SNP section updated % rows', v_total;

  -- -------------------------------------------------------------------------
  -- 6 GeneX360 service cards (Testing & Diagnostics category)
  --
  -- Names below are the product_catalog canonical names, NOT the
  -- MASTER_SKUS marketing names. The mapping is kept in sync with the
  -- NAME_ALIASES map at src/app/(app)/(consumer)/shop/page.tsx:298.
  -- -------------------------------------------------------------------------

  UPDATE public.product_catalog SET image_url = v_base || 'genex-m.webp'
    WHERE name IN ('GeneXM', 'GeneX-M', 'GeneX-M™ Methylation Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'nutrigendx.webp'
    WHERE name IN ('NutragenHQ', 'NutrigenDX', 'NutrigenDX™ Genetic Nutrition Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'hormoneiq.webp'
    WHERE name IN ('HormoneIQ', 'HormoneIQ™ Genetic Hormone Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'epigenhq.webp'
    WHERE name IN ('EpiGenDX', 'EpigenHQ', 'EpigenHQ™ Epigenetic Aging Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'peptideiq.webp'
    WHERE name IN ('PeptidesIQ', 'PeptideIQ', 'PeptideIQ™ Genetic Peptide Response Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'cannabisiq.webp'
    WHERE name IN ('CannabisIQ', 'CannabisIQ™ Genetic Cannabinoid Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  RAISE NOTICE 'seed_snp_genex360_image_urls: total rows updated (SNP + services) = %', v_total;
END $$;

-- Post-migration sanity check: every in-scope row should now have image_url set.
-- A deploy pipeline can grep for this NOTICE to confirm coverage, or the
-- admin /admin/catalog-health dashboard displays the still-missing set.
