-- Prompt 221 Phase 2: add Cymbiotika Canada storefront (Gary-provided guide URL).
-- Append-only. Source: https://cymbiotika.ca/pages/supplement-guide

INSERT INTO public.competitive_sources (
  domain, label, source_kind, category_tags, base_url,
  approval_status, proposed_by, approved_by, notes
) VALUES
  ('cymbiotika.ca', 'Cymbiotika Canada', 'brand',
    ARRAY['advanced-formulas','liposomal','base-formulations'],
    'https://cymbiotika.ca', 'approved', 'hounddog', 'gary',
    'Canadian storefront; supplement guide https://cymbiotika.ca/pages/supplement-guide')
ON CONFLICT (domain) DO UPDATE SET
  approval_status = 'approved',
  is_active = true,
  approved_by = 'gary',
  label = EXCLUDED.label,
  category_tags = EXCLUDED.category_tags,
  base_url = EXCLUDED.base_url,
  notes = EXCLUDED.notes,
  updated_at = now();
