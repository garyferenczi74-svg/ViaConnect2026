-- =============================================================================
-- Prompt 175 Part F (2026-06-04): CAQ supplement extraction observability log.
--
-- One row per extraction attempt the router runs (Haiku, Sonnet, optional
-- Opus). Sherlock + the 158 analytics framework consume this to watch
-- match rate, escalation rate, and latency. Empirically tells the team
-- whether Haiku alone is good enough before anyone revisits the model
-- choice.
--
-- APPEND-ONLY: this is a NEW migration. The latest existing one is
--   ...20260604000010 (Prompt 173c caq_paths). No prior migration is
--   edited.
--
-- HARD RULES: NO raw label text. NO image bytes. NO PII beyond user_id.
-- RLS owner-read; INSERT only via service-role from the extraction route.
-- =============================================================================


-- =============================================================================
-- 1. ENUMs
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE public.caq_extraction_model_tier AS ENUM ('haiku', 'sonnet', 'opus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- outcome_code intentionally stored as text so the engine can evolve its
-- typed codes without an enum migration each time. Allowed values are
-- mirrored in src/lib/caq/supplement-extraction/types.ts
-- (ExtractionOutcomeCode).


-- =============================================================================
-- 2. TABLE public.caq_supplement_extraction_log
--
--    item_count + matched_count let Sherlock track raw read accuracy AND
--    the canonical-match layer separately. avg_confidence is the mean over
--    items the served tier returned. latency_ms is end to end for that
--    tier's adapter call.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.caq_supplement_extraction_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_tier      public.caq_extraction_model_tier NOT NULL,
  escalated       boolean NOT NULL DEFAULT false,
  item_count      integer NOT NULL DEFAULT 0,
  matched_count   integer NOT NULL DEFAULT 0,
  avg_confidence  numeric(4,3) NOT NULL DEFAULT 0,
  latency_ms      integer NOT NULL DEFAULT 0,
  outcome_code    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_caq_extraction_log_counts_nonneg
    CHECK (item_count >= 0 AND matched_count >= 0 AND matched_count <= item_count),
  CONSTRAINT chk_caq_extraction_log_conf_band
    CHECK (avg_confidence >= 0 AND avg_confidence <= 1),
  CONSTRAINT chk_caq_extraction_log_latency_nonneg
    CHECK (latency_ms >= 0)
);

COMMENT ON TABLE public.caq_supplement_extraction_log IS
  'CAQ Phase 3 supplement photo extraction observability (Prompt 175 Part F). One row per attempt the router served. NO raw label text or image bytes.';

CREATE INDEX IF NOT EXISTS idx_caq_extraction_log_user_created
  ON public.caq_supplement_extraction_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_caq_extraction_log_tier_created
  ON public.caq_supplement_extraction_log (model_tier, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_caq_extraction_log_outcome_created
  ON public.caq_supplement_extraction_log (outcome_code, created_at DESC);


-- =============================================================================
-- 3. ROW LEVEL SECURITY
--    Owner reads only. INSERT is service-role only (the extraction API
--    route holds the admin client). No UPDATE or DELETE policies; the log
--    is append-only.
-- =============================================================================

ALTER TABLE public.caq_supplement_extraction_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS caq_extraction_log_owner_select ON public.caq_supplement_extraction_log;
CREATE POLICY caq_extraction_log_owner_select
  ON public.caq_supplement_extraction_log
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);


-- =============================================================================
-- 4. GRANTS
-- =============================================================================

GRANT SELECT ON public.caq_supplement_extraction_log TO authenticated;
