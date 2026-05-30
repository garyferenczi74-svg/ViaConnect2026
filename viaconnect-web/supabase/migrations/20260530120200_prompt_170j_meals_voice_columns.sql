-- Prompt 170j §9.3: voice correction flags on meals table.
-- Append-only column additions. These stamp at meal save time when at least
-- one voice operation was applied during editing. Used by Prompt 170g
-- training corpus to weight voice-corrected rows 1.5x (highest-quality
-- training signal per §8.5).

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS voice_corrected BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS voice_operation_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS voice_corrected_fields_json JSONB;

CREATE INDEX IF NOT EXISTS idx_meals_voice_corrected
  ON public.meals(voice_corrected)
  WHERE voice_corrected = TRUE;

COMMENT ON COLUMN public.meals.voice_corrected
  IS 'Prompt 170j: TRUE when at least one voice operation was applied to this meal during editing. Consumer-portal-only; redacted from practitioner views per 170i §13.3.';

COMMENT ON COLUMN public.meals.voice_operation_count
  IS 'Prompt 170j: number of voice operations applied during meal editing.';

COMMENT ON COLUMN public.meals.voice_corrected_fields_json
  IS 'Prompt 170j: which field categories were touched (items, cooking_oils, portions, modifiers) for 170g training weight differentiation.';
