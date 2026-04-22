-- =============================================================================
-- Prompt #110 hotfix #3: use the REAL uploaded bucket filenames.
-- =============================================================================
-- Gary pasted the 25 live bucket URLs on 2026-04-21 evening. They
-- contradict every assumption in the two prior seed migrations
-- (20260424000040 / 20260424000050) on three counts:
--
--   1. Mixed buckets: 18 SNP bottles live in `supplement-photos`; 7
--      service/testing cards live in `Products` (capital P). Both
--      buckets are in use. No single PHOTO_BUCKET constant captures
--      the truth.
--   2. Filenames are PNGs with spaces + '+' signs + mixed case, e.g.
--      `ACAT Support+.png`, not the canonical `acat-support.webp` the
--      manifest assumed. Whitespace typos exist (double space in SUOX,
--      trailing spaces on MTR / MTRR / COMT) and are preserved so the
--      URL matches the actual object key.
--   3. DAO, NAT, and PeptideIQ are NOT in the upload list. DAO/NAT
--      pre-existed; PeptideIQ is missing and will need its own upload.
--
-- Behavior: force-overwrite. Gary's upload list is the source of truth,
-- so any prior image_url (including the wrong /Products/ URL from
-- migration 20260424000040) is replaced unconditionally. NULL → set,
-- wrong bucket → replaced, already-correct → no-op (idempotent).
-- =============================================================================

DO $$
DECLARE
  v_count INTEGER := 0;
  v_total INTEGER := 0;
  v_snp   TEXT := 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/supplement-photos/';
  v_svc   TEXT := 'https://nnhkcufyqjojdbvdrpky.supabase.co/storage/v1/object/public/Products/';
