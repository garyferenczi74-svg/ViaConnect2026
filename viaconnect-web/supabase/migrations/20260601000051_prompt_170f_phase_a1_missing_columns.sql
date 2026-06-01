-- Prompt 170f Phase A.1: additive backfill of 4 columns Phase A migration
-- omitted but Phase B/C/D code paths reference.
--
-- Surfaced by Jeffery pre-launch review (2026-06-01) flagging two HARD
-- BLOCKERS: first POST /api/recipes would 500 on has_unmatched_ingredients
-- + parser_version absent; GET /api/recipes/templates would 500 on slug +
-- save_count absent. Both confirmed by reading 20260601000050 DDL.
--
-- Append-only per Rule 3; does NOT edit Phase A file.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS has_unmatched_ingredients BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS parser_version TEXT;

ALTER TABLE public.recipe_public_templates
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS save_count INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_recipe_public_templates_slug
  ON public.recipe_public_templates(slug) WHERE slug IS NOT NULL;
