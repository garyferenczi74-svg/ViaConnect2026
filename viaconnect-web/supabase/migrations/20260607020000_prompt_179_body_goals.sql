-- Prompt 179: Body Tracker Goals. Append-only. Three tables, RLS per user,
-- one-active-goal partial unique index, updated_at trigger on body_goals.
-- Arnold owns the trajectory (body_goals); Gordon owns the computed daily
-- targets (body_goal_targets) and the adaptive audit (body_goal_recalibrations).

CREATE TABLE IF NOT EXISTS public.body_goals (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','achieved','paused','abandoned')),
  driver                   TEXT NOT NULL CHECK (driver IN ('date','rate')),
  start_weight_lb          NUMERIC(6,2) NOT NULL,
  goal_weight_lb           NUMERIC(6,2) NOT NULL,
  goal_bodyfat_pct         NUMERIC(4,1),
  start_date               DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date              DATE,
  target_rate_lb_per_week  NUMERIC(4,2),
  sex                      TEXT,
  age_years                INT,
  height_in                NUMERIC(5,2),
  activity_level           TEXT CHECK (activity_level IN ('sedentary','light','moderate','very','extra')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DD: exactly one active goal per member.
CREATE UNIQUE INDEX IF NOT EXISTS uq_body_goals_one_active_per_user
  ON public.body_goals(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_body_goals_user ON public.body_goals(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.body_goal_targets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id              UUID NOT NULL REFERENCES public.body_goals(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  effective_date       DATE NOT NULL,
  source               TEXT NOT NULL
                         CHECK (source IN ('initial_plan','weekly_recalibration','manual_override','revert')),
  estimated_tdee_kcal  INT,
  calorie_target_kcal  INT NOT NULL,
  protein_g            INT NOT NULL,
  fat_g                INT NOT NULL,
  carb_g               INT NOT NULL,
  fiber_g              INT NOT NULL,
  added_sugar_limit_g  INT,
  hydration_ml         INT,
  rationale            JSONB,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_body_goal_targets_lookup
  ON public.body_goal_targets(goal_id, effective_date DESC, computed_at DESC);

CREATE TABLE IF NOT EXISTS public.body_goal_recalibrations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id              UUID NOT NULL REFERENCES public.body_goals(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start         DATE NOT NULL,
  window_end           DATE NOT NULL,
  days_logged          INT NOT NULL,
  avg_logged_kcal      INT,
  weight_change_lb     NUMERIC(5,2),
  estimated_tdee_kcal  INT,
  prev_calorie_target  INT,
  new_calorie_target   INT,
  adherence_pct        NUMERIC(5,2),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_body_goal_recal_goal
  ON public.body_goal_recalibrations(goal_id, created_at DESC);

ALTER TABLE public.body_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_goal_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_goal_recalibrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own body goals" ON public.body_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own goal targets" ON public.body_goal_targets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own goal recalibrations" ON public.body_goal_recalibrations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.body_goals_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_body_goals_updated_at') THEN
    CREATE TRIGGER trg_body_goals_updated_at BEFORE UPDATE ON public.body_goals
    FOR EACH ROW EXECUTE FUNCTION public.body_goals_set_updated_at();
  END IF;
END $$;