BEGIN
  -- -------------------------------------------------------------------------
  -- 18 SNP supplement bottles — supplement-photos bucket, PNG, mixed case.
  -- Filename typos (double/trailing spaces) are preserved as-is.
  -- -------------------------------------------------------------------------

  UPDATE public.product_catalog SET image_url = v_snp || 'ACAT%20Support+.png'
    WHERE name = 'ACAT+ Mitochondrial Support';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'ACHY%20Support+.png'
    WHERE name = 'ACHY+ Acetylcholine Support';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'ADO%20Support+.png'
    WHERE name = 'ADO Support+ Purine Metabolism';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'BHMT%20Support+.png'
    WHERE name = 'BHMT+ Methylation Support';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'CBS%20Support+.png'
    WHERE name = 'CBS Support+ Sulfur Pathway';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- COMT filename has spaces around the + sign: "COMT Support + .png"
  UPDATE public.product_catalog SET image_url = v_snp || 'COMT%20Support%20+%20.png'
    WHERE name = 'COMT+ Neurotransmitter Balance';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'GST%20Support+.png'
    WHERE name = 'GST+ Cellular Detox';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'MAOA%20Support+.png'
    WHERE name = 'MAOA+ Neurochemical Balance';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'MTHFR%20Support+.png'
    WHERE name = 'MTHFR+ Folate Metabolism';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- MTR filename has a trailing space before the extension: "MTR Support+ .png"
  UPDATE public.product_catalog SET image_url = v_snp || 'MTR%20Support+%20.png'
    WHERE name = 'MTR+ Methylation Matrix';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- MTRR filename has a trailing space before the extension: "MTRR Support+ .png"
  UPDATE public.product_catalog SET image_url = v_snp || 'MTRR%20Support+%20.png'
    WHERE name = 'MTRR+ Methylcobalamin Regen';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'NOS%20Support+.png'
    WHERE name = 'NOS+ Vascular Integrity';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'RFC1%20Support+.png'
    WHERE name = 'RFC1 Support+ Folate Transport';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'SHMT%20Support+.png'
    WHERE name = 'SHMT+ Glycine-Folate Balance';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'SOD%20Support+.png'
    WHERE name = 'SOD+ Antioxidant Defense';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- SUOX filename has a DOUBLE space: "SUOX  Support+.png"
  UPDATE public.product_catalog SET image_url = v_snp || 'SUOX%20%20Support+.png'
    WHERE name = 'SUOX+ Sulfite Clearance';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'TCN2%20Support+.png'
    WHERE name = 'TCN2+ B12 Transport';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_snp || 'VDR%20Support+.png'
    WHERE name = 'VDR+ Receptor Activation';
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  RAISE NOTICE 'image_urls_real: SNP (18) updated % rows', v_total;

  -- -------------------------------------------------------------------------
  -- 6 Testing & Diagnostics service cards — Products bucket.
  -- WHERE covers every product_catalog.name variant the shop aliases to.
  -- PeptideIQ is intentionally omitted; Gary has not uploaded it yet.
  -- -------------------------------------------------------------------------

  UPDATE public.product_catalog SET image_url = v_svc || 'GenexM%20Genetic%20Methylation.png'
    WHERE name IN ('GeneXM', 'GeneX-M', 'GeneX-M™ Methylation Panel', 'GeneX-M Methylation Panel', 'GenexM');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_svc || 'NutrigenDX%20Genetic%20Nutrition.png'
    WHERE name IN ('NutragenHQ', 'NutrigenDX', 'NutrigenDX™ Genetic Nutrition Panel', 'NutrigenDX Genetic Nutrition Panel');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_svc || 'HormoneIQ%20Genetic%20Hormone.png'
    WHERE name IN ('HormoneIQ', 'HormoneIQ™ Genetic Hormone Panel', 'HormoneIQ Genetic Hormone Panel');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_svc || 'EpiGenDX%20Biological%20Age.png'
    WHERE name IN ('EpiGenDX', 'EpigenHQ', 'EpigenHQ™ Epigenetic Aging Panel', 'EpigenHQ Epigenetic Aging Panel');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_svc || 'CannabisIQ.png'
    WHERE name IN ('CannabisIQ', 'CannabisIQ™ Genetic Cannabinoid Panel', 'CannabisIQ Genetic Cannabinoid Panel');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  -- -------------------------------------------------------------------------
  -- Bonus rows that Gary uploaded images for but aren't in the 26 scope.
  -- Safe to UPDATE: only fires if a product_catalog row exists. No-op
  -- otherwise.
  -- -------------------------------------------------------------------------

  UPDATE public.product_catalog SET image_url = v_svc || 'GeneX360.png'
    WHERE name IN ('GeneX360', 'GeneX360™ Complete Genetic Panel', 'GeneX360 Complete Genetic Panel');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  UPDATE public.product_catalog SET image_url = v_svc || '30%20Day%20Custom%20Vitamin%20Package.png'
    WHERE name IN ('30-Day Custom Vitamin Package', '30 Day Custom Vitamin Package');
  GET DIAGNOSTICS v_count = ROW_COUNT; v_total := v_total + v_count;

  RAISE NOTICE 'image_urls_real: total rows updated (SNP + services + bonus) = %', v_total;

  -- -------------------------------------------------------------------------
  -- Coverage check against the 23 in-scope names that have live files.
  -- (18 SNPs + 5 services uploaded; DAO / NAT / PeptideIQ tracked
  -- separately below.)
  -- -------------------------------------------------------------------------

  SELECT COUNT(*) INTO v_count
    FROM public.product_catalog
    WHERE image_url LIKE '%/storage/v1/object/public/%'
      AND image_url LIKE '%.png'
      AND name IN (
        -- 18 SNPs with uploaded files
        'ACAT+ Mitochondrial Support','ACHY+ Acetylcholine Support',
        'ADO Support+ Purine Metabolism','BHMT+ Methylation Support',
        'CBS Support+ Sulfur Pathway','COMT+ Neurotransmitter Balance',
        'GST+ Cellular Detox','MAOA+ Neurochemical Balance',
        'MTHFR+ Folate Metabolism','MTR+ Methylation Matrix',
        'MTRR+ Methylcobalamin Regen','NOS+ Vascular Integrity',
        'RFC1 Support+ Folate Transport','SHMT+ Glycine-Folate Balance',
        'SOD+ Antioxidant Defense','SUOX+ Sulfite Clearance',
        'TCN2+ B12 Transport','VDR+ Receptor Activation',
        -- 5 services with uploaded files
        'GeneXM', 'GeneX-M', 'GenexM',
        'NutragenHQ', 'NutrigenDX',
        'HormoneIQ',
        'EpiGenDX', 'EpigenHQ',
        'CannabisIQ'
      );
  RAISE NOTICE 'image_urls_real: rows now pointing at a real .png = % (of 23 uploaded targets)', v_count;

  -- -------------------------------------------------------------------------
  -- Missing-upload notices so deploy logs surface what Gary still owes.
  -- -------------------------------------------------------------------------

  SELECT COUNT(*) INTO v_count FROM public.product_catalog
    WHERE name IN ('PeptidesIQ', 'PeptideIQ', 'PeptideIQ™ Genetic Peptide Response Panel')
      AND image_url IS NOT NULL AND image_url <> '';
  IF v_count = 0 THEN
    RAISE NOTICE 'image_urls_real: PeptideIQ has no uploaded file and no image_url. Upload peptideiq image to Products/ then run a one-off UPDATE or re-run a follow-up migration.';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.product_catalog
    WHERE name IN ('DAO+ Histamine Balance', 'NAT Support+ Acetylation')
      AND image_url IS NOT NULL AND image_url <> '';
  RAISE NOTICE 'image_urls_real: DAO+ and NAT+ image_url coverage = %/2 (not touched by this migration; verify manually)', v_count;
END $$;
