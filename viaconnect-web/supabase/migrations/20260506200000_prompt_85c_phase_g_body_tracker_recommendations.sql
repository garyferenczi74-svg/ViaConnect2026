-- Prompt #85c Phase G: free-form Arnold cross-reference recommendation cache.
-- Distinct from public.recommendations (which is product-recommendation focused);
-- this is text-only Arnold recommendations with multi-source citations.

CREATE TABLE IF NOT EXISTS public.body_tracker_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_text TEXT NOT NULL,
  source_ids TEXT[] NOT NULL DEFAULT '{}',
  confidence_tier INTEGER NOT NULL CHECK (confidence_tier BETWEEN 1 AND 3),
  confidence_pct INTEGER NOT NULL CHECK (confidence_pct BETWEEN 0 AND 100),
  ai_model TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bt_recommendations_user_active
  ON public.body_tracker_recommendations (user_id, generated_at DESC)
  WHERE dismissed_at IS NULL;

ALTER TABLE public.body_tracker_recommendations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='body_tracker_recommendations'
    AND policyname='Users own bt recommendations') THEN
    CREATE POLICY "Users own bt recommendations" ON public.body_tracker_recommendations
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

COMMENT ON TABLE public.body_tracker_recommendations IS
  'Prompt #85c Phase G: cross-reference engine output cache. Each row is one Arnold recommendation produced by arnold-cross-reference-recommend Edge Function citing 1+ data sources from body_tracker, supplements, CAQ, or genetics.';
