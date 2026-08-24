-- Prompt 221 Phase 2: add CanPrev US storefront (Gary-provided catalog URL).
-- Append-only. Source: https://canprev.com/all-products/
-- canprev.ca already allowlisted; this is the US .com catalog.

INSERT INTO public.competitive_sources (
  domain, label, source_kind, category_tags, base_url,
  approval_status, proposed_by, approved_by, notes
) VALUES
  ('canprev.com', 'CanPrev US', 'brand',
    ARRAY['base-formulations','womens-health','advanced-formulas'],
    'https://canprev.com', 'approved', 'hounddog', 'gary',
    'US storefront; catalog https://canprev.com/all-products/')
ON CONFLICT (domain) DO UPDATE SET
  approval_status = 'approved',
  is_active = true,
  approved_by = 'gary',
  label = EXCLUDED.label,
  category_tags = EXCLUDED.category_tags,
  base_url = EXCLUDED.base_url,
  notes = EXCLUDED.notes,
  updated_at = now();
