-- Prompt 208b 4.1: total nutrient intake reconciliation. Append-only.
-- Per-user per-nutrient reconciled daily total (food + supplement) read by the
-- 208a upper-limit gate and the deficiency-target logic. Owner-scoped.
CREATE TABLE IF NOT EXISTS public.nutrient_intake_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nutrient text NOT NULL,
  food_contribution numeric NOT NULL DEFAULT 0,
  supplement_contribution numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  unit text,
  ul_status text CHECK (ul_status IN ('within','approaching','exceeded','unknown')),
  deficiency_gap numeric,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nutrient_intake_ledger_user_idx
  ON public.nutrient_intake_ledger (user_id, nutrient, computed_at DESC);
ALTER TABLE public.nutrient_intake_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nutrient_intake_ledger_select_own ON public.nutrient_intake_ledger;
CREATE POLICY nutrient_intake_ledger_select_own ON public.nutrient_intake_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS nutrient_intake_ledger_insert_own ON public.nutrient_intake_ledger;
CREATE POLICY nutrient_intake_ledger_insert_own ON public.nutrient_intake_ledger
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
