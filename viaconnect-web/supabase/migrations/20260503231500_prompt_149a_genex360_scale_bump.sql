-- Prompt #149a follow-up: bump GeneX360 display_config scale 1.05 → 1.5
--
-- Initial #149a seed used spec literal scale 1.05 for genex360. Source image
-- (verified 2026-05-03 via fetched 3000x4000 PNG at supplement-photos/GeneX360
-- Testing and Diagnostics/GeneX360.png) is a lifestyle scene shot, not a
-- tight studio kit shot: cylinder + box subject only fills roughly 40% of
-- the source frame; the rest is bokeh-blurred kitchen counter background.
-- Scale 1.05 is too subtle to push the muted background past frame edges,
-- so Gary observed no visual change after #149a shipped.
--
-- 1.5 is the max scale allowed by the resolve-display-config clamp [0.5, 1.5]
-- and pushes the visible composition tight enough that the cylinder + box
-- read at comparable visual weight to the other 6 testing panels (which
-- still pick up #149's PLP_IMAGE_OVERZOOM scale-1.30 from the slug map).
--
-- Applied to live DB on 2026-05-03 via mcp__claude_ai_Supabase__apply_migration
-- (cloud version 20260503231500). This file is the local source-of-truth copy.
-- Idempotent: re-runs simply re-set the same JSONB value.

update public.products
set display_config = '{"fit":"cover","padding":"tight","scale":1.5}'::jsonb
where slug = 'genex360';
