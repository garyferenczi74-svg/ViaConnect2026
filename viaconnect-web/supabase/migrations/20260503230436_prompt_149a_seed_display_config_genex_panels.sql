-- Prompt #149a: PLP Product Image Frame Fit (GeneX360 Testing and Diagnostics)
-- Data migration: seed display_config for two specific testing-panel rows that
-- render at incorrect scale on the GeneX360 PLP. Other panels in the category
-- (cannabisiq, epigendx, genexm, hormoneiq, nutrigendx, peptidesiq) remain at
-- the empty-object default and continue to pick up the existing #149 slug-map
-- behavior in the ProductCard component.
--
-- Applied to live DB on 2026-05-03 via mcp__claude_ai_Supabase__apply_migration
-- (cloud version 20260503230436). This file is the local source-of-truth copy.
--
-- Per-product overrides (verified against live slugs):
--   30-day-custom-methylation-based-vitamin-formulations: poster composition
--     too zoomed-in under existing object-cover + scale-1.30 treatment, drops
--     to object-contain with loose inner padding plus 0.95 scale to let the
--     full poster (header, FarmCeutica logo, certification badges, packets)
--     fit the card with breathing room.
--   genex360: cylinder plus box composition sits small with a wide white halo
--     under existing scale-1.05 treatment, retains object-cover plus 1.05
--     scale plus tight inner padding so the subject reaches frame edges.
--
-- Idempotent: re-runs simply re-set the same JSONB values.

update public.products
set display_config = '{"fit":"contain","padding":"loose","scale":0.95}'::jsonb
where slug = '30-day-custom-methylation-based-vitamin-formulations';

update public.products
set display_config = '{"fit":"cover","padding":"tight","scale":1.05}'::jsonb
where slug = 'genex360';
