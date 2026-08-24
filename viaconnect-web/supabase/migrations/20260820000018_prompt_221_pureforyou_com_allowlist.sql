-- Prompt 221 Phase 2: add Pure Encapsulations DTC storefront (Gary-approved).
-- Append-only. Source: https://pureforyou.com/collections/all
-- pureencapsulations.com already allowlisted; this is the live Shopify catalog.

INSERT INTO public.competitive_sources (
  domain, label, source_kind, category_tags, base_url,
  approval_status, proposed_by, approved_by, notes
) VALUES
  ('pureforyou.com', 'Pure Encapsulations (Pure for You)', 'brand',
    ARRAY['base-formulations','methylation-snp','advanced-formulas'],
    'https://pureforyou.com', 'approved', 'hounddog', 'gary',
    'Shopify DTC catalog; vendor Pure Encapsulations; https://pureforyou.com/collections/all')
ON CONFLICT (domain) DO UPDATE SET
  approval_status = 'approved',
  is_active = true,
  approved_by = 'gary',
  label = EXCLUDED.label,
  category_tags = EXCLUDED.category_tags,
  base_url = EXCLUDED.base_url,
  notes = EXCLUDED.notes,
  updated_at = now();
