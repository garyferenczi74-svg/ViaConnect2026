-- Prompt #164: append `data_source` to nutrition_logs so the consumer can see
-- whether macros came from USDA (high confidence, citable), Gemini estimation
-- (fallback when USDA had no match), or were edited manually.
--
-- Append-only. No backfill: legacy rows from #160/#161 stay NULL and continue
-- rendering with the existing UI (no attribution line shown).
--
-- Allowed values (documented, not check-constrained to keep future-providers cheap):
--   'usda'             = all items matched against USDA FoodData Central
--   'gemini_fallback'  = AI estimated macros (USDA had no match)
--   'mixed'            = some items USDA, some AI fallback
--   'manual'           = user-edited values via /api/nutrition/confirm
--   NULL               = legacy row from before Prompt #164

ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS data_source TEXT;

CREATE INDEX IF NOT EXISTS nutrition_logs_user_data_source_idx
  ON public.nutrition_logs (user_id, data_source)
  WHERE data_source IS NOT NULL;
