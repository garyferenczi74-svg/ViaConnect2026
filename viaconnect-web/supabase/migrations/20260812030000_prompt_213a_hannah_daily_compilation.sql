-- Prompt 213a: Hannah daily insight compilation storage + Hound Dog staging.
-- Append-only. Does not edit prior migrations.

-- ---------------------------------------------------------------------------
-- 1) Hannah accelerator insights (composer output, provenance-tagged)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hannah_accelerator_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_key text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  source_hub text NOT NULL,
  supplier_agent text NOT NULL,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  estimated_impact numeric NOT NULL DEFAULT 4,
  priority integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'dismissed', 'expired')),
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  run_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hannah_accel_user_insight_key
  ON public.hannah_accelerator_insights (user_id, insight_key);

CREATE INDEX IF NOT EXISTS idx_hannah_accel_user_status
  ON public.hannah_accelerator_insights (user_id, status, priority DESC);

ALTER TABLE public.hannah_accelerator_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own hannah accel insights" ON public.hannah_accelerator_insights;
CREATE POLICY "Users read own hannah accel insights"
  ON public.hannah_accelerator_insights
  FOR SELECT USING (auth.uid() = user_id);

-- Service role writes via admin client (no consumer insert policy).

-- Extend journey_recommendations with provenance for dual-read compatibility.
ALTER TABLE public.journey_recommendations
  ADD COLUMN IF NOT EXISTS insight_key text,
  ADD COLUMN IF NOT EXISTS source_hub text,
  ADD COLUMN IF NOT EXISTS supplier_agent text,
  ADD COLUMN IF NOT EXISTS source_refs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_journey_recs_user_insight_key
  ON public.journey_recommendations (user_id, insight_key)
  WHERE insight_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) Hound Dog staging (raw scrape) + gated promotion
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hounddog_staging_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('clinical_study', 'social_aggregate', 'news')),
  title text NOT NULL,
  summary text NOT NULL,
  retrieved_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Aggregate signal only; never PII about private individuals.
  is_aggregate_only boolean NOT NULL DEFAULT true,
  robots_ok boolean NOT NULL DEFAULT true,
  gate_status text NOT NULL DEFAULT 'pending'
    CHECK (gate_status IN ('pending', 'approved', 'blocked', 'escalated')),
  gate_checked_at timestamptz,
  gate_notes text,
  gate_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hounddog_staging_gate
  ON public.hounddog_staging_items (gate_status, retrieved_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hounddog_staging_source_url
  ON public.hounddog_staging_items (source_url);

ALTER TABLE public.hounddog_staging_items ENABLE ROW LEVEL SECURITY;
-- No consumer policies: service/admin only.

CREATE TABLE IF NOT EXISTS public.hounddog_gated_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staging_id uuid NOT NULL REFERENCES public.hounddog_staging_items(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  source_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  approved_by text NOT NULL DEFAULT 'marshall',
  attribution text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hounddog_gated_staging
  ON public.hounddog_gated_items (staging_id);

ALTER TABLE public.hounddog_gated_items ENABLE ROW LEVEL SECURITY;

-- Compilation run log per user (idempotent day key)
CREATE TABLE IF NOT EXISTS public.hannah_compile_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  run_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('ok', 'partial', 'failed')),
  suppliers jsonb NOT NULL DEFAULT '{}'::jsonb,
  insights_written integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hannah_compile_user_day
  ON public.hannah_compile_runs (user_id, run_date)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hannah_compile_run_id
  ON public.hannah_compile_runs (run_id);

ALTER TABLE public.hannah_compile_runs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.hannah_accelerator_insights IS
  'Prompt 213a Hannah composer output with multi-agent provenance.';
COMMENT ON TABLE public.hounddog_staging_items IS
  'Prompt 213a Hound Dog raw staging; never consumer-facing until gated.';
