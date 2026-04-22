-- =============================================================================
-- Prompt #110 hotfix #2: correct image_url bucket to supplement-photos.
-- =============================================================================
-- Migration 20260424000040 (just deployed) seeded 26 image_url values
-- pointing at the `Products` bucket. Gary confirmed 2026-04-21 evening
-- that files were uploaded to `supplement-photos` instead, making every
-- URL from the prior migration a 404.
--
-- This migration overrides the URLs for those 26 rows to the correct
-- /supplement-photos/ path. Unlike 20260424000040, it FORCE-OVERWRITES
-- (no IS NULL guard) because the prior migration populated those rows
-- with wrong URLs that would otherwise win.
--
-- The guard is narrowed to "overwrite only when the URL points at the
-- wrong bucket OR is null/empty", so a manually-corrected URL (or a URL
-- pointing at an external CDN) is preserved.
--
-- Filename convention stays the same: {code-lowercase}-support.webp for
-- SNP bottles, {slug}.webp for service cards — both at bucket root.
--
-- Bucket correction rollup:
--   #109 original:  supplement-photos  (correct, per actual bucket state)
--   #110 §1:        Products           (wrong guess, corrected here)
--   this migration: supplement-photos  (confirmed via Gary's upload URL)
-- =============================================================================

DO $$
DECLARE
  v_count INTEGER := 0;
  v_total INTEGER := 0;
  v_base  TEXT    := 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/';
  v_wrong TEXT    := 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Products/';
  v_null_guard TEXT := '(image_url IS NULL OR TRIM(image_url) = '''' OR image_url LIKE ''%' || 'Products/' || '%'')';
BEGIN
  -- Helper semantics: every UPDATE below overwrites when image_url is
  -- NULL/empty OR when it currently points at /Products/ (the wrong
  -- bucket written by the prior migration). External/CDN URLs are
  -- preserved.

  -- -------------------------------------------------------------------------
  -- 20 SNP supplement bottles
  -- -------------------------------------------------------------------------

  UPDATE public.product_catalog SET image_url = v_base || 'acat-support.webp'
    WHERE name = 'ACAT+ Mitochondrial Support'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'achy-support.webp'
    WHERE name = 'ACHY+ Acetylcholine Support'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'ado-support.webp'
    WHERE name = 'ADO Support+ Purine Metabolism'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'bhmt-support.webp'
    WHERE name = 'BHMT+ Methylation Support'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'cbs-support.webp'
    WHERE name = 'CBS Support+ Sulfur Pathway'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'comt-support.webp'
    WHERE name = 'COMT+ Neurotransmitter Balance'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'dao-support.webp'
    WHERE name = 'DAO+ Histamine Balance'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'gst-support.webp'
    WHERE name = 'GST+ Cellular Detox'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'maoa-support.webp'
    WHERE name = 'MAOA+ Neurochemical Balance'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'mthfr-support.webp'
    WHERE name = 'MTHFR+ Folate Metabolism'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'mtr-support.webp'
    WHERE name = 'MTR+ Methylation Matrix'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'mtrr-support.webp'
    WHERE name = 'MTRR+ Methylcobalamin Regen'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'nat-support.webp'
    WHERE name = 'NAT Support+ Acetylation'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'nos-support.webp'
    WHERE name = 'NOS+ Vascular Integrity'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'rfc1-support.webp'
    WHERE name = 'RFC1 Support+ Folate Transport'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'shmt-support.webp'
    WHERE name = 'SHMT+ Glycine-Folate Balance'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'sod-support.webp'
    WHERE name = 'SOD+ Antioxidant Defense'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'suox-support.webp'
    WHERE name = 'SUOX+ Sulfite Clearance'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'tcn2-support.webp'
    WHERE name = 'TCN2+ B12 Transport'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'vdr-support.webp'
    WHERE name = 'VDR+ Receptor Activation'
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  RAISE NOTICE 'fix_snp_genex360_image_urls: SNP section updated % rows', v_total;

  -- -------------------------------------------------------------------------
  -- 6 GeneX360 service cards — WHERE covers every name variant so the
  -- UPDATE lands whether product_catalog.name uses the canonical alias
  -- (GeneXM / NutragenHQ / etc.), the slug form (genex-m), or the full
  -- MASTER_SKUS marketing string. See shop/page.tsx line 298 NAME_ALIASES.
  -- -------------------------------------------------------------------------

  UPDATE public.product_catalog SET image_url = v_base || 'genex-m.webp'
    WHERE name IN ('GeneXM', 'GeneX-M', 'GeneX-M™ Methylation Panel', 'GeneX-M Methylation Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'nutrigendx.webp'
    WHERE name IN ('NutragenHQ', 'NutrigenDX', 'NutrigenDX™ Genetic Nutrition Panel', 'NutrigenDX Genetic Nutrition Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'hormoneiq.webp'
    WHERE name IN ('HormoneIQ', 'HormoneIQ™ Genetic Hormone Panel', 'HormoneIQ Genetic Hormone Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'epigenhq.webp'
    WHERE name IN ('EpiGenDX', 'EpigenHQ', 'EpigenHQ™ Epigenetic Aging Panel', 'EpigenHQ Epigenetic Aging Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'peptideiq.webp'
    WHERE name IN ('PeptidesIQ', 'PeptideIQ', 'PeptideIQ™ Genetic Peptide Response Panel', 'PeptideIQ Genetic Peptide Response Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_base || 'cannabisiq.webp'
    WHERE name IN ('CannabisIQ', 'CannabisIQ™ Genetic Cannabinoid Panel', 'CannabisIQ Genetic Cannabinoid Panel')
      AND (image_url IS NULL OR TRIM(image_url) = '' OR image_url LIKE v_wrong || '%');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  RAISE NOTICE 'fix_snp_genex360_image_urls: total rows updated (SNP + services) = %', v_total;

  -- Post-migration coverage report — count rows whose image_url now
  -- correctly points at supplement-photos (one per target).
  SELECT COUNT(*) INTO v_count
    FROM public.product_catalog
    WHERE image_url LIKE v_base || '%'
      AND name IN (
        'ACAT+ Mitochondrial Support','ACHY+ Acetylcholine Support',
        'ADO Support+ Purine Metabolism','BHMT+ Methylation Support',
        'CBS Support+ Sulfur Pathway','COMT+ Neurotransmitter Balance',
        'DAO+ Histamine Balance','GST+ Cellular Detox',
        'MAOA+ Neurochemical Balance','MTHFR+ Folate Metabolism',
        'MTR+ Methylation Matrix','MTRR+ Methylcobalamin Regen',
        'NAT Support+ Acetylation','NOS+ Vascular Integrity',
        'RFC1 Support+ Folate Transport','SHMT+ Glycine-Folate Balance',
        'SOD+ Antioxidant Defense','SUOX+ Sulfite Clearance',
        'TCN2+ B12 Transport','VDR+ Receptor Activation',
        'GeneXM','NutragenHQ','HormoneIQ','EpiGenDX','PeptidesIQ','CannabisIQ'
      );
  RAISE NOTICE 'fix_snp_genex360_image_urls: coverage count = %/26 (rows with correct /supplement-photos/ URL)', v_count;
  IF v_count < 26 THEN
    RAISE NOTICE 'fix_snp_genex360_image_urls: WARNING - % targets are still missing or under a different product_catalog.name. Run scripts/audit/snp-bucket-reality-check.ts to identify.', (26 - v_count);
  END IF;
END $$;
