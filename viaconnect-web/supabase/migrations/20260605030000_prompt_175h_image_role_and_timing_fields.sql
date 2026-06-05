-- =============================================================================
-- Prompt 175h (2026-06-05): image_role on corpus + timing fields on intake.
--
-- Section 6:
--   * barcode_capture_corpus.image_role tags stored frames as 'front',
--     'ingredients', or 'unspecified' so the corpus can be sliced for
--     decoder tuning.
--   * user_current_supplements.time_of_day (text[] of morning/afternoon/
--     evening), with_food (bool), timing_reason (text), timing_source
--     (text: hannah_recommended or user_set) carry the Hannah timing
--     recommendation.
--
-- APPEND-ONLY: ADD COLUMN IF NOT EXISTS everywhere; no existing column
-- or row is touched.
-- =============================================================================

ALTER TABLE public.barcode_capture_corpus
  ADD COLUMN IF NOT EXISTS image_role text;

COMMENT ON COLUMN public.barcode_capture_corpus.image_role IS
  'Captured image role (Prompt 175h Section 6): front, ingredients, or unspecified. NULL for legacy single-image rows.';

ALTER TABLE public.user_current_supplements
  ADD COLUMN IF NOT EXISTS time_of_day text[];

ALTER TABLE public.user_current_supplements
  ADD COLUMN IF NOT EXISTS with_food boolean;

ALTER TABLE public.user_current_supplements
  ADD COLUMN IF NOT EXISTS timing_reason text;

ALTER TABLE public.user_current_supplements
  ADD COLUMN IF NOT EXISTS timing_source text;

COMMENT ON COLUMN public.user_current_supplements.time_of_day IS
  'When the user takes this supplement (Prompt 175h Section 2.5). Array of morning, afternoon, evening.';
COMMENT ON COLUMN public.user_current_supplements.with_food IS
  'Whether to take with food (Prompt 175h Section 2.5). True for fat-soluble vitamins (A, D, E, K) and omega-3.';
COMMENT ON COLUMN public.user_current_supplements.timing_reason IS
  'Short plain-language reason Hannah surfaces to the user. PHI-free.';
COMMENT ON COLUMN public.user_current_supplements.timing_source IS
  'How the timing was set: hannah_recommended (auto-filled, user accepted) or user_set (user changed Hannah suggestion).';
