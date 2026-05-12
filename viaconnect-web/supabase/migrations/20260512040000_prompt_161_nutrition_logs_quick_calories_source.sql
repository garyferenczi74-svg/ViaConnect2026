-- Prompt #161: extend nutrition_logs.source enum to include 'quick_calories'
-- so the Quick Log "Calories" card can write fast-path entries that skip the
-- AI macro analysis from Prompt #160.
--
-- Append-only discipline: the original Prompt #160 migration is untouched.
-- Dropping + re-adding the check constraint is permitted here because we are
-- widening the allowed value set, not deleting columns or historical rows.

ALTER TABLE public.nutrition_logs
  DROP CONSTRAINT IF EXISTS nutrition_logs_source_check;

ALTER TABLE public.nutrition_logs
  ADD CONSTRAINT nutrition_logs_source_check
  CHECK (source IN ('manual_text', 'photo_ai', 'barcode', 'imported', 'quick_calories'));
