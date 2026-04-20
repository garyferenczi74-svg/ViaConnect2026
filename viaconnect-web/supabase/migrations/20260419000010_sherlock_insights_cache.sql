-- =============================================================================
-- Prompt #99 Phase 1 (Path A): Sherlock insights cache.
-- =============================================================================
-- Caches AI-generated practitioner narrative insights so the Claude API
-- is called at most once per (practitioner, page, day).
--
-- This table is self-contained (references auth.users + practitioners).
-- All other Prompt #99 materialized views are deferred until their
-- dependency tables (clients, bio_optimization_scores, referral_commissions,
-- whitelabel_orders, caq_submissions, lab_uploads, genetic_uploads,
-- symptom_logs, wearables, interaction_events, practitioner_transactions)
-- become live.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sherlock_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  page TEXT NOT NULL CHECK (page IN (
    'practice_health','cohorts','protocols','revenue','engagement'
  )),
  generated_at DATE NOT NULL DEFAULT CURRENT_DATE,

  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  suggested_action TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('high','medium','low')),

  -- Raw Claude response for audit. Never surfaced to practitioners.
  raw_response JSONB,

  -- Provenance: prompt version + model id so regressions can be traced.
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  model_id TEXT NOT NULL DEFAULT 'claude-opus-4-7',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (practitioner_id, page, generated_at)
);

COMMENT ON TABLE public.sherlock_insights_cache IS
  'Daily-cached Sherlock narrative insights per practitioner + analytics page. Feeds the on-page insight card; weekly digest reads the 7 most-recent rows across pages per practitioner.';
COMMENT ON COLUMN public.sherlock_insights_cache.confidence IS
  'Self-reported confidence from Sherlock. Practitioner UI surfaces high confidence plainly; medium + low get an explicit qualifier.';

CREATE INDEX IF NOT EXISTS idx_sherlock_insights_cache_recent
  ON public.sherlock_insights_cache(practitioner_id, page, generated_at DESC);

ALTER TABLE public.sherlock_insights_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Practitioners read their own cached insights.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sherlock_insights_cache'
      AND policyname = 'sherlock_insights_self_read'
  ) THEN
    CREATE POLICY "sherlock_insights_self_read"
      ON public.sherlock_insights_cache FOR SELECT TO authenticated
      USING (
        practitioner_id IN (
          SELECT id FROM public.practitioners WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Admins read all.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sherlock_insights_cache'
      AND policyname = 'sherlock_insights_admin_all'
  ) THEN
    CREATE POLICY "sherlock_insights_admin_all"
      ON public.sherlock_insights_cache FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;

  -- Service role writes (Sherlock edge function runs under service role).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sherlock_insights_cache'
      AND policyname = 'sherlock_insights_service_all'
  ) THEN
    CREATE POLICY "sherlock_insights_service_all"
      ON public.sherlock_insights_cache FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;
