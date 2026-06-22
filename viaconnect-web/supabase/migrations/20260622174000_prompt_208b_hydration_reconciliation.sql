-- Prompt 208b 4.7: hydration + electrolyte + activity reconciliation. Append-only.
-- A new reconciliation layer (does NOT modify the existing hydration counter): ties
-- hydration intake + electrolyte status (Labs) + activity/sweat (Connected) + body water
-- (Arnold) into one picture with an activity-adjusted target. Owner-scoped.
CREATE TABLE IF NOT EXISTS public.hydration_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_target_ml numeric,
  activity_adjusted_target_ml numeric,
  electrolyte_context text,
  body_water_context text,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hydration_reconciliation_user_idx ON public.hydration_reconciliation (user_id, computed_at DESC);
ALTER TABLE public.hydration_reconciliation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hydration_reconciliation_select_own ON public.hydration_reconciliation;
CREATE POLICY hydration_reconciliation_select_own ON public.hydration_reconciliation
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS hydration_reconciliation_insert_own ON public.hydration_reconciliation;
CREATE POLICY hydration_reconciliation_insert_own ON public.hydration_reconciliation
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
