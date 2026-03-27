-- ============================================================================
-- ViaConnect AI Personalization Engine - Database Migration
-- Created: 2026-03-26
-- Description: Core tables for genetic profiles, AI conversations, daily
--              actions, supplement compliance, medications, predictive alerts,
--              wearable biometrics, weekly briefings, and user health profiles.
-- ============================================================================

-- 1. genetic_profiles
CREATE TABLE IF NOT EXISTS public.genetic_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gene TEXT NOT NULL,
  variant TEXT NOT NULL,
  rs_id TEXT NOT NULL,
  genotype TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('high', 'moderate', 'low', 'benign')),
  category TEXT NOT NULL,
  panel TEXT,
  clinical_significance TEXT,
  supplement_recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, rs_id)
);

ALTER TABLE public.genetic_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON public.genetic_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_genetic_profiles_user_id ON public.genetic_profiles(user_id);
CREATE INDEX idx_genetic_profiles_impact ON public.genetic_profiles(impact);
CREATE INDEX idx_genetic_profiles_category ON public.genetic_profiles(category);
CREATE INDEX idx_genetic_profiles_rs_id ON public.genetic_profiles(rs_id);


-- 2. ai_conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal TEXT NOT NULL CHECK (portal IN ('consumer', 'practitioner', 'naturopath')),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON public.ai_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_portal ON public.ai_conversations(portal);
CREATE INDEX idx_ai_conversations_created_at ON public.ai_conversations(created_at DESC);
CREATE INDEX idx_ai_conversations_user_portal ON public.ai_conversations(user_id, portal, created_at DESC);


-- 3. daily_actions
CREATE TABLE IF NOT EXISTS public.daily_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_type TEXT NOT NULL CHECK (action_type IN ('supplement', 'lab', 'exercise', 'nutrition', 'mindfulness', 'sleep', 'hydration', 'appointment', 'custom')),
  title TEXT NOT NULL,
  subtitle TEXT,
  scheduled_time TIME,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'snoozed')),
  completed_at TIMESTAMPTZ,
  tokens_reward INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 10),
  rationale TEXT,
  genetic_context JSONB DEFAULT '{}'::jsonb,
  data_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, date, title)
);

ALTER TABLE public.daily_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON public.daily_actions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_daily_actions_user_id ON public.daily_actions(user_id);
CREATE INDEX idx_daily_actions_date ON public.daily_actions(date);
CREATE INDEX idx_daily_actions_user_date ON public.daily_actions(user_id, date);
CREATE INDEX idx_daily_actions_status ON public.daily_actions(status);


-- 4. supplement_compliance
CREATE TABLE IF NOT EXISTS public.supplement_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time TIME,
  taken BOOLEAN NOT NULL DEFAULT false,
  taken_at TIMESTAMPTZ,
  skipped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supplement_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON public.supplement_compliance
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_supplement_compliance_user_id ON public.supplement_compliance(user_id);
CREATE INDEX idx_supplement_compliance_date ON public.supplement_compliance(scheduled_date);
CREATE INDEX idx_supplement_compliance_user_date ON public.supplement_compliance(user_id, scheduled_date);
CREATE INDEX idx_supplement_compliance_taken ON public.supplement_compliance(taken);


-- 5. user_medications
CREATE TABLE IF NOT EXISTS public.user_medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  generic_name TEXT,
  dosage TEXT,
  frequency TEXT,
  prescribing_doctor TEXT,
  start_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  rxcui TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON public.user_medications
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_user_medications_user_id ON public.user_medications(user_id);
CREATE INDEX idx_user_medications_active ON public.user_medications(user_id, active);
CREATE INDEX idx_user_medications_rxcui ON public.user_medications(rxcui);


-- 6. predictive_alerts
CREATE TABLE IF NOT EXISTS public.predictive_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('genetic_risk', 'biometric_anomaly', 'interaction_warning', 'compliance_drift', 'trend_alert', 'lab_recommendation')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  genetic_context JSONB DEFAULT '{}'::jsonb,
  biometric_evidence JSONB DEFAULT '{}'::jsonb,
  recommended_actions JSONB DEFAULT '[]'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.predictive_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON public.predictive_alerts
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_predictive_alerts_user_id ON public.predictive_alerts(user_id);
CREATE INDEX idx_predictive_alerts_acknowledged ON public.predictive_alerts(user_id, acknowledged);
CREATE INDEX idx_predictive_alerts_severity ON public.predictive_alerts(severity);
CREATE INDEX idx_predictive_alerts_type ON public.predictive_alerts(alert_type);
CREATE INDEX idx_predictive_alerts_expires ON public.predictive_alerts(expires_at);


-- 7. wearable_summaries
CREATE TABLE IF NOT EXISTS public.wearable_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_duration_minutes INTEGER,
  sleep_quality_score NUMERIC(5,2),
  deep_sleep_minutes INTEGER,
  rem_sleep_minutes INTEGER,
  light_sleep_minutes INTEGER,
  awake_minutes INTEGER,
  hrv_avg NUMERIC(6,2),
  hrv_max NUMERIC(6,2),
  hrv_min NUMERIC(6,2),
  resting_heart_rate NUMERIC(5,2),
  recovery_score NUMERIC(5,2),
  strain_score NUMERIC(5,2),
  stress_score NUMERIC(5,2),
  steps INTEGER,
  calories_burned INTEGER,
  active_calories INTEGER,
  body_battery INTEGER,
  respiratory_rate NUMERIC(5,2),
  spo2 NUMERIC(5,2),
  skin_temp NUMERIC(5,2),
  glucose_avg NUMERIC(6,2),
  glucose_min NUMERIC(6,2),
  glucose_max NUMERIC(6,2),
  source_devices JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, date)
);

ALTER TABLE public.wearable_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON public.wearable_summaries
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_wearable_summaries_user_id ON public.wearable_summaries(user_id);
CREATE INDEX idx_wearable_summaries_date ON public.wearable_summaries(date);
CREATE INDEX idx_wearable_summaries_user_date ON public.wearable_summaries(user_id, date DESC);


-- 8. weekly_briefings
CREATE TABLE IF NOT EXISTS public.weekly_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  script TEXT,
  audio_url TEXT,
  key_insights JSONB DEFAULT '[]'::jsonb,
  compliance_summary JSONB DEFAULT '{}'::jsonb,
  biometric_trends JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON public.weekly_briefings
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_weekly_briefings_user_id ON public.weekly_briefings(user_id);
CREATE INDEX idx_weekly_briefings_week ON public.weekly_briefings(user_id, week_start DESC);


-- 9. user_health_profile
CREATE TABLE IF NOT EXISTS public.user_health_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  health_goals JSONB DEFAULT '[]'::jsonb,
  dietary_preferences JSONB DEFAULT '[]'::jsonb,
  activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')),
  sleep_preference TEXT CHECK (sleep_preference IN ('early_bird', 'night_owl', 'flexible')),
  supplement_experience TEXT CHECK (supplement_experience IN ('beginner', 'intermediate', 'advanced')),
  family_history JSONB DEFAULT '[]'::jsonb,
  existing_conditions JSONB DEFAULT '[]'::jsonb,
  ai_personality TEXT DEFAULT 'balanced' CHECK (ai_personality IN ('motivational', 'clinical', 'balanced', 'gentle', 'direct')),
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id)
);

ALTER TABLE public.user_health_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON public.user_health_profile
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_user_health_profile_user_id ON public.user_health_profile(user_id);
