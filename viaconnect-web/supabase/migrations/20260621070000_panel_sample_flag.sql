-- Prompt 204 (2026-06-21): SAMPLE flag for seeded GeneX360 panel results.
--
-- When a user purchases the GeneX360 bundle, all six panels are populated
-- immediately with SAMPLE results so the experience works end to end before a
-- real lab feed exists. Those rows are marked is_sample = true so every display
-- surface can badge them SAMPLE (a user must never mistake demo data for their
-- real DNA or epigenetic readouts), and so the seed can stay idempotent: the
-- purchase finalize path seeds only when the user has no sample rows yet.
--
-- Additive and fail-soft: a new column defaulting to false leaves every existing
-- row unchanged. Owner-scoped RLS on both tables already covers these rows, so no
-- policy change is needed. Partial indexes keep the "does this user already have
-- sample rows" check cheap.

ALTER TABLE public.user_variants
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_epigenetic_markers
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_variants_sample
  ON public.user_variants (user_id)
  WHERE is_sample;

CREATE INDEX IF NOT EXISTS idx_user_epigenetic_markers_sample
  ON public.user_epigenetic_markers (user_id)
  WHERE is_sample;
