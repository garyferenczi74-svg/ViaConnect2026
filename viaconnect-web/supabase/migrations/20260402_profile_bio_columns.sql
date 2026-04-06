-- Add missing columns and tables for the CAQ → Dashboard data pipeline
-- Applied 2026-04-02

-- 1. caq_completed_at on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS caq_completed_at TIMESTAMPTZ;

-- 2. assessment_results table (stores each CAQ phase)
CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, phase)
);
CREATE INDEX IF NOT EXISTS idx_ar_user ON assessment_results (user_id);
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assessment results" ON assessment_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. user_current_supplements table (written by complete-caq.ts)
CREATE TABLE IF NOT EXISTS user_current_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplement_name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  product_name TEXT DEFAULT '',
  formulation TEXT DEFAULT '',
  dosage TEXT DEFAULT '',
  dosage_form TEXT DEFAULT 'capsule',
  frequency TEXT DEFAULT 'daily',
  category TEXT DEFAULT 'general',
  key_ingredients TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'manual',
  is_current BOOLEAN DEFAULT true,
  is_ai_recommended BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, supplement_name)
);
ALTER TABLE user_current_supplements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own current supplements" ON user_current_supplements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. supplement_adherence table
CREATE TABLE IF NOT EXISTS supplement_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplement_name TEXT NOT NULL,
  supplement_type TEXT DEFAULT 'current',
  category TEXT DEFAULT 'general',
  recommended_dosage TEXT DEFAULT '',
  recommended_frequency TEXT DEFAULT 'daily',
  adherence_percent NUMERIC(5,2) DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  total_doses_logged INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  UNIQUE(user_id, supplement_name)
);
ALTER TABLE supplement_adherence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own supplement adherence" ON supplement_adherence
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. bio_optimization_history table
CREATE TABLE IF NOT EXISTS bio_optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  source TEXT DEFAULT 'caq_initial',
  breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE bio_optimization_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bio history" ON bio_optimization_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Backfill caq_completed_at for users who already completed
UPDATE profiles SET caq_completed_at = bio_optimization_calculated_at
  WHERE assessment_completed = true AND caq_completed_at IS NULL;
