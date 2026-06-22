-- Prompt 208b 4.4: energy-balance loop. Append-only. Ties Gordon intake + Arnold
-- composition trend + Connected expenditure into one measured energy-balance signal.
-- Owner-scoped. signal_window avoids the reserved word "window".
CREATE TABLE IF NOT EXISTS public.energy_balance_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intake_estimate numeric,
  expenditure_estimate numeric,
  composition_trend text,
  balance_state text CHECK (balance_state IN ('deficit','surplus','maintenance','insufficient_data')),
  signal_window text,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS energy_balance_signals_user_idx ON public.energy_balance_signals (user_id, computed_at DESC);
ALTER TABLE public.energy_balance_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS energy_balance_signals_select_own ON public.energy_balance_signals;
CREATE POLICY energy_balance_signals_select_own ON public.energy_balance_signals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS energy_balance_signals_insert_own ON public.energy_balance_signals;
CREATE POLICY energy_balance_signals_insert_own ON public.energy_balance_signals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
