-- =============================================================================
-- Prompt #124 P6 carry-in from P5 review:
-- Index counterfeit_determinations.created_at for the SOC 2 collector range query.
-- =============================================================================
-- The SOC 2 counterfeit-determinations-collector runs
--   WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at ASC
-- per SOC 2 period. The existing idx_determinations_review is a composite
-- partial index with leading human_review_required, which cannot serve a
-- pure range scan on created_at. Add a plain b-tree index.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_determinations_created_at
  ON public.counterfeit_determinations (created_at);
