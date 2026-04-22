-- =============================================================================
-- Prompt #111 Phase 1.4: Harden function search_path + seed conservative
-- per-market pricing rows for every existing master_skus row whose msrp ends
-- in .88. Non-.88 SKUs are left unseeded; Gary sets them manually once the
-- .88 alignment decision is made per SKU.
-- =============================================================================

-- Harden search_path on functions created by this prompt (security advisor
-- guidance: function_search_path_mutable).
ALTER FUNCTION public.enforce_mskumkt_msrp_rules()        SET search_path = public, pg_temp;
ALTER FUNCTION public.allocate_vat_invoice_number(TEXT)   SET search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- Seed master_skus_market_pricing: one row per (existing_sku x market).
--   US  -> status=active, availability=TRUE, msrp from master_skus (cents)
--   EU  -> status=draft,  availability=FALSE, placeholder msrp = US msrp
--          (Gary/Domenic set the real EU MSRP later; the placeholder satisfies
--          the NOT NULL + CHECK (> 0) constraints)
--   UK  -> status=draft,  availability=FALSE, placeholder msrp = US msrp
--   AU  -> status=draft,  availability=FALSE, placeholder msrp = US msrp
-- Category-driven tax_code defaults:
--   SNP + Testing (genetic panels / diagnostic services) -> txcd_20030000 (services)
--   Base / Advanced / Children / Women / Mushroom        -> txcd_99999999 (supplements)
-- Category-driven availability reasoning per §3.5.
-- ---------------------------------------------------------------------------
INSERT INTO public.master_skus_market_pricing (
  sku,
  market_code,
  currency_code,
  msrp_cents,
  is_available_in_market,
  tax_code,
  inclusive_of_tax,
  status,
  market_availability_default_reasoning,
  effective_from
)
SELECT
  ms.sku,
  m.market_code,
  m.currency_code,
  (ms.msrp * 100)::BIGINT,
  (m.market_code = 'US'),
  CASE
    WHEN ms.category IN ('SNP','Testing') THEN 'txcd_20030000'
    ELSE 'txcd_99999999'
  END,
  m.inclusive_of_tax,
  CASE WHEN m.market_code = 'US' THEN 'active'::public.pricing_status
       ELSE 'draft'::public.pricing_status END,
  CASE
    WHEN m.market_code = 'US' THEN NULL
    WHEN ms.category = 'SNP' AND m.market_code IN ('EU','UK','AU')
      THEN 'GeneX360 panel blocked for this market pending Prompt #113 regulatory gating (EU IVDR, UK UKCA, AU TGA).'
    WHEN ms.category = 'Testing' AND m.market_code IN ('EU','UK','AU')
      THEN 'Diagnostic/testing service blocked for this market pending Prompt #113 regulatory gating.'
    WHEN ms.category = 'Mushroom' AND m.market_code = 'EU'
      THEN 'Functional mushroom blocked for EU market pending novel-food review (Regulation 2015/2283, Hericium erinaceus).'
    WHEN ms.category = 'Mushroom' AND m.market_code IN ('UK','AU')
      THEN 'Functional mushroom blocked for this market pending Steve Rica regulatory review (standard governance).'
    ELSE 'Non-US availability blocked pending DSHEA-equivalent supplement compliance review per market.'
  END,
  CASE WHEN m.market_code = 'US' THEN NOW() ELSE NULL END
FROM public.master_skus ms
CROSS JOIN public.international_market_config m
WHERE ((ms.msrp * 100)::BIGINT % 100) = 88
ON CONFLICT DO NOTHING;
