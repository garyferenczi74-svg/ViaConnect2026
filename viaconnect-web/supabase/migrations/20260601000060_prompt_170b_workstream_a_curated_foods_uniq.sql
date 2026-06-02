-- Prompt 170b Workstream A (Gary 2026-06-01 launch +0 evening):
-- idempotent unique constraint for the farmceutica_curated_foods seed.
--
-- Seed script (scripts/seed/farmceutica-curated-foods.ts) upserts each
-- of ~200 Gordon-authored rows using onConflict ('name,cuisine_tag').
-- Supabase upsert requires a unique constraint on the exact onConflict
-- columns, so this migration adds a regular composite unique index
-- (rather than the spec section 3.5 functional index on lower(name) +
-- coalesce(cuisine_tag, '')); the seed script validates that every row
-- has cuisine_tag set + names use consistent Title Case so the
-- composite index suffices for the seed.
--
-- Append-only per standing rule. Idempotent CREATE INDEX IF NOT EXISTS.

CREATE UNIQUE INDEX IF NOT EXISTS uq_farmceutica_curated_foods_name_cuisine
  ON public.farmceutica_curated_foods (name, cuisine_tag);
