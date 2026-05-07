-- Prompt #85c Phase H: journey events log for the Key Moments timeline.
-- Append-only. Each row records a notable moment within a user's journey
-- (journey started, milestone hit, wearable connected, GeneX360 results landed,
-- Arnold adjusted protocol). Drives spec section 8.2 Key Moments list.

CREATE TABLE IF NOT EXISTS public.body_tracker_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.body_tracker_journeys(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'journey_started',
    'journey_switched',
    'milestone_completed',
    'wearable_connected',
    'genex360_connected',
    'caq_completed',
    'supplement_added',
    'arnold_adjustment',
    'goal_reached'
  )),
  title TEXT NOT NULL,
  detail TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bt_journey_events_user
  ON public.body_tracker_journey_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_bt_journey_events_journey
  ON public.body_tracker_journey_events (journey_id, occurred_at DESC)
  WHERE journey_id IS NOT NULL;

ALTER TABLE public.body_tracker_journey_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='body_tracker_journey_events'
    AND policyname='Users own bt journey events') THEN
    CREATE POLICY "Users own bt journey events" ON public.body_tracker_journey_events
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

COMMENT ON TABLE public.body_tracker_journey_events IS
  'Prompt #85c Phase H: journey event log driving the Key Moments timeline (spec section 8.2). Auto-populated by useUserJourney.setJourney for journey_started; future hooks will append milestone_completed, wearable_connected, etc.';
