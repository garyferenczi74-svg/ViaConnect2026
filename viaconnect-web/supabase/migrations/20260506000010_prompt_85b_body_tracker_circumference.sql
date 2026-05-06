-- Prompt #85b: Body Tracker circumference (13 measurement points) + UI unit preference
-- Append-only. New table; new column on body_graphics_preferences (arnold_user_profiles
-- per spec is drifted from live, body_graphics_preferences is the existing per-user UI prefs home).

CREATE TABLE IF NOT EXISTS public.body_tracker_circumference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.body_tracker_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  entry_unit TEXT NOT NULL DEFAULT 'in' CHECK (entry_unit IN ('in', 'cm')),

  neck NUMERIC(5,1),
  shoulder_width NUMERIC(5,1),

  right_upper_arm NUMERIC(5,1),
  right_forearm NUMERIC(5,1),
  left_upper_arm NUMERIC(5,1),
  left_forearm NUMERIC(5,1),

  chest NUMERIC(5,1),
  waist NUMERIC(5,1),
  hip NUMERIC(5,1),

  right_upper_thigh NUMERIC(5,1),
  right_calf NUMERIC(5,1),
  left_upper_thigh NUMERIC(5,1),
  left_calf NUMERIC(5,1),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bt_circumference_user
  ON public.body_tracker_circumference (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bt_circumference_entry
  ON public.body_tracker_circumference (entry_id);

ALTER TABLE public.body_tracker_circumference ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='body_tracker_circumference'
    AND policyname='Users manage own bt circumference') THEN
    CREATE POLICY "Users manage own bt circumference" ON public.body_tracker_circumference
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.body_graphics_preferences
  ADD COLUMN IF NOT EXISTS preferred_measurement_unit TEXT NOT NULL DEFAULT 'in'
  CHECK (preferred_measurement_unit IN ('in', 'cm'));

COMMENT ON COLUMN public.body_tracker_weight.waist_in IS
  'Superseded by body_tracker_circumference.waist as of Prompt #85b';
COMMENT ON COLUMN public.body_tracker_weight.hips_in IS
  'Superseded by body_tracker_circumference.hip as of Prompt #85b';
COMMENT ON COLUMN public.body_tracker_weight.chest_in IS
  'Superseded by body_tracker_circumference.chest as of Prompt #85b';
COMMENT ON COLUMN public.body_tracker_weight.neck_in IS
  'Superseded by body_tracker_circumference.neck as of Prompt #85b';
COMMENT ON COLUMN public.body_tracker_weight.right_arm_in IS
  'Superseded by body_tracker_circumference.right_upper_arm as of Prompt #85b';
COMMENT ON COLUMN public.body_tracker_weight.left_arm_in IS
  'Superseded by body_tracker_circumference.left_upper_arm as of Prompt #85b';
COMMENT ON COLUMN public.body_tracker_weight.right_thigh_in IS
  'Superseded by body_tracker_circumference.right_upper_thigh as of Prompt #85b';
COMMENT ON COLUMN public.body_tracker_weight.left_thigh_in IS
  'Superseded by body_tracker_circumference.left_upper_thigh as of Prompt #85b';

COMMENT ON TABLE public.body_tracker_circumference IS
  'Prompt #85b: 13-point manual circumference measurement system. Values stored in entry_unit (cm or in); display-time conversion in lib.';
