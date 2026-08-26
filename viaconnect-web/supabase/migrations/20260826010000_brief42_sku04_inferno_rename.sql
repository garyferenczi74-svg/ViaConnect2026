-- Brief 42: rename master SKU 04 display name off GLP-1 adjacency.
-- Gary 26 Aug 2026 lock: live name is Inferno. SKU id and MSRP unchanged.
-- Append-only. Does not edit prior migrations. Does not fill SKUs 63-66.
-- Does not rewrite Inferno+ formulation (products.sku FC-INFERNO-001).

DO $$
DECLARE
  v_msrp numeric;
  v_sku text;
BEGIN
  SELECT sku, msrp INTO v_sku, v_msrp
  FROM public.master_skus
  WHERE sku = '04';

  IF v_sku IS NULL THEN
    RAISE NOTICE 'Brief 42: master_skus sku 04 not found; name update skipped';
    RETURN;
  END IF;

  IF v_msrp IS DISTINCT FROM 88.88 THEN
    RAISE EXCEPTION 'Brief 42 refuses to rename sku 04 because msrp is % (expected 88.88)', v_msrp;
  END IF;

  UPDATE public.master_skus
  SET name = 'Inferno',
      updated_at = now()
  WHERE sku = '04'
    AND msrp = 88.88;

  IF to_regclass('public.product_catalog') IS NOT NULL THEN
    UPDATE public.product_catalog
    SET name = 'Inferno',
        updated_at = now()
    WHERE master_sku = '04';
  END IF;

  IF to_regclass('public.protocol_rules') IS NOT NULL THEN
    UPDATE public.protocol_rules
    SET product_name = 'Inferno',
        rationale_template = replace(
          rationale_template,
          'GLP-1 Activator Complex',
          'Inferno'
        )
    WHERE product_name = 'GLP-1 Activator Complex';
  END IF;

  IF to_regclass('public.ultrathink_clinical_rules') IS NOT NULL THEN
    UPDATE public.ultrathink_clinical_rules
    SET product_name = 'Inferno',
        rationale_template = replace(
          rationale_template,
          'GLP-1 Activator Complex',
          'Inferno'
        ),
        updated_at = now()
    WHERE product_name = 'GLP-1 Activator Complex';
  END IF;

  IF to_regclass('public.supplement_search_index') IS NOT NULL THEN
    UPDATE public.supplement_search_index
    SET product_name = 'Inferno',
        normalized_product_name = 'inferno',
        updated_at = now()
    WHERE product_name = 'GLP-1 Activator Complex';
  END IF;
END
$$;
