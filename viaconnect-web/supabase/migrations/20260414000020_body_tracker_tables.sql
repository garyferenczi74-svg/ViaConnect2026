-- =============================================================
-- Prompt #77: Body Tracker Module — Arnold Sub-Agent
-- 7 tables, RLS, indexes. Append-only.
-- =============================================================

-- 1. Core body tracker entries (one per measurement session)
CREATE TABLE IF NOT EXISTS body_tracker_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'manual',
  device_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Weight & basic measurements
CREATE TABLE IF NOT EXISTS body_tracker_weight (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES body_tracker_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_lbs NUMERIC(6,2),
  goal_weight_lbs NUMERIC(6,2),
  bmi NUMERIC(4,1),
  body_fat_pct NUMERIC(4,1),
  visceral_fat_rating INTEGER,
  body_water_pct NUMERIC(4,1),
  waist_in NUMERIC(5,2),
  hips_in NUMERIC(5,2),
  chest_in NUMERIC(5,2),
  neck_in NUMERIC(5,2),
  right_arm_in NUMERIC(5,2),
  left_arm_in NUMERIC(5,2),
  right_thigh_in NUMERIC(5,2),
  left_thigh_in NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Segmental body fat data
CREATE TABLE IF NOT EXISTS body_tracker_segmental_fat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES body_tracker_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  right_arm_pct NUMERIC(4,1),
  left_arm_pct NUMERIC(4,1),
  trunk_pct NUMERIC(4,1),
  right_leg_pct NUMERIC(4,1),
  left_leg_pct NUMERIC(4,1),
  total_body_fat_pct NUMERIC(4,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Segmental muscle data
CREATE TABLE IF NOT EXISTS body_tracker_segmental_muscle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES body_tracker_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  right_arm_lbs NUMERIC(5,1),
  left_arm_lbs NUMERIC(5,1),
  trunk_lbs NUMERIC(5,1),
  right_leg_lbs NUMERIC(5,1),
  left_leg_lbs NUMERIC(5,1),
  total_muscle_mass_lbs NUMERIC(5,1),
  skeletal_muscle_mass_lbs NUMERIC(5,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Metabolic & cardiovascular data
CREATE TABLE IF NOT EXISTS body_tracker_metabolic (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES body_tracker_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metabolic_age INTEGER,
  resting_hr_bpm INTEGER,
  hrv_ms INTEGER,
  metabolic_capacity INTEGER CHECK (metabolic_capacity BETWEEN 0 AND 100),
  strain INTEGER CHECK (strain BETWEEN 0 AND 100),
  metabolic_momentum INTEGER,
  circadian_readiness JSONB NOT NULL DEFAULT '{}'::jsonb,
  optimal_window_start TIME,
  optimal_window_end TIME,
  moderate_window_start TIME,
  moderate_window_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Milestones & goals
CREATE TABLE IF NOT EXISTS body_tracker_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC(8,2),
  target_unit TEXT,
  start_value NUMERIC(8,2),
  current_value NUMERIC(8,2),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  completed_date DATE,
  expected_days INTEGER,
  actual_days INTEGER,
  grade TEXT CHECK (grade IN ('A+','A','A-','B+','B','B-','C+','C','C-','D','F')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  milestone_order INTEGER NOT NULL DEFAULT 1,
  total_milestones INTEGER NOT NULL DEFAULT 5,
  helix_tokens_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Body Score history
CREATE TABLE IF NOT EXISTS body_tracker_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  body_score INTEGER CHECK (body_score BETWEEN 0 AND 1000),
  confidence_pct INTEGER CHECK (confidence_pct BETWEEN 0 AND 100),
  composition_grade TEXT,
  weight_grade TEXT,
  muscle_grade TEXT,
  cardiovascular_grade TEXT,
  metabolic_grade TEXT,
  score_delta INTEGER,
  tier TEXT CHECK (tier IN ('Critical','Needs Attention','Developing','Good','Optimal')),
  breakdown_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, score_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bt_entries_user_date ON body_tracker_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_bt_weight_user ON body_tracker_weight(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bt_scores_user_date ON body_tracker_scores(user_id, score_date DESC);
CREATE INDEX IF NOT EXISTS idx_bt_milestones_user_active ON body_tracker_milestones(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_bt_metabolic_user ON body_tracker_metabolic(user_id, created_at DESC);

-- RLS
ALTER TABLE body_tracker_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_tracker_weight ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_tracker_segmental_fat ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_tracker_segmental_muscle ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_tracker_metabolic ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_tracker_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_tracker_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own bt entries" ON body_tracker_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own bt weight" ON body_tracker_weight FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own bt seg fat" ON body_tracker_segmental_fat FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own bt seg muscle" ON body_tracker_segmental_muscle FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own bt metabolic" ON body_tracker_metabolic FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own bt milestones" ON body_tracker_milestones FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own bt scores" ON body_tracker_scores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
