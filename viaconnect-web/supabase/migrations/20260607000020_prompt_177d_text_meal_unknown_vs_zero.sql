-- =============================================================================
-- Prompt 177d (2026-06-07): allow unknown vs zero on the meals macro columns.
--
-- Per the June 6, 2026 decision to bless the text meal channel as a scored
-- channel of estimated confidence, the parser must be able to record an
-- explicit "could not determine" as NULL rather than defaulting to 0. Zero
-- reads as "healthy" for sodium/sugar and dishonestly inflates the score.
--
-- This migration drops the NOT NULL + DEFAULT 0 constraint on the 7 macro
-- columns that the analyze-text parser cannot always determine from typed
-- text. calories_kcal stays NOT NULL with default 0 because the parser is
-- required to determine calories (it is the anchor of the 4/4/9 macro
-- reconciliation check from 177d Step 3).
--
-- All other channels (Photo AI, Quick Log, Connected Apps) continue to
-- write concrete numeric values for these columns; the column-level
-- default 0 stays so existing INSERTs without an explicit value land at
-- 0 (matching the pre-177d behavior on those paths).
--
-- Append-only. No applied migration is touched.
-- =============================================================================

ALTER TABLE public.meals ALTER COLUMN protein_g     DROP NOT NULL;
ALTER TABLE public.meals ALTER COLUMN carbs_g       DROP NOT NULL;
ALTER TABLE public.meals ALTER COLUMN fat_total_g   DROP NOT NULL;
ALTER TABLE public.meals ALTER COLUMN fat_healthy_g DROP NOT NULL;
ALTER TABLE public.meals ALTER COLUMN fiber_g       DROP NOT NULL;
ALTER TABLE public.meals ALTER COLUMN sugar_g       DROP NOT NULL;
ALTER TABLE public.meals ALTER COLUMN sodium_mg     DROP NOT NULL;

-- Column-level DEFAULT 0 retained so an INSERT that omits a macro still
-- lands at 0 for non-text paths (Photo AI / Quick Log / Connected Apps).
-- The analyze-text route is the only writer that should explicitly pass
-- NULL for "not determinable" per 177d Step 2.

COMMENT ON COLUMN public.meals.sodium_mg IS
  'Sodium in mg. Nullable per Prompt 177d (2026-06-07): text-channel meals record NULL when the parser cannot determine sodium from typed input. Photo AI / Quick Log / Connected Apps still write concrete values; default 0 preserved for non-text writers.';
