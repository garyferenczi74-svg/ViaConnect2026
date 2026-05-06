-- Prompt #85c Phase A: 4 new body-tracker tables + body_tracker_user_state
-- (substitutes spec's arnold_user_profiles columns since that table is drifted in live)
-- All append-only. body_tracker_circumference + body_graphics_preferences from #85b unchanged.

-- ── Photo scan results (estimates only; photos NEVER stored here) ──────────
CREATE TABLE IF NOT EXISTS public.body_tracker_photo_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  estimated_body_fat_min NUMERIC(4,1),
  estimated_body_fat_max NUMERIC(4,1),
  body_type TEXT,
  fat_distribution TEXT,
  estimated_whr_min NUMERIC(3,2),
  estimated_whr_max NUMERIC(3,2),
  muscle_development JSONB DEFAULT '{}'::jsonb,
  ai_confidence TEXT CHECK (ai_confidence IN ('low','medium','high')),
  ai_model TEXT,
  full_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bt_photo_scans_user
  ON public.body_tracker_photo_scans (user_id, scan_date DESC);
ALTER TABLE public.body_tracker_photo_scans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='body_tracker_photo_scans'
    AND policyname='Users own photo scans') THEN
    CREATE POLICY "Users own photo scans" ON public.body_tracker_photo_scans
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── Chronic risk tracking ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.body_tracker_chronic_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  overall_grade TEXT,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_sources_used TEXT[],
  arnold_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, assessment_date)
);
CREATE INDEX IF NOT EXISTS idx_bt_chronic_risk_user
  ON public.body_tracker_chronic_risk (user_id, assessment_date DESC);
ALTER TABLE public.body_tracker_chronic_risk ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='body_tracker_chronic_risk'
    AND policyname='Users own chronic risk') THEN
    CREATE POLICY "Users own chronic risk" ON public.body_tracker_chronic_risk
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── Journey history (every journey ever started) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.body_tracker_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_type TEXT NOT NULL CHECK (journey_type IN ('weight_loss','muscle_building')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  starting_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ending_snapshot JSONB,
  milestones_completed INTEGER NOT NULL DEFAULT 0,
  final_assessment TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_bt_journeys_user_active
  ON public.body_tracker_journeys (user_id, is_active);
ALTER TABLE public.body_tracker_journeys ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='body_tracker_journeys'
    AND policyname='Users own journeys') THEN
    CREATE POLICY "Users own journeys" ON public.body_tracker_journeys
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── Activity performance (calorie tracking + cohort percentile) ──────────
CREATE TABLE IF NOT EXISTS public.body_tracker_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.body_tracker_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_calories INTEGER,
  target_calories INTEGER,
  bmr_calories INTEGER,
  cohort_percentile INTEGER CHECK (cohort_percentile BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bt_activity_user
  ON public.body_tracker_activity (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bt_activity_entry
  ON public.body_tracker_activity (entry_id);
ALTER TABLE public.body_tracker_activity ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='body_tracker_activity'
    AND policyname='Users own activity') THEN
    CREATE POLICY "Users own activity" ON public.body_tracker_activity
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── User state (substitutes drifted arnold_user_profiles for #85c needs) ──
CREATE TABLE IF NOT EXISTS public.body_tracker_user_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_journey TEXT CHECK (active_journey IN ('weight_loss','muscle_building')),
  journey_started_at TIMESTAMPTZ,
  journey_starting_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  avatar_gender_override TEXT CHECK (avatar_gender_override IN ('male','female')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.body_tracker_user_state ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='body_tracker_user_state'
    AND policyname='Users own bt user state') THEN
    CREATE POLICY "Users own bt user state" ON public.body_tracker_user_state
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

COMMENT ON TABLE public.body_tracker_user_state IS
  'Prompt #85c Phase A: per-user body-tracker state (active journey, avatar override). Substitutes the drifted arnold_user_profiles for #85c columns.';
COMMENT ON TABLE public.body_tracker_photo_scans IS
  'Prompt #85c Phase A: AI photo-scan body composition estimates. Photos themselves are NEVER stored here; only the parsed estimates.';
COMMENT ON TABLE public.body_tracker_chronic_risk IS
  'Prompt #85c Phase A scaffold: chronic risk indicator tracking. Phase B/C will populate from cross-reference engine.';
COMMENT ON TABLE public.body_tracker_journeys IS
  'Prompt #85c Phase A: journey history. body_tracker_user_state.active_journey points at the currently active row.';
COMMENT ON TABLE public.body_tracker_activity IS
  'Prompt #85c Phase A scaffold: activity / calorie performance. Phase B will wire to cohort percentile.';
